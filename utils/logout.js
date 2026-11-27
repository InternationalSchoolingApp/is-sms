import { loginPageUrl, resolveBackendNavigationOrigin, withLoginEmail } from "@/utils/backendOrigin";
import { clearLiveAlertMarks } from "@/utils/liveAlertMemory";

// Signs one user out of this browser (lib/auth: ends the SMS login, clears that user's cookies). Other
// users signed in to other tabs are not affected.
async function signOutAccount(uniqueId) {
  if (!uniqueId) return;
  // The next login must see the live-class dialog again.
  clearLiveAlertMarks();
  await fetch("/api/session/logout", { method: "POST", headers: { "X-Account": uniqueId } });
}

// The user this tab works for (components/auth/TabAccount.jsx keeps it in sessionStorage).
function tabAccount() {
  try {
    return window.sessionStorage.getItem("isx-account");
  } catch {
    return null;
  }
}

/** Signs this tab's user out of the browser (no-op when the tab has none). */
export async function signOutTabAccount() {
  await signOutAccount(tabAccount());
}

// Session expired / missing: land on the school's login page. The expired account's cookies were
// already cleared by proxy.js when it found the login ended.
export async function expireSession(schoolUUID) {
  if (window.__loggingOut) return;
  // TEMP-DEBUG: who sent the user to the login page (the Java login page then forwards a still-logged-in parent
  // to the parent dashboard). Keep "Preserve log" on in DevTools — the page navigates away right after this.
  console.warn("[expireSession] called -> going to the login page", new Error().stack);
  try {
    await signOutTabAccount();
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
// `loginEmail`: prefilled on the login page it ends on (never a password, see withLoginEmail).
export async function logoutEverywhere(session, loginEmail) {
  // The flag keeps expireSession() from racing the logout navigation below.
  window.__loggingOut = true;
  try {
    await signOutAccount(session?.uniqueId);
  } catch (err) {
    console.error("Sign out failed:", err);
  }
  const backend = resolveBackendNavigationOrigin();
  if (session?.schoolUUID && session?.studentUserId && backend) {
    const logoutUrl = `${backend}/${session.schoolUUID}/common/logout/${encodeURIComponent(session.studentUserId)}`;
    window.location.assign(withLoginEmail(logoutUrl, loginEmail));
    return;
  }
  window.location.assign(withLoginEmail(loginPageUrl(session?.schoolUUID), loginEmail));
}

/**
 * Signs a student in with a password they were just given (create-password page, first-payment thank-you), without
 * the password ever leaving this app in a URL or a cookie: our server checks it with the existing Java login API
 * (/api/session/verify-password, rate-limited) and the browser follows the one-time sign-in link the login answers with
 * (this app's /api/sso). Returns false when that is not possible (no such link, refused, offline); the caller then
 * sends the student to the login page with only the e-mail filled in.
 */
export async function signInWithPassword(schoolUUID, email, password) {
  if (!schoolUUID || !email || !password) return false;
  let answer = null;
  try {
    const response = await fetch("/api/session/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, schoolUUID }),
    });
    answer = await response.json();
  } catch {
    return false;
  }
  if (!answer?.ok || !answer.ssoUrl) return false;
  const url = new URL(answer.ssoUrl, window.location.origin);
  // Which backend this sign-in belongs to (UAT only; /api/sso ignores it elsewhere), as the session-out dialog does.
  const backend = resolveBackendNavigationOrigin();
  if (backend) url.searchParams.set("backend", backend);
  window.location.assign(url.toString());
  return true;
}

// Add Another Student wizard "Log Off". It is the same caller account as the dashboard tab, and the account
// session is shared across tabs. Revoking it here also signs the dashboard out, so leave the session intact
// and close only the wizard tab.
export async function leaveAddEnrollmentWizard(session) {
  window.__loggingOut = true;
  window.close();
  // Not closable (tab opened by hand / reloaded): fall back to the school's login page.
  setTimeout(() => window.location.assign(loginPageUrl(session?.schoolUUID)), 300);
}
