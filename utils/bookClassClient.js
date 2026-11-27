/*
 * Browser side of the Book a Class reads: requests to this app's /api/book-class route (app/api/book-class/route.js) instead
 * of Server Actions. Next.js sends a browser's Server Actions one at a time, so as actions these reads waited behind the
 * dashboard's start-up actions (and each other); as route requests they run side by side.
 *
 * `account` is the dashboard's own user (context.uniqueId). It goes in the X-Account header so the route answers for the
 * student whose dashboard this is (the proxy that picks the account for page requests does not run for /api routes).
 */
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;

async function post(account, body) {
  const headers = { "Content-Type": "application/json" };
  if (typeof account === "string" && ACCOUNT_ID.test(account)) headers["X-Account"] = account;
  try {
    const response = await fetch("/api/book-class", { method: "POST", headers, cache: "no-store", body: JSON.stringify(body) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** { teacher, slots } of one course for the week starting at `startDate` (slots null without a teacher), or null. */
export function getCourseSlots({ account, subjectId, studentStandardId, startDate }) {
  return post(account, { action: "course-slots", subjectId, studentStandardId, startDate });
}

/** Same answer as services/bookClassApi.js getBookAClassStatus, without waiting in the Server Action queue. */
export function getBookAClassStatusViaRoute({ account, userTimezone }) {
  return post(account, { action: "status", userTimezone });
}

/** Same answer as services/bookClassApi.js getStudentBookClassDetails, without waiting in the Server Action queue. */
export function getStudentBookClassDetailsViaRoute({ account, studentStandardId }) {
  return post(account, { action: "details", studentStandardId });
}
