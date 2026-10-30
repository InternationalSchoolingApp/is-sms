import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  detectOriginatingBackend,
  getBackendOverrideCookieName,
  isBackendOverrideAllowed,
  parseBackendOrigin,
} from "@/utils/backendOrigin";

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
  const path = req.nextUrl.pathname;
  const segments = path.split("/").filter(Boolean);

  // Pre-login landing page (/{school}/enrollment/{program} — exactly school/enrollment/program,
  // nothing after; the protected wizard above additionally has /step/...). A UAT backend can send a
  // brand-new/anonymous student straight here (ClientSignupStudentController#commonSignupContent,
  // no `user` found yet) without going through /api/sso at all, so unlike the SSO handoff nothing has
  // told this app which of the several UAT backend instances that was. That controller (like
  // getFinalEnrollmentUrl for the SSO handoff) appends an explicit `backend` query param for exactly
  // this — prefer it, falling back to the Referer-based detection (absent for a typed/bookmarked URL,
  // which is exactly why the query param exists) for an older/un-upgraded backend build. Persist
  // whichever one fires the same way the manual UAT picker does
  // (components/common/BackendSwitcher.jsx) — otherwise this student's calls (and the picker's own
  // display) silently fall back to the default backend instead of the one that sent them.
  if (segments.length === 3 && segments[1] === "enrollment") {
    const backendParam = isBackendOverrideAllowed() ? parseBackendOrigin(req.nextUrl.searchParams.get("backend")) : "";
    const backendOverride = backendParam || detectOriginatingBackend(req);
    if (!backendOverride) return NextResponse.next();
    let response;
    if (backendParam) {
      const cleanUrl = new URL(req.url);
      cleanUrl.searchParams.delete("backend");
      response = NextResponse.redirect(cleanUrl);
    } else {
      response = NextResponse.next();
    }
    response.cookies.set(getBackendOverrideCookieName(), backendOverride, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return response;
  }

  if (req.auth) return NextResponse.next();
  // First path segment is the {school}; send them to that school's Java login page.
  const school = segments[0];
  const override = isBackendOverrideAllowed() ? req.cookies.get(getBackendOverrideCookieName())?.value : undefined;
  const backend = override || process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  if (school && backend) return NextResponse.redirect(`${backend}/${school}/common/login`);
  return NextResponse.redirect(new URL("/", req.url));
});

export const config = {
  matcher: [
    "/:school/enrollment/:program",
    "/:school/enrollment/:program/step/:path*",
    "/:school/add-enrollment/:parentId/:sessionUserId/step/:path*",
    // Re-enrollment (existing students): the option screen and its step screens.
    "/:school/:mode(embed|share)/re-enrollment",
    "/:school/:mode(embed|share)/re-enrollment/:path*",
  ],
};
