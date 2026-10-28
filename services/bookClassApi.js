"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Phase C — Book Classes (sidebar pageLink `book-a-session`). Ports the live
 * legacy flow in is-rest-api (studentBookClass.js / studentBookClassContent.js
 * / manageTeacherAvailability.js -> ClientDashboardStudentController +
 * TeacherAutoAssignController).
 *
 * Identity (userId, school) is read from the next-auth session on the server,
 * never taken from the browser: several of these Java methods trust the ids in
 * the payload without checking them against the session, and the submit call
 * creates a meeting, spends class credits and emails the student and teacher.
 *
 * Some endpoints take the encoded payload as a `?payload=` query param rather
 * than a JSON body; all of them get the browser's session cookie forwarded.
 * Non-2xx / empty / non-JSON responses come back as null.
 */

async function identity() {
  const session = await auth();
  if (!session?.userId || !session?.schoolUUID) return null;
  return { userId: session.userId, schoolUUID: session.schoolUUID, schoolId: session.schoolNumericId };
}

async function sessionCookieHeader() {
  try {
    return (await cookies()).toString();
  } catch {
    return "";
  }
}

async function parseJsonResponse(response) {
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function callBackend(schoolUUID, path, body, { method = "POST", asQuery = false } = {}) {
  const baseUrl = await resolveServerBackendOrigin();
  const encoded = encodePayload(body);
  const url = `${baseUrl}/${schoolUUID}${path}${asQuery ? `?payload=${encodeURIComponent(encoded)}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Cookie: await sessionCookieHeader() },
    body: asQuery ? undefined : JSON.stringify({ payload: encoded }),
  });
  return parseJsonResponse(response);
}

/**
 * Entry gate — POST /dashboard/book-a-class (DashboardStudentUtil.bookAClass).
 * statusCode "BUY_A_CLASS" / "AY_NOT_STARTED" mean "show `message` instead of
 * the booking screen"; otherwise details = { studentStandardId,
 * showAcademicYearValidation: "Y"|"N", classPlanCount }. On a student's first
 * visit this call also seeds their class-count rows (legacy behaviour).
 */
export async function getBookAClassStatus({ userTimezone }) {
  const me = await identity();
  if (!hasBackendOrigin() || !me) return null;
  try {
    return await callBackend(me.schoolUUID, "/dashboard/book-a-class", {
      schoolId: me.schoolId,
      userId: me.userId,
      userTimezone,
    });
  } catch {
    return null;
  }
}

/**
 * Class counts + per-course list — /dashboard/student-book-a-class-details.
 * Returns { classData: {year[], week[]}, compClassPerweek, compClassYear,
 * registerType, subjectList[] }.
 */
export async function getStudentBookClassDetails({ studentStandardId }) {
  const me = await identity();
  if (!hasBackendOrigin() || !me || !studentStandardId) return null;
  try {
    return await callBackend(
      me.schoolUUID,
      "/dashboard/student-book-a-class-details",
      { studentStandardId, schoolId: me.schoolId, sessionUserId: me.userId, bookingDate: "" },
      { asQuery: true },
    );
  } catch {
    return null;
  }
}

/**
 * Teacher assigned to one course — /dashboard/student-subject-session-booking-new.
 * Returns { teacherAssigned: "YES"|"NO", assignedTeacherUserId, studentStandardId, teacherName, message }.
 */
export async function getAssignedTeacherForCourse({ subjectId, studentStandardId }) {
  const me = await identity();
  if (!hasBackendOrigin() || !me || !subjectId) return null;
  try {
    return await callBackend(
      me.schoolUUID,
      "/dashboard/student-subject-session-booking-new",
      { userId: me.userId, subjectId, studentStandardId },
      { method: "GET", asQuery: true },
    );
  } catch {
    return null;
  }
}

/**
 * "All Courses" card (subjectId 0) — /dashboard/student-subject-session-booking-elementry.
 * Returns studentSubjectList[] { subjectId, subjectName, teacherName, assignedTeacherUserId, teacherAssigned }
 * for the student to pick a course before the normal per-course flow runs.
 */
export async function getAssignedTeachersForAllCourses({ studentStandardId }) {
  const me = await identity();
  if (!hasBackendOrigin() || !me || !studentStandardId) return null;
  try {
    return await callBackend(
      me.schoolUUID,
      "/dashboard/student-subject-session-booking-elementry",
      { userId: me.userId, studentStandardId },
      { method: "GET", asQuery: true },
    );
  } catch {
    return null;
  }
}

/**
 * The teacher's bookable week — POST /teacherautoassign/get-teacher-time-to-show-weekly-calendar.
 * `startDate` is an ISO string (legacy sends a JS Date through JSON.stringify).
 * Returns { teacherUserId, teacherName, subjectName, timeZoneName, classDuration,
 * showSlotAfter, skipDateList, previousDateOfWeekFirstDay, nextDateOfWeekLasttDay,
 * teacherWeeklyTimeCurrLiveClass.teacherAssignTimeWeekList[] }.
 */
export async function getTeacherWeeklySlots({ teacherUserId, studentStandardId, subjectId, startDate }) {
  const me = await identity();
  if (!hasBackendOrigin() || !me || !teacherUserId) return null;
  try {
    return await callBackend(me.schoolUUID, "/teacherautoassign/get-teacher-time-to-show-weekly-calendar", {
      userId: teacherUserId,
      userRole: "STUDENT",
      schoolId: me.schoolId,
      callType: "WEEK",
      startDate,
      subjectid: subjectId,
      dataType: "CUSTOM",
      studentStandardId,
      sessionUserId: me.userId,
    });
  } catch {
    return null;
  }
}

/**
 * Books one slot — POST /dashboard/student-book-session-slots-submit-new.
 * WRITES: inserts a MEETINGS row, spends a class credit and emails the student
 * and the teacher. Returns { status, message }.
 */
export async function submitBookClassSlot({ meetingDate, meetingEndDate, subjectId, studentStandardId, teacherUserId }) {
  const me = await identity();
  if (!hasBackendOrigin() || !me) return null;
  try {
    return await callBackend(me.schoolUUID, "/dashboard/student-book-session-slots-submit-new", {
      authentication: { schoolId: me.schoolId, schoolUUID: me.schoolUUID, userType: "STUDENT", userId: me.userId },
      meetingSlotDTO: {
        meetingPersoneId: me.userId,
        meetingDate,
        meetingEndDate,
        meetingType: "STUDENT_DOUBT_SESSION",
        subjectId,
        studentStandardId,
        teachUserId: teacherUserId,
        schoolPersonId: teacherUserId,
        schoolId: me.schoolId,
        meetingVendor: "LENS",
      },
    });
  } catch {
    return null;
  }
}

/**
 * Booked-classes history for a course — /dashboard/student-booked-classes-details.
 * dateType: today|yesterday|week|month|custom (custom uses startDate/endDate "MMM dd, yyyy").
 * Returns { subjectCountDatials (sic), meetingDetails[] }.
 */
export async function getStudentBookedClasses({ subjectId, studentStandardId, dateType, startDate = "", endDate = "", classStatus = "" }) {
  const me = await identity();
  if (!hasBackendOrigin() || !me || !studentStandardId) return null;
  try {
    return await callBackend(
      me.schoolUUID,
      "/dashboard/student-booked-classes-details",
      { userId: me.userId, subjectId, studentStandardId, callFrom: "STUDENT", startDate, endDate, classStatus, dateType },
      { method: "GET", asQuery: true },
    );
  } catch {
    return null;
  }
}
