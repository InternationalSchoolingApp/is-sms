import { getHash } from "@/utils/common";

/**
 * Builds the `authentication` envelope every student-enrollment endpoint
 * expects. Centralized here (vs. the 3 inline copies in AccountForm.jsx /
 * useAccountSignup.js / EmailVerificationPanel.jsx, written before Stage 1
 * needed this shape too) so the userId-carrying variant below has one
 * source of truth.
 */
export function buildAuthentication(context) {
  return {
    hash: getHash(),
    schoolId: context.schoolNumericId,
    schoolUUID: context.schoolUUID,
    userType: "STUDENT",
  };
}

/**
 * Same as buildAuthentication(), plus `userId` (Integer, User.id) — required
 * by every endpoint past account creation (save-student-details,
 * save-parent-details, etc.), which resolve "who is this" via
 * Authentication.userId, not the session cookie alone (confirmed at
 * SignupStudentUtil.java:1606, saveStudentDetails). `userId` must come from
 * next-auth's session (session.userId, populated post-login — see
 * app/api/auth/[...nextauth]/route.js) or, for a same-session continuation
 * right after account creation (e.g. Offline/B2B, which skips email
 * verification), from that signup response's own `studentUserId` field.
 */
export function buildAuthenticatedRequest(context, userId) {
  return {
    ...buildAuthentication(context),
    userId,
  };
}
