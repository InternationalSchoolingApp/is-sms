/**
 * Resolves which backend origin to call from the browser.
 *
 * - Default (NEXT_PUBLIC_USE_LOCAL_PROXY unset): absolute
 *   NEXT_PUBLIC_BACKEND_BASE_URL, exactly what Step 3 already built and
 *   tested against the live server.
 * - NEXT_PUBLIC_USE_LOCAL_PROXY=true: the "/backend" prefix that
 *   next.config.mjs's rewrites() forwards to the same backend — makes the
 *   browser treat Next.js and the backend as one origin, which is required
 *   for session cookies to be shared between the captcha image (GET) and
 *   the JSON calls that depend on that same session (e.g. login).
 *
 * In production this whole distinction goes away: once the real reverse
 * proxy (Step 2, infra-managed) puts Next.js and the backend on the same
 * domain, NEXT_PUBLIC_BACKEND_BASE_URL itself should just be set to that
 * same-origin path (e.g. "" for a same-host deployment), and this local-only
 * proxy flag becomes unnecessary.
 *
 * Deliberately NOT window-aware: this same function also runs during a
 * client component's SERVER-side render (Next.js still renders "use client"
 * components' initial HTML on the server) and then again during browser
 * hydration. A `typeof window` branch here returns a different string in
 * each of those two passes for the exact same element (e.g. the captcha
 * <img src>) — a confirmed hydration-mismatch bug, not a hypothetical one.
 * Every browser-facing caller (services/studentSignupApi.js,
 * components/student-enroll/CaptchaField.jsx, etc.) needs the SAME relative
 * "/backend" in both passes. See resolveServerBackendOrigin() below for the
 * one caller (services/authApi.js) that genuinely never renders and needs an
 * absolute URL instead.
 */
export function resolveBackendOrigin() {
  const useLocalProxy = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true";
  if (useLocalProxy) return "/backend";
  return process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
}

/**
 * Absolute-URL variant for the one caller that is guaranteed to never be
 * part of a React render pass: services/authApi.js's login(), called only
 * from next-auth's authorize() (app/api/auth/[...nextauth]/route.js) — a
 * plain Node.js request handler, not a component. fetch() there has no page
 * origin to resolve a relative path against and throws ("Failed to parse
 * URL from /backend/..." — confirmed by a live failure, not guessed), so
 * "/backend" must be made absolute using NEXTAUTH_URL (the app's own
 * origin) — same idea as the old JSP app's BASE_URL config value
 * (application-dev.yml: `BASE_URL: http://localhost:${server.port}`), not a
 * per-request derivation (that code path in SessionUtil.getBaseUrl() is
 * dead/commented out there too — confirmed by reading it directly).
 */
export function resolveServerBackendOrigin() {
  const useLocalProxy = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true";
  if (!useLocalProxy) return process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  return `${process.env.NEXTAUTH_URL}/backend`;
}
