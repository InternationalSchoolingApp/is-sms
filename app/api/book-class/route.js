import { NextResponse } from "next/server";
import { getAccountSession } from "@/lib/auth/session";
import { getAssignedTeacherForCourse, getBookAClassStatus, getStudentBookClassDetails, getTeacherWeeklySlots } from "@/services/bookClassApi";

/**
 * Book a Class reads for the Elementary "day first" flow, as a Route Handler instead of Server Actions.
 *
 * Elementary picks a day before a course, so the page needs this week's slots of every course at once. As Server Actions
 * those calls are sent one at a time by the browser (Next.js queues them), behind the dashboard's other slow actions; plain
 * requests to this route run side by side.
 *
 * One request per course does both existing backend calls, the same ones services/bookClassApi.js makes (and with the same
 * payloads): the course's assigned teacher (/dashboard/student-subject-session-booking-new), then that teacher's weekly
 * slots (/teacherautoassign/get-teacher-time-to-show-weekly-calendar). Nothing new on the backend. The student is always the
 * signed-in user of this tab (X-Account header, read by getAccountSession inside those services), never an id from the
 * browser; the teacher comes from the backend's own answer.
 *
 * POST { action: "course-slots", subjectId, studentStandardId, startDate } -> { teacher, slots } (slots null when the
 * course has no teacher), 401 when nobody is signed in, 400 for a bad request.
 *
 * The Book a Class page's own reads come here too, so they no longer wait in the browser's Server Action queue behind the
 * dashboard's start-up actions. Each calls the existing service function unchanged (same backend call, same ownership checks):
 *   POST { action: "status", userTimezone }       -> getBookAClassStatus's answer (or null)
 *   POST { action: "details", studentStandardId } -> getStudentBookClassDetails's answer (or null; it checks the enrolment is
 *                                                    the signed-in student's own)
 */
const reply = (status, body) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const ID = /^\d{1,12}$/;
// IANA names ("Asia/Calcutta", "America/Argentina/Buenos_Aires", "UTC", "Etc/GMT+5").
const TIMEZONE = /^[A-Za-z][A-Za-z0-9_+\-/]{0,63}$/;

export async function POST(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.userId) {
    return reply(401, { message: "Your session has been logged out" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { message: "Bad request" });
  }
  if (body?.action === "status") {
    const userTimezone = typeof body.userTimezone === "string" && TIMEZONE.test(body.userTimezone) ? body.userTimezone : null;
    if (!userTimezone) return reply(400, { message: "Bad request" });
    return reply(200, (await getBookAClassStatus({ userTimezone })) ?? null);
  }
  if (body?.action === "details") {
    const studentStandardId = ID.test(String(body.studentStandardId ?? "")) ? Number(body.studentStandardId) : null;
    if (!studentStandardId) return reply(400, { message: "Bad request" });
    return reply(200, (await getStudentBookClassDetails({ studentStandardId })) ?? null);
  }
  if (body?.action !== "course-slots") return reply(400, { message: "Bad request" });

  const subjectId = ID.test(String(body.subjectId ?? "")) ? Number(body.subjectId) : null;
  const studentStandardId = ID.test(String(body.studentStandardId ?? "")) ? Number(body.studentStandardId) : null;
  const startDate = typeof body.startDate === "string" && !Number.isNaN(Date.parse(body.startDate)) ? body.startDate.slice(0, 40) : null;
  if (!subjectId || !studentStandardId || !startDate) return reply(400, { message: "Bad request" });

  const teacher = await getAssignedTeacherForCourse({ subjectId, studentStandardId });
  if (!teacher || teacher.teacherAssigned !== "YES") return reply(200, { teacher, slots: null });

  const slots = await getTeacherWeeklySlots({
    teacherUserId: teacher.assignedTeacherUserId,
    studentStandardId: teacher.studentStandardId ?? studentStandardId,
    subjectId,
    startDate,
  });
  return reply(200, { teacher, slots });
}
