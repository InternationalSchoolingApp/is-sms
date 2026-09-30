import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Server-side guard for the post-login enrollment wizard's flat routes
 * (/step/student-details, /step/parent-details, /step/course-selection,
 * /step/review-and-payment — no {schoolId} segment; schoolUUID lives in the
 * session instead, see auth.js). Mirrors each step page's own client-side
 * check (useSession() -> "unauthenticated" -> redirect), but runs before
 * any page HTML is sent, so a direct hit / bookmark / reload with no
 * Auth.js session never even momentarily renders the protected wizard shell.
 *
 * Unauthenticated hits redirect to "/" (not a school-specific login page):
 * without a session we don't know which school's login to send them to —
 * schoolId is only ever known from the LOGIN page's own URL
 * (/[schoolId]/common/login), which these flat /step/N routes deliberately
 * don't carry. "/" is the app's own entry point; wire it to pick/prompt for
 * a school (or redirect further) once that flow exists.
 *
 * Uses the v5 `auth()` wrapper (from the central auth.js config) instead of
 * v4's `getToken()` — `req.auth` is the decoded session, already populated
 * for us by the wrapper. Named/placed as proxy.js, not middleware.js — the
 * "middleware" file convention is deprecated as of Next.js 16 in favor of
 * "proxy" (same request-interception mechanism, new name/file).
 */
export default auth((req) => {
  if (req.auth) return NextResponse.next();
  return NextResponse.redirect(new URL("/", req.url));
});

export const config = {
  matcher: [
    "/step/student-details/:path*",
    "/step/parent-details/:path*",
    "/step/course-selection/:path*",
    "/step/review-and-payment/:path*",
  ],
};
