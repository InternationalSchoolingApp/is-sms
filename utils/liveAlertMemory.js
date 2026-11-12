// "Hurry! Your class has started" (K–5 / Grade 6–8 home, StudentHomeK5): the student's answer to the live-class dialog is
// remembered per class in sessionStorage, so a refresh does not ask again. A new login must ask again, so signing out
// (utils/logout.js) forgets every answer: whoever logs in while a class is live sees the dialog every time.
export const LIVE_ALERT_KEY = "is-k5-live-alert:";

export function clearLiveAlertMarks() {
  try {
    const keys = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key && key.startsWith(LIVE_ALERT_KEY)) keys.push(key);
    }
    keys.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // storage unavailable: nothing was remembered either
  }
}
