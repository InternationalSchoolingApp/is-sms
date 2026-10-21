import { NextResponse } from "next/server";

const EMAIL_COOKIE = "add_enrollment_login_email";
const PASSWORD_COOKIE = "add_enrollment_login_password";

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
  const options = {
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
