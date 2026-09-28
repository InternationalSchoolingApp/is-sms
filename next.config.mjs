/**
 * Local-dev reverse proxy: forwards /backend/* to the real Spring Boot
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
const nextConfig = {
  // Next.js dev server only trusts localhost/127.0.0.1 by default; testing
  // from a real phone over LAN (e.g. http://192.168.8.155:3000) hits a
  // different Host header, so the dev server rejects the HMR websocket
  // upgrade. That silent rejection makes the page look completely dead on
  // mobile — no click/tap does anything — because the client keeps
  // retrying the blocked HMR connection and periodically force-reloads.
  // Listing the LAN origin here lets the dev server accept it.
  allowedDevOrigins: ["192.168.1.39"],
  async rewrites() {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
    if (!backendBaseUrl) return [];
    return [
      {
        source: "/backend/:path*",
        destination: `${backendBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
