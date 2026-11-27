import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";

/**
 * Opens an LMS link for the signed-in student (course calendar lessons, the header's LMS switch).
 *
 * The links the backend gives ("…/{school}/lms-platform/redirect-user-to-LMS/{uniqueId}?lmsId=N") are pages of the Java
 * app. A browser that goes there carries only the Java app's own cookies, and a student signed in on this app has none,
 * so the page answers "FAILED|Sorry for inconvenience, system has encountered technical glitch.". Here the SERVER makes
 * that request with the student's SMS token (Authorization: Bearer, like every other call), does not follow the
 * redirect, and hands back where it points: the LMS single-sign-on address. The browser then opens that.
 *
 * Only the path and query of the link are used; the call always goes to this account's own trusted backend, and only
 * for that student's own unique id, so the route cannot be pointed at another host or another user.
 *
 * GET ?url=<link>  ->  200 { url }  |  401 { sessionExpired }  |  400/502 { message }
 */

// A demo (dummy) student's header LMS switch uses the backend's dummy redirect instead, with the counselor's dummyLmsUserId.
const LINK_PATH = /^\/([A-Za-z0-9-]+)\/lms-platform\/redirect-(user|dummy-user)-to-LMS\/([A-Za-z0-9-]+)$/;
const reply = (status, body) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const FAILED = "The course could not be opened right now. Please try again.";

export async function GET(request) {
  const session = await getAccountSession();
  if (!session?.accessToken) return reply(401, { sessionExpired: true, message: "Your session has been logged out" });

  let link;
  try {
    // Also a bare path ("/school/lms-platform/..."): only the path and query are ever used.
    link = new URL(String(request.nextUrl.searchParams.get("url") || ""), "http://link.invalid");
  } catch {
    return reply(400, { message: "Course content is not available." });
  }
  const match = LINK_PATH.exec(link.pathname);
  const lmsId = link.searchParams.get("lmsId");
  const dummy = match?.[2] === "dummy-user";
  const dummyLmsUserId = link.searchParams.get("dummyLmsUserId") || "";
  // Own school and own unique id only; lmsId is a number; a dummy link carries a plain dummy LMS user id.
  if (
    !match ||
    match[1] !== session.schoolUUID ||
    match[3] !== session.uniqueId ||
    (lmsId && !/^\d+$/.test(lmsId)) ||
    (dummy && !/^[A-Za-z0-9_.@-]{1,100}$/.test(dummyLmsUserId))
  ) {
    return reply(400, { message: "Course content is not available." });
  }

  const backend = String(session.backend || "").replace(/\/+$/, "");
  if (!backend) return reply(502, { message: FAILED });
  const query = dummy ? `?dummyLmsUserId=${encodeURIComponent(dummyLmsUserId)}` : lmsId ? `?lmsId=${lmsId}` : "";
  const target = `${backend}/${match[1]}/lms-platform/redirect-${dummy ? "dummy-user" : "user"}-to-LMS/${match[3]}${query}`;

  let response;
  try {
    response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: { ...serviceKeyHeaders(), Authorization: `Bearer ${session.accessToken}` },
    });
  } catch {
    return reply(502, { message: FAILED });
  }

  const location = response.headers.get("location") || "";
  if (response.status >= 300 && response.status < 400 && /^https?:\/\//i.test(location) && !location.startsWith(backend)) {
    // "redirect:/common/login…" (a relative address on the backend itself) means the backend did not sign this student in.
    return reply(200, { url: location });
  }
  return reply(502, { message: FAILED });
}
