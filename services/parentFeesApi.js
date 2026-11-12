"use server";

import { parentPost, parentSessionUserId } from "@/services/parentApiBase";

/**
 * BFF for the parent's Fee Details page (server actions, built on services/parentApiBase.js). A failed / empty
 * answer comes back as null, never thrown. The parent is the session user; the backend refuses a child that is
 * not mapped to that parent.
 */

/**
 * The child's fee rows — POST /dashboard/parent/student-fee-details {userId (the parent, from the session), studentUserId}.
 * Response { status "1"|"0"|"3" (3 = session out), message, details } where details (StudentDueFeesDTO) is
 *   { userPaymentDetailsList[], nextUserPaymentDetailsId, paymentType, paymentTitle, isDashboardPaymentAvaileble }
 * and each row { id, status (SUCCESS|PENDING|FAILURE|REJECTED|INITIATED|...), paymentName (may hold <sup> markup),
 * scheduledPayDate, payDate, standardName, paymentTitle (e.g. BOOKSESSION_FEE), paymentTransferType, pgName,
 * recieptLink (sic), totalFeeWithMaterialFee, ... }. details is null/absent when the child has no payment rows.
 */
export async function getParentFeeDetails({ schoolUUID, studentUserId }) {
  if (!schoolUUID || !studentUserId) return null;
  const userId = await parentSessionUserId();
  if (!userId) return null;
  return parentPost(schoolUUID, "/dashboard/parent/student-fee-details", { userId, studentUserId: String(studentUserId) });
}
