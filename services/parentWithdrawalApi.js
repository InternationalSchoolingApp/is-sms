"use server";

import { parentPost, parentSessionUserId } from "@/services/parentApiBase";
import { BANK_FIELDS, REASON_MAX, bankComplete, cleanBank, isOtp, maskTail } from "@/components/parent/profile/withdrawalModel";

/**
 * Parent > My Profile > Withdrawal Request (legacy withdrawalRequestUser.js). Endpoints under /dashboard/parent/,
 * all POST with { payload } and answered as { status: "1" ok | "0" failed, message, ... } (ClientWithdrawalRequestParentController).
 * A session that ended comes back as status "0" with the message "Your session has been timed out, please login
 * again" (status "3" from the shared filter is read as well). The backend itself checks, with the SESSION user, that
 * the child (or the child of the request) is linked to the parent (PARENT_STUDENT_MAPPING) and answers "This student
 * is not linked to your account."; for the calls that name a child this file checks it first as well, against the
 * parent's own children list. Nothing here ever logs a payload; the one-time code and the bank details only travel
 * to the backend. Every function returns a plain answer and never throws:
 *   { ok: true, ...fields } / { ok: false, message, sessionOut? }, or null when the call itself failed.
 */

const GENERIC = "Something went wrong. Please try again.";
const SESSION_OUT = /session.*(timed out|expired|logged out)/i;
const str = (value) => (value == null ? "" : String(value));

function sessionOutOf(answer) {
  return String(answer?.status) === "3" || SESSION_OUT.test(str(answer?.message));
}

/** { ok:false, sessionOut } / { ok:false, message } / null (no answer) for an unusable backend answer; else undefined. */
function unusable(answer) {
  if (!answer || typeof answer !== "object") return { ok: false, message: GENERIC };
  if (sessionOutOf(answer)) return { ok: false, sessionOut: true, message: "Your session has been logged out" };
  return undefined;
}

async function ownsChild(schoolUUID, parentUserId, studentUserId) {
  const gate = await parentPost(schoolUUID, "/dashboard/parent/get-students-by-parent", { userId: Number(parentUserId) });
  const children = Array.isArray(gate?.studentBasicDetails) ? gate.studentBasicDetails : [];
  return children.some((child) => String(child.userId) === String(studentUserId));
}

/** Common start of the calls that name a child: the session parent, a numeric child id, and the ownership check. */
async function startForChild(schoolUUID, studentUserId) {
  const parentUserId = await parentSessionUserId();
  if (!parentUserId) return { fail: { ok: false, sessionOut: true, message: "Your session has been logged out" } };
  const id = Number(studentUserId);
  if (!Number.isInteger(id) || id <= 0) return { fail: { ok: false, message: "Please choose a child." } };
  if (!(await ownsChild(schoolUUID, parentUserId, id))) return { fail: { ok: false, message: "This student is not linked to your account." } };
  return { parentUserId, studentUserId: id };
}

/**
 * One request row as shown: { requestId, requestNo, status (PENDING | INITIATED | ACCEPTED | BANKDETAIL | TRANSFERRED |
 * REJECTED | CHALLENGED | CANCELLED | DIRECT_WITHDRAWN), reason, description, createdDate, statusDate, remarks,
 * refundAmount, bank }. The bank block keeps only what the page shows: holder, bank name, branch, SWIFT, and the
 * account / routing numbers reduced to their last four characters (the full numbers are never sent back to the
 * browser; the address, postal code and phone the parent typed are not either).
 */
function mapRequest(row) {
  const r = row && typeof row === "object" ? row : {};
  const b = r.bank && typeof r.bank === "object" ? r.bank : null;
  return {
    requestId: r.requestId ?? null,
    requestNo: str(r.requestNo),
    status: str(r.status),
    reason: str(r.reason),
    description: str(r.description),
    createdDate: str(r.createdDate),
    statusDate: str(r.statusDate),
    remarks: str(r.remarks),
    refundAmount: str(r.refundAmount),
    bank: b
      ? {
          accountHolder: str(b.accountHolder),
          bankName: str(b.bankName),
          branchAddress: str(b.branchAddress),
          swiftCode: str(b.swiftCode),
          accountNoMasked: maskTail(b.accountNo),
          routingNoMasked: maskTail(b.routingNo),
        }
      : null,
  };
}

/**
 * Opens one child: POST /dashboard/parent/withdrawal-init { studentUserId }. Response: status "1", student
 * { userId, studentName, studentStringId, standardName, programName }, parentEmail, reasons [{ id, reason }],
 * requests [RequestView], canCreate (false while a request is in progress). status "0" + "This student is not linked to
 * your account." for a child that is not theirs. Returns { ok, student, reasons, requests, canCreate }.
 */
export async function getParentWithdrawal({ schoolUUID, studentUserId }) {
  const start = await startForChild(schoolUUID, studentUserId);
  if (start.fail) return start.fail;
  const answer = await parentPost(schoolUUID, "/dashboard/parent/withdrawal-init", { studentUserId: start.studentUserId });
  const bad = unusable(answer);
  if (bad) return answer ? bad : null;
  if (String(answer.status) !== "1") return { ok: false, message: str(answer.message) || "Unable to load withdrawal details." };
  const s = answer.student && typeof answer.student === "object" ? answer.student : {};
  return {
    ok: true,
    student: {
      studentName: str(s.studentName),
      studentStringId: str(s.studentStringId),
      standardName: str(s.standardName),
      programName: str(s.programName),
    },
    reasons: (Array.isArray(answer.reasons) ? answer.reasons : []).map((x) => ({ id: x?.id ?? null, reason: str(x?.reason) })),
    requests: (Array.isArray(answer.requests) ? answer.requests : []).map(mapRequest),
    canCreate: answer.canCreate === true,
  };
}

/** Refreshes the requests of one child: POST /dashboard/parent/withdrawal-list { studentUserId }. Returns { ok, requests, canCreate }. */
export async function listParentWithdrawals({ schoolUUID, studentUserId }) {
  const start = await startForChild(schoolUUID, studentUserId);
  if (start.fail) return start.fail;
  const answer = await parentPost(schoolUUID, "/dashboard/parent/withdrawal-list", { studentUserId: start.studentUserId });
  const bad = unusable(answer);
  if (bad) return answer ? bad : null;
  if (String(answer.status) !== "1") return { ok: false, message: str(answer.message) || "Unable to load withdrawal requests." };
  return { ok: true, requests: (Array.isArray(answer.requests) ? answer.requests : []).map(mapRequest), canCreate: answer.canCreate === true };
}

/**
 * Step 1 of a request: POST /dashboard/parent/withdrawal-send-otp { studentUserId, reasonId, otherReason }. The backend
 * saves a draft request (hidden until verified) and e-mails a 6 digit code to the parent (valid 10 minutes, 5 wrong
 * tries). Response: status "1" + requestId + email (the parent's own e-mail), or "0" + message ("There is already a
 * withdrawal request in progress for this student.", ...). Returns { ok, message, requestId, email }.
 */
export async function sendParentWithdrawalOtp({ schoolUUID, studentUserId, reasonId, description }) {
  const start = await startForChild(schoolUUID, studentUserId);
  if (start.fail) return start.fail;
  const reason = Number(reasonId);
  const text = str(description).trim();
  if (!Number.isInteger(reason) || reason <= 0 || !text) return { ok: false, message: "Please select a reason and add a description." };
  if (text.length > REASON_MAX) return { ok: false, message: `The description can be at most ${REASON_MAX} characters.` };
  const answer = await parentPost(schoolUUID, "/dashboard/parent/withdrawal-send-otp", { studentUserId: start.studentUserId, reasonId: reason, otherReason: text });
  const bad = unusable(answer);
  if (bad) return answer ? bad : null;
  if (String(answer.status) !== "1") return { ok: false, message: str(answer.message) || "Unable to send OTP." };
  return { ok: true, message: str(answer.message), requestId: answer.requestId ?? null, email: str(answer.email) };
}

/**
 * Step 2: POST /dashboard/parent/withdrawal-verify-otp { requestId, otp }. The backend finds the request, checks it
 * belongs to one of the parent's children, then the code. Response: status "1" + requestNo (reference) + email, or "0"
 * + message ("The OTP is incorrect. Please try again.", expired, too many tries, already confirmed). The code is
 * only sent on, never kept or logged. Returns { ok, message, requestNo, email }.
 */
export async function verifyParentWithdrawalOtp({ schoolUUID, requestId, otp }) {
  const parentUserId = await parentSessionUserId();
  if (!parentUserId) return { ok: false, sessionOut: true, message: "Your session has been logged out" };
  const id = Number(requestId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Invalid request." };
  if (!isOtp(otp)) return { ok: false, message: "Please enter the 6-digit code." };
  const answer = await parentPost(schoolUUID, "/dashboard/parent/withdrawal-verify-otp", { requestId: id, otp: String(otp) });
  const bad = unusable(answer);
  if (bad) return answer ? bad : null;
  if (String(answer.status) !== "1") return { ok: false, message: str(answer.message) || "The OTP is incorrect." };
  return { ok: true, message: str(answer.message), requestNo: str(answer.requestNo), email: str(answer.email) };
}

/**
 * Refund bank details of an approved request: POST /dashboard/parent/withdrawal-bank-details { requestId,
 * accountHolder, holderAddress, postalCode, phone, accountNo, bankName, branchAddress, swiftCode, routingNo }. The backend
 * checks the request is the parent's child's and ACCEPTED, then saves (status becomes BANKDETAIL). Response: status
 * "1" + message, or "0" + message. Required fields are checked here as in the legacy form; values are trimmed and
 * capped. Returns { ok, message }.
 */
export async function submitParentWithdrawalBank({ schoolUUID, requestId, bank }) {
  const parentUserId = await parentSessionUserId();
  if (!parentUserId) return { ok: false, sessionOut: true, message: "Your session has been logged out" };
  const id = Number(requestId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Request ID is required." };
  if (!bankComplete(bank)) return { ok: false, message: "Please fill in all the required bank details." };
  const values = cleanBank(bank);
  if (BANK_FIELDS.some(([key, , required]) => required && !values[key])) return { ok: false, message: "Please fill in all the required bank details." };
  const answer = await parentPost(schoolUUID, "/dashboard/parent/withdrawal-bank-details", { requestId: id, ...values });
  const bad = unusable(answer);
  if (bad) return answer ? bad : null;
  if (String(answer.status) !== "1") return { ok: false, message: str(answer.message) || "Unable to submit bank details." };
  return { ok: true, message: str(answer.message) || "Bank details submitted." };
}
