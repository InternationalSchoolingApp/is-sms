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

/** Absolute URL for server-side callers such as next-auth's authorize(). */
export function resolveServerBackendOrigin() {
  const useLocalProxy = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true";
  if (!useLocalProxy) return process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  return process.env.NEXTAUTH_URL;
}
