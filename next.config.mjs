/**
 * Local-dev reverse proxy: forwards unmatched paths to the real Spring Boot
 * origin so the browser sees Next.js and the backend as the SAME origin
 * (no CORS, and — critically — the same session cookie for both the
 * captcha image and the JSON API calls that validate it).
 *
 * This is the buildable, testable equivalent of what the plan calls for in
 * production ("same-domain reverse proxy" — see the migration plan's
 * Coexistence Strategy section). The actual production/staging reverse
 * proxy (Nginx or whatever infra runs today) is NOT something this repo
 * can configure — that needs real infra access. The equivalent Nginx rule
 * is documented in README.md so infra can mirror this exactly.
 */

/** @type {import('next').NextConfig} */
const backendOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_BACKEND_BASE_URL ? new URL(process.env.NEXT_PUBLIC_BACKEND_BASE_URL).origin : "";
  } catch {
    return "";
  }
})();

const nextConfig = {
  // Next.js dev server only trusts localhost/127.0.0.1 by default; testing
  // from a real phone over LAN (e.g. http://192.168.8.155:3000) hits a
  // different Host header, so the dev server rejects the HMR websocket
  // upgrade. That silent rejection makes the page look completely dead on
  // mobile — no click/tap does anything — because the client keeps
  // retrying the blocked HMR connection and periodically force-reloads.
  // Listing the LAN origin here lets the dev server accept it.
  allowedDevOrigins: ["192.168.1.39"],
  // Enrollment pages are session-gated: no-store keeps the browser (incl. the back/forward cache)
  // from replaying a wizard page after logout, so Back re-hits proxy.js and lands on the login page.
  async headers() {
    return [
      {
        source: "/:school/enrollment/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      // The embed re-enrollment pages are shown inside the Java dashboard's iframe: only that origin (and this app itself) may frame them.
      {
        source: "/:school/embed/re-enrollment/:path*",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors 'self' ${backendOrigin}`.trim() }],
      },
      {
        source: "/:school/embed/re-enrollment",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors 'self' ${backendOrigin}`.trim() }],
      },
    ];
  },
  async rewrites() {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
    // Backend static assets (payment gateway logos, flags, card icons) are loaded same-origin so an https
    // deployment never requests them from the backend's plain-http origin (blocked as mixed content).
    const staticAssetRewrites = backendBaseUrl
      ? [{ source: "/static/theme2/:path*", destination: `${backendBaseUrl}/static/theme2/:path*` }]
      : [];
    if (!backendBaseUrl || process.env.NEXT_PUBLIC_USE_LOCAL_PROXY !== "true") return staticAssetRewrites;
    return {
      afterFiles: [
        { source: "/api/v1/:path*", destination: `${backendBaseUrl}/api/v1/:path*` },
        { source: "/:schoolId/api/:path*", destination: `${backendBaseUrl}/:schoolId/api/:path*` },
        // Leave school-prefixed /common routes to the App Router first. Any
        // backend-only /common path is still proxied by the fallback below.
        { source: "/:schoolId/student/enrollment/:path*", destination: `${backendBaseUrl}/:schoolId/student/enrollment/:path*` },
        { source: "/:schoolId/student/submit-application", destination: `${backendBaseUrl}/:schoolId/student/submit-application` },
        { source: "/:schoolId/student/proceed-to-dashboard", destination: `${backendBaseUrl}/:schoolId/student/proceed-to-dashboard` },
        { source: "/:schoolId/student/recommended-courses", destination: `${backendBaseUrl}/:schoolId/student/recommended-courses` },
        { source: "/:schoolId/dashboard/:path*", destination: `${backendBaseUrl}/:schoolId/dashboard/:path*` },
        { source: "/:schoolId/create-checkout-session/:path*", destination: `${backendBaseUrl}/:schoolId/create-checkout-session/:path*` },
        { source: "/:schoolId/create-checkout-intent/:path*", destination: `${backendBaseUrl}/:schoolId/create-checkout-intent/:path*` },
        { source: "/student/enrollment/:path*", destination: `${backendBaseUrl}/student/enrollment/:path*` },
      ],
      fallback: [
        {
          source: "/:path*",
          destination: `${backendBaseUrl}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
