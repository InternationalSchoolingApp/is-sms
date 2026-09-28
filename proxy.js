import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Server-side guard for the post-login enrollment wizard. Mirrors the
 * client-side check already in app/[schoolId]/student/enrollment/page.jsx
 * (useSession() -> "unauthenticated" -> router.replace(login)), but runs
 * before any page HTML is sent, so a direct hit / bookmark / reload with no
 * Auth.js session never even momentarily renders the protected wizard shell.
 * That page's own client-side redirect is left in place — it still covers
 * the session expiring while the user is already on the page.
 *
 * Scoped ONLY to /:schoolId/student/enrollment — NOT all of /student/**,
 * because /[schoolId]/student/[enrollmentFor]/[learningProgram] is the
 * pre-login account-creation screen (AccountForm.jsx / AccountFormOfflineB2B.jsx)
 * and must stay public.
 *
 * Uses the v5 `auth()` wrapper (from the central auth.js config) instead of
 * v4's `getToken()` — `req.auth` is the decoded session, already populated
 * for us by the wrapper. Named/placed as proxy.js, not middleware.js — the
 * "middleware" file convention is deprecated as of Next.js 16 in favor of
 * "proxy" (same request-interception mechanism, new name/file).
 */
export default auth((req) => {
  if (req.auth) return NextResponse.next();

  const schoolUUID = req.nextUrl.pathname.split("/")[1];
  return NextResponse.redirect(new URL(`/${schoolUUID}/common/login`, req.url));
});

export const config = {
  matcher: ["/:schoolId/student/enrollment/:path*"],
};
