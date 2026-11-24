import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";

/**
 * Downloads a Student Transcript document (Transcript / Diploma / Academic Verification) for the signed-in student.
 *
 * The links the backend gives ("…/{school}/dashboard/student-transcript-view-after-publish/{id}?payload=…") are HTML pages of the Java
 * app that show the document in a tab. The Java app also has endpoints that make the same document as a PDF file
 * (download-student-semester-transcript, download-diploma, students-transcript-verification: they take the same payload and
 * answer with Content-Disposition: attachment). Here the SERVER calls the matching one with the student's SMS token
 * (Authorization: Bearer, like every other call) and sends the PDF back, so the browser saves the file instead of opening a tab.
 *
 * Only these three backend pages are allowed, for this account's own school and unique id, with nothing but the `payload` query
 * value; the call always goes to this account's own trusted backend, so the route cannot be pointed at another host or user.
 *
 * GET ?url=<link>&name=<file name>  ->  the document (Content-Disposition: attachment)  |  401 { sessionExpired }  |  400/502 { message }
 */

// the page the backend linked -> the endpoint that makes that document as a PDF
const PDF_ENDPOINT = {
  "student-transcript-view-after-publish": "download-student-semester-transcript",
  "view-diploma": "download-diploma",
  "transcript-verification-page": "students-transcript-verification",
};
const LINK_PATH = /^\/([A-Za-z0-9-]+)\/dashboard\/(student-transcript-view-after-publish|view-diploma|transcript-verification-page)\/([A-Za-z0-9-]+)$/;
// Making the PDF takes a while on the backend (up to a few minutes).
export const maxDuration = 300;

const reply = (status, body) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const FAILED = "The document could not be downloaded right now. Please try again.";
const EXTENSIONS = { "application/pdf": "pdf", "text/html": "html", "image/png": "png", "image/jpeg": "jpg" };

// A safe file name: letters, digits, space, dot, dash, underscore and brackets; no path parts.
const cleanName = (value) =>
  String(value || "")
    .replace(/[^A-Za-z0-9 ._()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

export async function GET(request) {
  const session = await getAccountSession(request.nextUrl.searchParams.get("account"));
  if (!session?.accessToken) return reply(401, { sessionExpired: true, message: "Your session has been logged out" });

  let link;
  try {
    link = new URL(String(request.nextUrl.searchParams.get("url") || ""));
  } catch {
    return reply(400, { message: FAILED });
  }
  const match = LINK_PATH.exec(link.pathname);
  const payload = link.searchParams.get("payload");
  // Own school and own unique id only.
  if (!match || match[1] !== session.schoolUUID || match[3] !== session.uniqueId) return reply(400, { message: FAILED });

  const backend = String(session.backend || "").replace(/\/+$/, "");
  if (!backend) return reply(502, { message: FAILED });
  const target = `${backend}/${match[1]}/dashboard/${PDF_ENDPOINT[match[2]]}/${match[3]}${payload ? `?payload=${encodeURIComponent(payload)}` : ""}`;

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
  if (response.status === 401) return reply(401, { sessionExpired: true, message: "Your session has been logged out" });
  if (!response.ok) return reply(502, { message: FAILED });

  const type = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
  // The backend's own file name when it sends one, else the name the page asked for with the extension of what came back.
  const fromBackend = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(response.headers.get("content-disposition") || "")?.[1];
  const base = cleanName(request.nextUrl.searchParams.get("name")) || "document";
  const filename = cleanName(fromBackend ? decodeURIComponent(fromBackend) : "") || `${base}.${EXTENSIONS[type] || "pdf"}`;

  // The page asks with a token and waits for this cookie to know the file has started to arrive (the classic file-download
  // pattern: a plain navigation download has no event of its own, and it keeps the click as the user's own action).
  const token = request.nextUrl.searchParams.get("token") || "";
  const answer = new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
  if (/^[A-Za-z0-9]{8,40}$/.test(token)) answer.headers.append("Set-Cookie", `tdl-${token}=1; Path=/; Max-Age=120; SameSite=Lax`);
  return answer;
}
