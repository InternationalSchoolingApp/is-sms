"use server";

import { hasBackendOrigin } from "@/utils/backendOrigin";
import { parentPost, parentSessionUserId } from "@/services/parentApiBase";

/**
 * The child's assigned teachers per course — POST /dashboard/parent/student-assgined-teacher (the typo is the
 * backend's) {userId (the parent, from the session), studentUserId}. The backend refuses a child that is not
 * mapped to the parent. Response (ResponseCommon): status "1" / statusCode "S001" with
 *   details (StudentAssignedTeacherDetailsDTO) { className, assignedTeachers[] {
 *     coruseId, teacherId, courseName, teacherName, teacherGender, lmsUserId, lmsCourseId } }
 * "No rows" and a refused child both come back as a FAILED status without details; session out is status "3".
 * null on any failure.
 */
export async function getParentAssignedTeachers({ schoolUUID, studentUserId }) {
  if (!hasBackendOrigin() || !schoolUUID || !studentUserId) return null;
  try {
    const userId = await parentSessionUserId();
    if (!userId) return null;
    return await parentPost(schoolUUID, "/dashboard/parent/student-assgined-teacher", { userId: String(userId), studentUserId: String(studentUserId) });
  } catch {
    return null;
  }
}
