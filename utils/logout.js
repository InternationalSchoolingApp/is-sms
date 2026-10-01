import { signOut } from "next-auth/react";
import { loginPageUrl } from "@/utils/backendOrigin";

// Session expired / missing: drop the Next.js session and land on the school's login page.
// redirect:false + a manual navigation because the login page lives on another origin, which
// signOut's own callbackUrl handling would refuse.
export async function expireSession(schoolUUID) {
  if (window.__loggingOut) return;
  try {
    await signOut({ redirect: false });
  } catch (err) {
    console.error("Sign out failed:", err);
  }
  window.location.assign(loginPageUrl(schoolUUID));
}

// Legacy signupLogout() / logoutConfimation(true, ...common/logout/UNIQUEUUID): the logout endpoint
// drops the user's login hash, records the logout and invalidates the Java HTTP session — which it
// finds through the browser's session cookie, so it has to be a browser navigation (a Server
// Action call can't carry that cookie). It then 302s to /{schoolId}/common/login, so one navigation
// both kills the session and lands on the login page.
export async function logoutEverywhere(session) {
  // signOut flips useSession() to "unauthenticated", which WizardChrome answers with
  // expireSession() -> login page; the flag keeps that from racing the logout navigation below.
  window.__loggingOut = true;
  await signOut({ redirect: false });
  const backend = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  if (session?.schoolUUID && session?.uniqueId && backend) {
    window.location.assign(`${backend}/${session.schoolUUID}/common/logout/${encodeURIComponent(session.uniqueId)}`);
    return;
  }
  window.location.assign(loginPageUrl(session?.schoolUUID));
}
