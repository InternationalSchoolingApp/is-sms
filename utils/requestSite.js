import { allowedBackendOverride, isBackendOverrideAllowed, parseBackendOrigin } from "@/utils/backendOrigin";

/**
 * Did this GET/POST come from this app, from our own SMS (Java) site, or from nowhere (a typed URL / bookmark)? Server-
 * only. Used by routes that act on the browser's sign-in just by being opened — /api/sso (signs a user in), the logout
 * route and /api/cookie-flush (sign users out) — so a link or <img> on some other site cannot do that to a visitor.
 *
 * Trusted:
 *   - Sec-Fetch-Site same-origin / same-site / none (the browser's own statement; another site cannot set it);
 *   - otherwise the Origin (or, for a navigation, the Referer) is this app, our SMS backend (BACKEND_BASE_URL /
 *     NEXT_PUBLIC_BACKEND_BASE_URL, or on DEV/UAT an allowed backend, utils/backendOrigin.js), or a host on the same
 *     parent domain as this app (sms.example.org next to app.example.org);
 *   - neither header at all (an old browser, a privacy setting that drops the Referer): allowed, as before;
 *   - a cross-site navigation with neither header: allowed only on a DEV / UAT build (isBackendOverrideAllowed), where an https
 *     SMS hands off to an http://localhost app and the browser drops the Referer; refused on PROD.
 */
export function isTrustedRequestSite(request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none") return true;
  const source = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!source || source === "null") {
    if (!fetchSite) return true;
    // A cross-site navigation with no Origin / Referer at all. In production that is the odd case (an https SMS page sends its
    // origin to an https app), so it stays refused. But on a DEV / UAT build the app is often opened on http://localhost while the
    // tester's SMS is an https UAT server (sms-is.ischoolusa.com ...): the browser drops the Referer on an https -> http hop, so
    // EVERY real sign-in hand-off from that SMS looks like this. Refusing it sent the student to "/" and, with no session, on to
    // the signup page (/enrollment/O) instead of their dashboard / saved wizard step; it also stopped the logout cookie flush.
    return isBackendOverrideAllowed();
  }
  const origin = parseBackendOrigin(source);
  if (!origin) return false;
  const appHost = (request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host)
    .split(",")[0]
    .trim();
  const sourceHost = new URL(origin).host;
  if (sourceHost === appHost) return true;
  const own = [process.env.BACKEND_BASE_URL, process.env.NEXT_PUBLIC_BACKEND_BASE_URL].map((v) => parseBackendOrigin(String(v || "").trim()));
  if (own.includes(origin) || allowedBackendOverride(origin)) return true;
  return sameParentDomain(new URL(origin).hostname, appHost.replace(/:\d+$/, ""));
}

// "a.example.org" and "b.example.org" (last two labels equal, and not an IP address or a bare host).
function sameParentDomain(a, b) {
  const parent = (host) => {
    if (!host.includes(".") || /^[\d.]+$/.test(host) || host.startsWith("[")) return "";
    return host.split(".").slice(-2).join(".");
  };
  const pa = parent(a.toLowerCase());
  return Boolean(pa) && pa === parent(b.toLowerCase());
}
