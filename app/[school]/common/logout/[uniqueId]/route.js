import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBackendOverrideCookieName, isBackendOverrideAllowed } from "@/utils/backendOrigin";

/**
 * GET /{school}/common/logout/{uniqueId} on the Next.js origin — the legacy
 * logout URL typed or linked against this app. Without this route the local
 * proxy forwarded it to Java, which invalidated only the Java HTTP session and
 * 302'd to a RELATIVE /{school}/common/login, so the browser stayed on the
 * Next.js origin (where the proxied JSP login page can't load its assets) and
 * the Auth.js session survived, leaving the dashboard reachable.
 *
 * Here: drop the Auth.js session cookies, then send the browser to the SAME
 * Java endpoint on the backend's own origin
 * (ClientCommonController.logoutSchool). That endpoint records the logout,
 * invalidates the Java session and redirects to {backend}/{school}/common/login.
 * `from` / `payload` query params are passed through as the Java endpoint reads them.
 *
 * The session's own uniqueId wins over the URL's (the Java side looks the user
 * up by it for its logout bookkeeping); the URL value is only a fallback.
 */

// Path segments are interpolated into the redirect URL, so only plain slug / UUID characters pass.
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
// Auth.js session / CSRF / callback cookies, including the __Secure-/__Host- variants and chunked tokens.
const AUTH_COOKIE = /^(__Secure-|__Host-)?(authjs|next-auth)\.(session-token|csrf-token|callback-url)(\.\d+)?$/;

function backendOrigin(request) {
  const override = isBackendOverrideAllowed() ? request.cookies.get(getBackendOverrideCookieName())?.value : undefined;
  return override || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";
}

export async function GET(request, { params }) {
  const { school, uniqueId } = await params;
  const session = await auth();
  const backend = backendOrigin(request);
  const userKey = [session?.uniqueId, uniqueId].find((value) => value && SAFE_SEGMENT.test(String(value)));

  let target = new URL("/", request.url).toString();
  if (backend && SAFE_SEGMENT.test(school) && userKey) {
    const logoutUrl = new URL(`${backend}/${school}/common/logout/${userKey}`);
    for (const key of ["from", "payload"]) {
      const value = request.nextUrl.searchParams.get(key);
      if (value) logoutUrl.searchParams.set(key, value);
    }
    target = logoutUrl.toString();
  } else if (backend && SAFE_SEGMENT.test(school)) {
    target = `${backend}/${school}/common/login`;
  }

  const response = NextResponse.redirect(target, 303);
  for (const { name } of request.cookies.getAll()) {
    if (AUTH_COOKIE.test(name)) {
      response.cookies.set(name, "", { path: "/", maxAge: 0, secure: name.startsWith("__") });
    }
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
