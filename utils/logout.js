import { loginPageUrl, resolveBackendNavigationOrigin } from "@/utils/backendOrigin";

// Signs one user out of this browser (lib/auth: ends the SMS login, clears that user's cookies). Other
// users signed in to other tabs are not affected.
async function signOutAccount(uniqueId) {
  if (!uniqueId) return;
  await fetch("/api/session/logout", { method: "POST", headers: { "X-Account": uniqueId } });
}

// Session expired / missing: land on the school's login page. The expired account's cookies were
// already cleared by proxy.js when it found the login ended.
export async function expireSession(schoolUUID) {
  if (window.__loggingOut) return;
  window.location.assign(loginPageUrl(schoolUUID));
}

// Legacy signupLogout() / logoutConfimation(true, ...common/logout/UNIQUEUUID): the logout endpoint
// drops the user's login hash, records the logout and invalidates the Java HTTP session — which it
// finds through the browser's session cookie, so it has to be a browser navigation (a Server
// Action call can't carry that cookie). It then 302s to /{schoolId}/common/login, so one navigation
// both kills the session and lands on the login page.
export async function logoutEverywhere(session) {
  // The flag keeps expireSession() from racing the logout navigation below.
  window.__loggingOut = true;
  try {
    await signOutAccount(session?.uniqueId);
  } catch (err) {
    console.error("Sign out failed:", err);
  }
  const backend = resolveBackendNavigationOrigin();
  if (session?.schoolUUID && session?.uniqueId && backend) {
    window.location.assign(`${backend}/${session.schoolUUID}/common/logout/${encodeURIComponent(session.uniqueId)}`);
    return;
  }
  window.location.assign(loginPageUrl(session?.schoolUUID));
}
