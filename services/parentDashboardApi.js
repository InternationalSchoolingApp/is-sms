"use server";

import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * BFF for the Parent dashboard (server actions). Same envelope and origin resolution as services/dashboardApi.js:
 * POST {backend}/{schoolUUID}<path> with {payload: encodePayload(body)}, the signed-in user's SMS token as Bearer
 * and this server's service key. A failed / empty / non-JSON answer comes back as null, never thrown. The parent
 * is always the session user; nothing identity-related is taken from the browser.
 */

async function authHeaders() {
  return { ...serviceKeyHeaders(), ...(await smsAuthHeaders()) };
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

// POST {backend}/{schoolUUID}<path> with the standard envelope and the session user's token; null on any failure.
async function postParent(schoolUUID, path, body) {
  const baseUrl = await resolveServerBackendOrigin();
  const response = await fetch(`${baseUrl}/${schoolUUID}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ payload: encodePayload(body) }),
  });
  return parseJsonResponse(response);
}

/**
 * The selected child's home overview — POST /dashboard/parent/student-dashboard-overview {studentUserId}.
 * Response.details (ParentStudentDashboardOverviewDataDTO):
 *   student { studentUserId, profilePic, studentName, grade, learningProgram, lastActive }
 *   summary { attendancePercentThisMonth, attendanceDeltaFromLastMonth, totalClassesThisMonth,
 *             avgGradeThisMonth, avgGradeLastMonth, totalCourses }
 *   attendanceOverview[] { monthKey "yyyy-MM", monthLabel, totalClasses, attendedClasses, attendancePercent }
 *   gradeOverview[]      { monthKey, monthLabel, averagePercentage }
 *   activitiesWithClass  boolean
 * The backend refuses a child that is not mapped to the session parent.
 */
export async function getParentChildOverview({ schoolUUID, studentUserId }) {
  if (!hasBackendOrigin() || !schoolUUID || !studentUserId) return null;
  try {
    return await postParent(schoolUUID, "/dashboard/parent/student-dashboard-overview", { studentUserId });
  } catch {
    return null;
  }
}

/**
 * The child's classes and activities between two dates — POST /dashboard/parent/student-schedule
 * {studentUserId, startDate, endDate} (ISO yyyy-MM-dd). Response.details { countryISOCode, schedule[] }, each item
 * { id, entityId, entityName, category CLASS|ACTIVITY, type, classStatus, courseName, teacherName, start, end,
 * timezone, icon, meetingId, classesAttendance, classesAttendanceDuration, hasFeedback }. With no rows the backend
 * answers FAILED but still sends details.schedule = [].
 */
export async function getParentChildSchedule({ schoolUUID, studentUserId, startDate, endDate }) {
  if (!hasBackendOrigin() || !schoolUUID || !studentUserId) return null;
  try {
    return await postParent(schoolUUID, "/dashboard/parent/student-schedule", { studentUserId, startDate, endDate });
  } catch {
    return null;
  }
}

/**
 * The child's fee rows — POST /dashboard/parent/student-fee-details {userId (the parent), studentUserId}.
 * Response.details (StudentDueFeesDTO) { userPaymentDetailsList[], nextUserPaymentDetailsId, paymentType,
 * paymentTitle, isDashboardPaymentAvaileble }, rows { id, status, paymentName, scheduledPayDate, payDate,
 * paymentTitle, recieptLink, ... }. details is null when the child has no payment rows.
 */
export async function getParentChildFeeDetails({ schoolUUID, studentUserId }) {
  if (!hasBackendOrigin() || !schoolUUID || !studentUserId) return null;
  try {
    const session = await getAccountSession();
    if (!session?.userId) return null;
    return await postParent(schoolUUID, "/dashboard/parent/student-fee-details", { userId: session.userId, studentUserId });
  } catch {
    return null;
  }
}

/**
 * The parent gate — POST /{schoolUUID}/dashboard/parent/get-students-by-parent. One call gives the dashboard:
 *   studentBasicDetails[]   the parent's children (studentId, studentName, userId, standardName,
 *                           studentStandardId, courseProvicerId, learningProgramName, studentTimezone, profilePic, ...)
 *   roleAndModuleAssign     the parent's menu with its role id (the parent's counterpart of the student
 *                           dashboard's get-student-dashboard, whose role id the sidebar needs)
 *   lmsProviderURL          present when the parent has an LMS user
 * The backend takes the parent from the session (a body userId that is not the session user is refused).
 */
export async function getParentGate({ schoolUUID }) {
  if (!hasBackendOrigin() || !schoolUUID) return null;
  try {
    const session = await getAccountSession();
    if (!session?.userId) return null;
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/${schoolUUID}/dashboard/parent/get-students-by-parent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ payload: encodePayload({ userId: session.userId }) }),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}
