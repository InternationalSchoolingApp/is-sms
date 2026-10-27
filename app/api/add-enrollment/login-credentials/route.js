import { NextResponse } from "next/server";

const EMAIL_COOKIE = "add_enrollment_login_email";
const PASSWORD_COOKIE = "add_enrollment_login_password";

// The Java login page lives on another host than this app (prod: enrollment.internationalschooling.org ->
// sms.internationalschooling.org), and a host-only cookie is never sent there. Same idea as the backend's
// MetaParamBuilderFilter (meta.capi.cookie-domains): on hosts under a configured parent domain the cookie is scoped to
// that domain; anywhere else (localhost, *.vercel.app UAT) it stays host-only and is left alone.
const COOKIE_DOMAINS = (process.env.LOGIN_PREFILL_COOKIE_DOMAINS || process.env.NEXT_PUBLIC_COOKIE_DOMAIN || "internationalschooling.org")
  .split(",")
  .map((d) => d.trim().replace(/^\./, "").toLowerCase())
  .filter(Boolean);

function sharedCookieDomain(requestHost) {
  const host = requestHost.toLowerCase();
  return COOKIE_DOMAINS.find((d) => host === d || host.endsWith(`.${d}`));
}

function encodeCookieValue(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const school = String(body?.school || "");
  const email = String(body?.email || "").trim();
  const password = String(body?.password || "");
  if (!/^[A-Za-z0-9_-]+$/.test(school) || !email || email.length > 254 || !password || password.length > 128) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const domain = sharedCookieDomain(new URL(request.url).hostname);
  const options = {
    ...(domain ? { domain } : {}),
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: `/${school}/common/login`,
    maxAge: 5 * 60,
  };
  response.cookies.set(EMAIL_COOKIE, encodeCookieValue(email), options);
  response.cookies.set(PASSWORD_COOKIE, encodeCookieValue(password), options);
  return response;
}
