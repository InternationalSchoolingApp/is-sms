"use server";

import { parentPost, parentSessionUserId } from "@/services/parentApiBase";

/**
 * The child's login history — POST /dashboard/parent/student-attendance {userId (the parent), studentUserId}.
 * The backend verifies the parent-student mapping (status "0", statusCode E004 "Unauthorized student access").
 * Response: status "1" ok / "3" session out / "0" failed; details (AttendanceDTO) { firstLogin, lastLogin, duration,
 * totalLoginDuretion, loginHistories[] { loginTime, logOutTime, loginLocation, totalLoginDuretion } }
 * ("Duretion" is the backend's spelling). A failed call returns null.
 */
export async function getParentChildLoginHistory({ schoolUUID, studentUserId }) {
  if (!schoolUUID || !studentUserId) return null;
  const userId = await parentSessionUserId();
  if (!userId) return null;
  return parentPost(schoolUUID, "/dashboard/parent/student-attendance", { userId: Number(userId), studentUserId: Number(studentUserId) });
}
