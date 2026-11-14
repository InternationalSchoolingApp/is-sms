"use server";

import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * The dashboard's School System Training popup data — legacy studentTimePreference.js getStudentTimePreference()
 * -> POST /dashboard/student-course-selection-content-theme2 (ClientDashboardStudentController), called by
 * rendereDashboardContent when the dashboard data says showStudentCourseSelectionModel = "Y".
 *
 * The ids (studentId / standardId / providerId) are read on the server from the signed-in student's own
 * dashboard-or-migration answer, never taken from the browser: the backend call also updates the student's subjects
 * (as the legacy dashboard did) and trusts the ids it is given.
 */

async function post(schoolUUID, path, body) {
  const baseUrl = await resolveServerBackendOrigin();
  const response = await fetch(`${baseUrl}/${schoolUUID}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...serviceKeyHeaders(), ...(await smsAuthHeaders()) },
    body: JSON.stringify({ payload: encodePayload(body) }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// The student's StudentCourseSelectionResponse for their own ids (dashboard-or-migration), or null.
async function courseSelection(me, dashboard) {
  const data = await post(me.schoolUUID, "/dashboard/student-course-selection-content-theme2", {
    studentId: dashboard.studentId,
    standardId: dashboard.standardId,
    providerId: dashboard.providerId,
    userId: me.userId,
  });
  return data?.status === "1" ? data : null;
}

/**
 * null when the popup has nothing to do (not a student, graduating, the dashboard says no, or a failed call),
 * else the backend's StudentCourseSelectionResponse: { status, systemTrainingStatus, registrationType,
 * enrollmentType, showAcademicYearSelectionModel, showSystemTrainingSelectionModel, showSystemTrainingSelectionModelBatch,
 * semesterStartDate, orientationAcceptanceStatus, orientStatus, orientationdateTimeInStudentTimeZone,
 * joinOrientationUrl, rescheduleOrientationUrl, timePrefrenceSelectionStatus, ... }.
 */
export async function getSystemTrainingPopup() {
  const me = await getAccountSession();
  if (!me?.userId || !me?.schoolUUID || !hasBackendOrigin()) return null;
  try {
    const dashboard = await post(me.schoolUUID, "/student/dashboard/dashboard-or-migration", { userId: me.userId });
    if (!dashboard || dashboard.studentGraduate !== "N" || dashboard.showStudentCourseSelectionModel !== "Y") return null;
    return await courseSelection(me, dashboard);
  } catch {
    return null;
  }
}

/**
 * The Reschedule School System Training page (legacy /join-orientation?clickFrom=RESCHEDULE -> Orientation.jsp):
 * the same course-selection answer (orientStatus, orientationRescheduleNumber, orientationTotalRescheduleNumber,
 * orientationdateTimeInStudentTimeZone, studentName, ...) plus the student's time zone (StudentDetailsDTO.userTimezone)
 * for "tomorrow" in the date picker. null when it cannot be read (or the user is not a student with a training).
 */
export async function getSystemTrainingDetails() {
  const me = await getAccountSession();
  if (!me?.userId || !me?.schoolUUID || !hasBackendOrigin()) return null;
  try {
    const dashboard = await post(me.schoolUUID, "/student/dashboard/dashboard-or-migration", { userId: me.userId });
    if (!dashboard?.studentId) return null;
    const [data, details] = await Promise.all([
      courseSelection(me, dashboard),
      post(me.schoolUUID, "/student/dashboard/get-student-dashboard", { userId: me.userId }),
    ]);
    if (!data) return null;
    return { ...data, userTimezone: details?.userTimezone || null };
  } catch {
    return null;
  }
}
