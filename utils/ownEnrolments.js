import { backendRequest, getSessionIdentity } from "@/utils/backendRequest";

/**
 * Is this studentStandardId (an enrolment row) the signed-in student's own? Server-only (server actions, route handlers).
 *
 * The browser passes studentStandardId to the book-a-class and profile server actions, and the backend endpoints behind
 * them load the row by id alone (DashboardStudentUtil studentStandardService.getById(studentStandardId)) without checking
 * whose it is: any other id would read or change another student's enrolment. The pages only ever send the student's
 * own current enrolment, which comes from one of two existing calls, both for the session's own userId:
 *   - student/dashboard/get-student-dashboard   -> studentStandardId (the dashboard / profile enrolment)
 *   - dashboard/book-a-class                    -> details.studentStandardId (the "progression" enrolment Book a Class uses)
 * The second one is asked only when the first does not match, since it is the Book a Class page's own load call (its
 * userTimezone only picks "today" for a date check; nothing is saved from it).
 *
 * Answers are kept 5 minutes per user in this server process, so a page's many calls cost one lookup.
 */
const TTL_MS = 5 * 60 * 1000;
const MAX_USERS = 5000;
const known = new Map(); // userId -> { ids: Set<number>, until: number }

function remembered(userId) {
  const hit = known.get(userId);
  if (!hit) return new Set();
  if (hit.until > Date.now()) return hit.ids;
  known.delete(userId);
  return new Set();
}

function remember(userId, ids) {
  if (known.size >= MAX_USERS) {
    const now = Date.now();
    for (const [key, value] of known) if (value.until <= now) known.delete(key);
    if (known.size >= MAX_USERS) known.clear();
  }
  known.set(userId, { ids, until: Date.now() + TTL_MS });
}

const asId = (value) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
};

/**
 * An enrolment the backend itself named for the signed-in student (e.g. the assigned-teacher answer, which the backend
 * resolves from the session user's own userId): accepted on the next calls of this user, like the two lookups below.
 */
export async function rememberOwnStudentStandard(studentStandardId) {
  const id = asId(studentStandardId);
  const me = id ? await getSessionIdentity() : null;
  if (!me) return;
  const ids = new Set(remembered(me.userId));
  ids.add(id);
  remember(me.userId, ids);
}

export async function isOwnStudentStandard(studentStandardId) {
  const id = asId(studentStandardId);
  if (!id) return false;
  const me = await getSessionIdentity();
  if (!me) return false;
  const ids = new Set(remembered(me.userId));
  if (ids.has(id)) return true;

  const dashboard = await backendRequest({
    path: "student/dashboard/get-student-dashboard",
    checkSession: null,
    buildBody: (user) => ({ userId: user.userId }),
  });
  const current = asId(dashboard.ok && dashboard.data?.studentStandardId);
  if (current) ids.add(current);

  if (!ids.has(id)) {
    const gate = await backendRequest({
      path: "dashboard/book-a-class",
      checkSession: null,
      buildBody: (user) => ({ schoolId: user.schoolNumericId, userId: user.userId, userTimezone: "Asia/Singapore" }),
    });
    const progression = asId(gate.ok && gate.data?.details?.studentStandardId);
    if (progression) ids.add(progression);
  }

  if (ids.size) remember(me.userId, ids);
  return ids.has(id);
}
