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
