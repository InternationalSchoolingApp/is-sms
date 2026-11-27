import { allowedBackendOverride, parseBackendOrigin } from "@/utils/backendOrigin";

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
 *   - neither header at all (an old browser, a privacy setting that drops the Referer): allowed, as before.
 */
export function isTrustedRequestSite(request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none") return true;
  const source = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!source || source === "null") return !fetchSite;
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
