/**
 * Pure helpers of the parent Withdrawal Request section (legacy withdrawalRequestUser.js): status labels, the
 * request tracker, bank form fields and their checks. No React, no server code.
 */

/** Legacy withdrawalStatusMeta: label, badge tone and the group the tracker uses. */
export function statusMeta(status) {
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
    case "INITIATED":
      return { label: "In Review", tone: "review", group: "review" };
    case "ACCEPTED":
      return { label: "Approved", tone: "approved", group: "approved" };
    case "BANKDETAIL":
      return { label: "Approved · Bank details submitted", tone: "approved", group: "approved" };
    case "TRANSFERRED":
      return { label: "Refund Initiated", tone: "refund", group: "refund" };
    case "REJECTED":
      return { label: "Denied", tone: "denied", group: "denied" };
    case "CHALLENGED":
      return { label: "Challenged", tone: "challenge", group: "challenged" };
    case "CANCELLED":
      return { label: "Cancelled", tone: "denied", group: "cancelled" };
    case "DIRECT_WITHDRAWN":
      return { label: "Withdrawn", tone: "refund", group: "refund" };
    default:
      return { label: String(status || "—"), tone: "review", group: "review" };
  }
}

/** Legacy getWithdrawalTrackerHtml as data: [{ label, state: done|active|pending, kind?: bad }]. */
export function trackerSteps(status) {
  const { group } = statusMeta(status);
  const inReview = ["PENDING", "INITIATED"].includes(String(status || "").toUpperCase());
  const steps = [{ label: "Submitted", state: "done" }, { label: "In Review", state: inReview ? "active" : "done" }];
  if (group === "approved" || group === "refund") {
    steps.push({ label: "Approved", state: "done" });
    steps.push({ label: group === "refund" ? "Refund initiated" : "Refund", state: group === "refund" ? "done" : "active" });
  } else if (group === "denied" || group === "challenged") {
    steps.push({ label: "Denied", state: "done", kind: "bad" });
    if (group === "challenged") steps.push({ label: "Challenged", state: "done" });
  } else {
    steps.push({ label: "Decision", state: "pending" });
  }
  return steps;
}

/** Bank form fields of the legacy form: [key, label, required]. The keys are the backend's request fields. */
export const BANK_FIELDS = [
  ["accountHolder", "Account holder name", true],
  ["holderAddress", "Account holder address", true],
  ["postalCode", "Postal code", true],
  ["phone", "Phone number", true],
  ["accountNo", "Account number", true],
  ["bankName", "Bank name", true],
  ["branchAddress", "Bank branch address", true],
  ["swiftCode", "Bank SWIFT code", true],
  ["routingNo", "ABA / Routing number (if applicable)", false],
];

export const BANK_FIELD_MAX = 200;
export const REASON_MAX = 1000;

/** True when every required bank field has text (legacy withdrawalValidateBank). */
export function bankComplete(values) {
  return BANK_FIELDS.every(([key, , required]) => !required || String(values?.[key] ?? "").trim());
}

/** The bank values as sent: trimmed, only the known keys, each at most BANK_FIELD_MAX characters. */
export function cleanBank(values) {
  const out = {};
  BANK_FIELDS.forEach(([key]) => {
    out[key] = String(values?.[key] ?? "").trim().slice(0, BANK_FIELD_MAX);
  });
  return out;
}

/** The last four characters only ("•••• 1234"); short values are hidden entirely. "" for nothing. */
export function maskTail(value) {
  const v = String(value ?? "").replace(/\s+/g, "");
  if (!v) return "";
  if (v.length <= 4) return "••••";
  return `•••• ${v.slice(-4)}`;
}

/** A 6 digit one-time code. */
export const isOtp = (value) => /^\d{6}$/.test(String(value ?? ""));

/** "AB" from "Asha Bhat" (legacy getWithdrawalChildInitials). */
export function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
