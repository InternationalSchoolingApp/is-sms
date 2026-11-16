/*
 * Debug trail of the School Diary unread count (badge) - TEMPORARY, remove before release.
 * Every line starts with "[diary-unread]" so the browser console (or the `npm run dev` terminal for the server side) can
 * be filtered on it. Off in production builds.
 *
 *   diaryLog("step", data)    one line: what happened (request, answer, poll, bridge message, refresh)
 *   diaryTrace("step", data)  the same, with a stack trace (who caused it) - used when the badge value changes
 */
const ON = process.env.NODE_ENV !== "production";
const stamp = () => new Date().toISOString().slice(11, 23);

export function diaryLog(step, data) {
  if (!ON) return;
  if (data === undefined) console.log(`[diary-unread] ${stamp()} ${step}`);
  else console.log(`[diary-unread] ${stamp()} ${step}`, data);
}

export function diaryTrace(step, data) {
  if (!ON) return;
  console.trace(`[diary-unread] ${stamp()} ${step}`, data);
}
