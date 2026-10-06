/**
 * Resolves the prefix used by browser-facing backend requests.
 *
 * With the local proxy enabled, requests use the app origin directly (for
 * example /api/v1/ip-location). next.config.mjs forwards paths that do not
 * match a Next.js route to the backend while keeping session cookies same-origin.
 */
export function resolveBackendOrigin() {
  const useLocalProxy = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true";
  if (useLocalProxy) return "";
  return process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
}

export function hasBackendOrigin() {
  return process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true" || Boolean(process.env.NEXT_PUBLIC_BACKEND_BASE_URL);
}

/**
 * Absolute URL for server-side callers (next-auth's authorize(), the
 * services/studentSignupApi.js functions reached through actions/*.js
 * Server Actions). Prefers BACKEND_BASE_URL — a server-only var (no
 * NEXT_PUBLIC_ prefix) that never reaches client JS — so server-side callers
 * stop depending on a client-exposed var for the same value. Falls back to
 * the existing NEXT_PUBLIC_BACKEND_BASE_URL/NEXTAUTH_URL logic so nothing
 * breaks for deployments that haven't set BACKEND_BASE_URL yet.
 */
export function resolveServerBackendOrigin() {
  if (process.env.BACKEND_BASE_URL) return process.env.BACKEND_BASE_URL;
  const useLocalProxy = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true";
  if (!useLocalProxy) return process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  return process.env.NEXTAUTH_URL;
}

/**
 * The Java app's own login page for a school (http://localhost:8080/{school}/common/login). It must
 * be served by the Java app itself, not through Next.js, so this uses the real backend origin and
 * not the "/backend" dev proxy. Safe for both server and client callers.
 */
export function loginPageUrl(schoolUUID) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  return schoolUUID && backend ? `${backend}/${schoolUUID}/common/login` : "/";
}

/**
 * The Java app's own legacy enrollment continuation page
 * (http://localhost:8080/{school}/student/enrollment/process/{uniqueId}) — where a
 * student belongs when CONFIGURATION/ENROLLMENT_VIA_NEXTJS is off and this Next.js
 * wizard must not run. Like loginPageUrl() it is a JSP page the Java app has to
 * serve itself, so it uses the real backend origin and not the dev proxy. Returns
 * "" when anything needed to build it is missing, so callers can skip the redirect.
 */
export function legacyEnrollmentProcessUrl(schoolUUID, uniqueId) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  if (!backend || !schoolUUID || !uniqueId) return "";
  return `${backend}/${schoolUUID}/student/enrollment/process/${encodeURIComponent(uniqueId)}`;
}
