import { NextResponse } from "next/server";
import { login } from "@/services/authApi";
import { getPublicSchoolInfo } from "@/services/studentSignupApi";
import { blockedMinutesLeft, clientAddress, recordRightPassword, recordWrongPassword } from "@/utils/loginAttemptGuard";

const noStore = { headers: { "Cache-Control": "no-store" } };
// SeriConstant on the Java side: STATUS_CODE_SUCCESS "1", LOGIN_PASSWORD_CODE_FAILD "0032" (wrong password),
// LOGIN_USER_PASS_CODE_FAILD "0033" (no such user), "E005" (SMS's own "Maximum attempts reached" block).
const SUCCESS = "1";
const WRONG_PASSWORD = "0032";
const NO_SUCH_USER = "0033";
const SMS_BLOCKED = "E005";
const SCHOOL = /^[A-Za-z0-9_-]{1,64}$/;

const blockedMessage = (minutes) =>
  `Maximum attempts reached. Please try again after ${minutes} minute${minutes === 1 ? "" : "s"}, or contact the school administrator.`;

/**
 * Only this app's own pages may call this route. A current browser says so itself in Sec-Fetch-Site (a page of another
 * site cannot set it), which also works whatever Host the hosting proxy forwards. An older browser without it: its
 * Origin must be the host the browser asked for (x-forwarded-host / host). Neither header: not a browser page, refused.
 */
function sameSite(request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * POST /api/session/verify-password { email, password, schoolUUID, schoolNumericId } - the dashboard's "session logged
 * out" dialog checks the password the student typed with the existing Java login API (services/authApi.js login(),
 * POST {school}/api/v1/common/login), so a wrong password is answered inside the dialog instead of on the login page.
 * Also signs a student in right after they get a password (utils/logout.js signInWithPassword: create-password page,
 * first-payment thank-you) so that password never travels in a URL or cookie; schoolNumericId is optional then.
 * Answers { ok: true, ssoUrl? } (ssoUrl: this app's own /api/sso sign-in link from the login answer, when it has one),
 * { ok: false, wrongPassword: true, attemptsLeft }, { ok: false, blocked: true, message } once the address has given
 * LOGIN_LIMIT_COUNT wrong passwords (utils/loginAttemptGuard.js, SMS's own rule), or { ok: false, message } for any other
 * refusal (blocked account...).
 * Not under the proxy's matcher: the student is signed out here, so a page request or server action would be sent to
 * the login page.
 */
export async function POST(request) {
  if (!sameSite(request)) {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 403, ...noStore });
  }
  const ip = clientAddress(request);
  const minutesLeft = blockedMinutesLeft(ip);
  if (minutesLeft) {
    return NextResponse.json({ ok: false, blocked: true, message: blockedMessage(minutesLeft) }, { status: 429, ...noStore });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400, ...noStore });
  }
  const { email, password, schoolUUID } = body || {};
  if (!email || !password || !SCHOOL.test(String(schoolUUID || ""))) {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400, ...noStore });
  }
  // The school's numeric id: from the caller (the session-out dialog knows it), else the school's public info
  // (create-password / payment thank-you pages run without one).
  let schoolNumericId = Number(body?.schoolNumericId) || 0;
  if (!schoolNumericId) {
    schoolNumericId = Number((await getPublicSchoolInfo(schoolUUID).catch(() => null))?.schoolNumericId) || 0;
    if (!schoolNumericId) return NextResponse.json({ ok: false, unavailable: true }, { status: 502, ...noStore });
  }
  let answer;
  try {
    answer = await login({ email, password, schoolUUID, schoolNumericId });
  } catch (err) {
    console.error("verify-password: login request failed", err);
    return NextResponse.json({ ok: false, unavailable: true }, { status: 502, ...noStore });
  }
  if (String(answer?.status) === SUCCESS) {
    recordRightPassword(ip);
    const redirect = String(answer?.redirectUrl || "");
    let ssoUrl = null;
    try {
      // The login answer's link is to this app's SSO sign-in (/api/sso?token=...); only its path is passed on, so the
      // browser always opens it on this same origin.
      const url = new URL(redirect, request.nextUrl.origin);
      if (url.pathname === "/api/sso") ssoUrl = url.pathname + url.search;
    } catch {
      ssoUrl = null;
    }
    return NextResponse.json({ ok: true, ssoUrl }, noStore);
  }
  const code = String(answer?.statusCode ?? "");
  if (code === SMS_BLOCKED) {
    // SMS itself has blocked this login (its IP_ADDRESS_STATUS); its message says what to do.
    return NextResponse.json({ ok: false, blocked: true, message: answer?.message || blockedMessage(30) }, { status: 429, ...noStore });
  }
  if (code === WRONG_PASSWORD || code === NO_SUCH_USER) {
    const guard = await recordWrongPassword(ip, schoolUUID);
    if (guard.blocked) {
      return NextResponse.json({ ok: false, blocked: true, message: blockedMessage(guard.minutesLeft) }, { status: 429, ...noStore });
    }
    return NextResponse.json({ ok: false, wrongPassword: true, attemptsLeft: guard.attemptsLeft }, noStore);
  }
  return NextResponse.json({ ok: false, message: answer?.message || "Unable to sign in right now. Please try again." }, noStore);
}
