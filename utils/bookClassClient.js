/*
 * Browser side of the Book a Class reads used by the Elementary "day first" flow: requests to this app's /api/book-class
 * route (app/api/book-class/route.js) instead of Server Actions, so the slots of every course load side by side instead of
 * one after another behind the dashboard's other actions.
 *
 * `account` is the dashboard's own user (context.uniqueId). It goes in the X-Account header so the route answers for the
 * student whose dashboard this is (the proxy that picks the account for page requests does not run for /api routes).
 */
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** { teacher, slots } of one course for the week starting at `startDate` (slots null without a teacher), or null. */
export async function getCourseSlots({ account, subjectId, studentStandardId, startDate }) {
  const headers = { "Content-Type": "application/json" };
  if (typeof account === "string" && ACCOUNT_ID.test(account)) headers["X-Account"] = account;
  try {
    const response = await fetch("/api/book-class", {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({ action: "course-slots", subjectId, studentStandardId, startDate }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
