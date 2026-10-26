import { signOut } from "next-auth/react";
import { loginPageUrl, resolveBackendNavigationOrigin, withLoginPayload } from "@/utils/backendOrigin";
import { navigateTop } from "@/utils/embed";

// Session expired / missing: drop the Next.js session and land on the school's login page.
// redirect:false + a manual navigation because the login page lives on another origin, which
// signOut's own callbackUrl handling would refuse.
export async function expireSession(schoolUUID) {
  if (window.__loggingOut) return;
  // TEMP-DEBUG: who sent the user to the login page (the Java login page then forwards a still-logged-in parent
  // to the parent dashboard). Keep "Preserve log" on in DevTools — the page navigates away right after this.
  console.warn("[expireSession] called -> going to the login page", new Error().stack);
  try {
    await signOut({ redirect: false });
  } catch (err) {
    console.error("Sign out failed:", err);
  }
  // Inside an iframe (re-enrollment embedded in the dashboard) the login page must replace the whole page.
  navigateTop(loginPageUrl(schoolUUID), { replace: false });
}

// Legacy signupLogout() / logoutConfimation(true, ...common/logout/UNIQUEUUID): the logout endpoint
// drops the user's login hash, records the logout and invalidates the Java HTTP session — which it
// finds through the browser's session cookie, so it has to be a browser navigation (a Server
// Action call can't carry that cookie). It then 302s to /{schoolId}/common/login, so one navigation
// both kills the session and lands on the login page.
export async function logoutEverywhere(session, credentials) {
  // signOut flips useSession() to "unauthenticated", which WizardChrome answers with
  // expireSession() -> login page; the flag keeps that from racing the logout navigation below.
  window.__loggingOut = true;
  await signOut({ redirect: false });
  const backend = resolveBackendNavigationOrigin();
  if (session?.schoolUUID && session?.uniqueId && backend) {
    const logoutUrl = `${backend}/${session.schoolUUID}/common/logout/${encodeURIComponent(session.uniqueId)}`;
    window.location.assign(withLoginPayload(logoutUrl, credentials?.email, credentials?.password));
    return;
  }
  window.location.assign(withLoginPayload(loginPageUrl(session?.schoolUUID), credentials?.email, credentials?.password));
}
