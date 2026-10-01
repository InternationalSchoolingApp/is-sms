import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Server-side guard for the post-login enrollment wizard's step routes
 * (/{school}/enrollment/{program}/step/{student-details,parent-details,
 * course-selection,review-and-payment}). The wizard still reads
 * schoolUUID/userId from the session (see auth.js / useEnrollmentContext),
 * not these URL segments — the {school}/{program} path is a navigation
 * container. Mirrors each step page's own client-side check (useSession()
 * -> "unauthenticated" -> redirect), but runs before any page HTML is sent,
 * so a direct hit / bookmark / reload with no Auth.js session never even
 * momentarily renders the protected wizard shell.
 *
 * Unauthenticated hits redirect to "/" (not a school-specific login page):
 * the wizard reads the real school from the session, not the URL, so without
 * a session there's nothing authoritative to key a school-specific login on.
 * "/" is the app's own entry point; wire it to pick/prompt for a school (or
 * redirect further) once that flow exists.
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
    "/:school/enrollment/:program/step/:path*",
  ],
};
