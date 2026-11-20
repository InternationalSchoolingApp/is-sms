// "Has this login already seen the dashboard intro?" One mark per account in this browser (localStorage, so a second tab
// of the same login does not replay it). Logging out (or an expired session) clears the marks, so the next login shows the
// intro again: once per login.
const PREFIX = "is-login-intro:";

export function introSeen(account) {
  if (!account) return true;
  try {
    return Boolean(window.localStorage.getItem(PREFIX + account));
  } catch {
    return true; // storage blocked: never risk replaying the intro on every page load
  }
}

export function markIntroSeen(account) {
  if (!account) return;
  try {
    window.localStorage.setItem(PREFIX + account, "1");
  } catch {
    // storage unavailable: the intro may show again on the next load
  }
}

export function clearIntroMarks() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // storage unavailable: nothing to clear
  }
}
