"use server";

import { parentPost, parentSessionUserId } from "@/services/parentApiBase";

/**
 * BFF for the parent's Academic Performance page (server actions, built on services/parentApiBase.js). A failed /
 * empty answer comes back as null, never thrown. The parent is the session user; the backend refuses a child that
 * is not mapped to that parent (E004 "Unauthorized student access").
 *
 * The per-course Buzz detail and grade-history calls are the shared ones in services/dashboardApi.js
 * (getStudentProgressReportDetail / getProgressReportGradeHistory); they already take the student id as a parameter.
 */

/**
 * The child's courses — POST /dashboard/parent/student-academic-performance {userId (the parent), studentUserId,
 * studentStandardId}. k5Performance is deliberately NOT sent (legacy parent never does, even for a K5 child).
 * Response { status "1"|"0"|"3" (3 = session out), statusCode, message, details } where details is
 *   { courseProviderId, studentAcademicPerformances[] } and each row { lmsEnrollmentId, lmsCourseId, courseName,
 *   score (percent string), teacherName, teacherGender, startDate, endDate, remainingDays, pendingAssignment,
 *   progressGradable, progressAllActivity (percent strings), progressPace (Ahead|OnTrack|Behind|GettingStarted) }.
 * Only Agilix Buzz providers (36/37/38) carry pace/pending/progress and the detail view.
 */
export async function getParentAcademicPerformance({ schoolUUID, studentUserId, studentStandardId }) {
  if (!schoolUUID || !studentUserId) return null;
  const userId = await parentSessionUserId();
  if (!userId) return null;
  const standard = Number(studentStandardId);
  return parentPost(schoolUUID, "/dashboard/parent/student-academic-performance", {
    userId,
    studentUserId: String(studentUserId),
    ...(standard > 0 ? { studentStandardId: standard } : {}),
  });
}
