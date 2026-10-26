/**
 * fetch() for a public SMS API called from the browser through this app's proxy (next.config.mjs rewrites).
 * SMS answers such a call without a visitor token with 401 and an X-Auth-Visitor header naming where to get
 * one; it issues them only on its own pages, which a browser on this app never opens. So: get one there (it is
 * set as a cookie on this origin, through the same proxy) and repeat the call once. Same idea as accountAuth.js
 * on the JSP pages. Any other answer, or a visitor URL on another origin, is returned as it is.
 */
export async function fetchWithVisitor(url, init) {
  const response = await fetch(url, init);
  const visitorUrl = response.status === 401 ? response.headers.get("X-Auth-Visitor") : null;
  if (!visitorUrl || !isSameOrigin(visitorUrl)) return response;
  const issued = await fetch(visitorUrl, { method: "GET", credentials: "same-origin", cache: "no-store" }).catch(
    () => null
  );
  return issued?.ok ? fetch(url, init) : response;
}

function isSameOrigin(url) {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}
