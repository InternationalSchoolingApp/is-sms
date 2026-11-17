import { NextResponse } from "next/server";
import { login } from "@/services/authApi";

const noStore = { headers: { "Cache-Control": "no-store" } };
// SeriConstant on the Java side: STATUS_CODE_SUCCESS "1", LOGIN_PASSWORD_CODE_FAILD "0032" (wrong password).
const SUCCESS = "1";
const WRONG_PASSWORD = "0032";

/**
 * POST /api/session/verify-password { email, password, schoolUUID, schoolNumericId } - the dashboard's "session logged
 * out" dialog checks the password the student typed with the existing Java login API (services/authApi.js login(),
 * POST {school}/api/v1/common/login), so a wrong password is answered inside the dialog instead of on the login page.
 * Answers { ok: true, ssoUrl? } (ssoUrl: this app's own /api/sso sign-in link from the login answer, when it has one),
 * { ok: false, wrongPassword: true }, or { ok: false, message } for any other refusal (blocked account...).
 * Not under the proxy's matcher: the student is signed out here, so a page request or server action would be sent to
 * the login page.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400, ...noStore });
  }
  const { email, password, schoolUUID, schoolNumericId } = body || {};
  if (!email || !password || !schoolUUID || !schoolNumericId) {
    return NextResponse.json({ ok: false, message: "Invalid request" }, { status: 400, ...noStore });
  }
  let answer;
  try {
    answer = await login({ email, password, schoolUUID, schoolNumericId: Number(schoolNumericId) });
  } catch (err) {
    console.error("verify-password: login request failed", err);
    return NextResponse.json({ ok: false, unavailable: true }, { status: 502, ...noStore });
  }
  if (String(answer?.status) === SUCCESS) {
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
  if (String(answer?.statusCode) === WRONG_PASSWORD) return NextResponse.json({ ok: false, wrongPassword: true }, noStore);
  return NextResponse.json({ ok: false, message: answer?.message || "Unable to sign in right now. Please try again." }, noStore);
}
