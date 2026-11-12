// Pure helpers of the parent's Fee Details (no React, so they can be checked with a plain node script).

export const RETRY_STATUSES = ["PENDING", "FAILURE", "REJECTED"];

/**
 * The last column's action of one fee row — legacy getParentFeeDetailsRowsHtml (parentFeeDetailsContent.js), branch
 * for branch. The row that is next due (nextUserPaymentDetailsId) gets the full set (Pay Now / Change Payment
 * Method); every other unpaid row can only be retried.
 *
 * Returns { receipt: boolean, pay: label | null, notes: string[] }; all empty means an empty cell.
 *   receipt  View Receipt (only SUCCESS rows, and only when the module's viewed right is granted: `canView`)
 *   pay      the button label ("Pay Now" | "Try Again" | "Change Payment Method"), null for no button
 *   notes    plain text beside the button ("Payment in Process", the SCHOOL_ID == 5 "Payment Under Process")
 */
export function feeAction(row, nextId, schoolNumericId, canView) {
  const none = { receipt: false, pay: null, notes: [] };
  const { status, paymentTitle: title, pgName, paymentTransferType: transferType } = row;
  if (status === "SUCCESS") return canView ? { ...none, receipt: true } : none;

  if (nextId != null && row.id === nextId) {
    if (status === "INITIATED" && pgName === "CASH") return none;
    if (RETRY_STATUSES.includes(status) && title !== "EXTENSION_FEE" && title !== "BOOKSESSION_FEE") {
      return { ...none, pay: "Try Again" };
    }
    if (status === "INITIATED" && (transferType == 3 || transferType == 0) && title !== "EXTENSION_FEE") {
      return { ...none, pay: "Try Again" };
    }
    if (status === "INITIATED" && transferType != 3) {
      const result = { ...none, notes: [] };
      if (pgName === "CONVERA") {
        result.notes.push("Payment in Process");
        result.pay = "Change Payment Method";
      }
      // The wire-transfer special case of school 5 (legacy: SCHOOL_ID == 5).
      if (schoolNumericId == 5 && pgName === "WireTransfer") result.notes.push("Payment Under Process");
      return result;
    }
    if (title === "BOOKSESSION_FEE" || title === "EXTENSION_FEE") return none;
    return { ...none, pay: "Pay Now" };
  }

  if (status === "INITIATED" && pgName === "CASH") return none;
  if (RETRY_STATUSES.includes(status) && title !== "TEACHER REQUEST FEE" && title !== "BOOKSESSION_FEE") {
    return { ...none, pay: "Try Again" };
  }
  if (status === "INITIATED" && (transferType == 3 || transferType == 0)) return { ...none, pay: "Try Again" };
  return none;
}

/**
 * The receipt URL of a SUCCESS row, or "" when it is not an absolute http(s) URL (the link comes from the backend;
 * anything else, e.g. a javascript: URL, is never rendered as a link).
 */
export function receiptHref(row) {
  const link = typeof row?.recieptLink === "string" ? row.recieptLink.trim() : "";
  return /^https?:\/\//i.test(link) ? link : "";
}
