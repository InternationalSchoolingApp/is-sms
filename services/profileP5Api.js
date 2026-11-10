"use server";

import { backendRequest } from "@/utils/backendRequest";

/**
 * My Profile P5: section 6 (Student School Email Account) and section 7 (Withdrawal Request), as the existing page:
 *   activate   -> {school}/dashboard/create-azure-user                    { userId }
 *   reset pwd  -> {school}/dashboard/reset-azure-password-notify-primary-mail { userId }
 *   withdrawal -> {school}/dashboard/parent/withdrawal-init | -send-otp | -verify-otp | -list | -bank-details
 *                 (withdrawalRequestUser.js; the student uses the "parent" endpoints with studentUserId = self).
 *
 * The user is always the token user (userId / studentUserId never come from the browser). The withdrawal endpoints let
 * any student act on their own enrolment, even one whose parent account should handle it (plan section 19.4 gap #7),
 * so every withdrawal call here first checks student/withdrawal-eligibility (selfEligible) like the page does.
 * Returns { ok, data } or { ok: false, code, message, sessionExpired? }.
 */

const fail = (code, message) => ({ ok: false, code, message });
const isOk = (answer) => String(answer?.status ?? "") === "1";
const legacy = (me) => ({ UNIQUEUUID: me.uniqueId });

async function call(path, body, { header = false, fallback } = {}) {
  const result = await backendRequest({ path, headers: header ? legacy : undefined, buildBody: (me) => body(me) });
  if (!result.ok) return result;
  if (String(result.data?.status) === "3") return { ok: false, sessionExpired: true, code: "SESSION_EXPIRED", message: "Your session has been logged out" };
  if (!isOk(result.data)) return fail(String(result.data?.statusCode || "FAILED"), result.data?.message || result.data?.MESSAGE || fallback);
  return { ok: true, data: result.data };
}

// ---- Section 6 · school e-mail (Microsoft 365) ----

export async function activateSchoolEmail() {
  const r = await call("dashboard/create-azure-user", (me) => ({ userId: me.userId }), { fallback: "Your school user ID could not be activated." });
  if (!r.ok) return r;
  return { ok: true, data: { message: r.data.message || "Your school user ID is ready!" } };
}

export async function resetSchoolEmailPassword() {
  const r = await call("dashboard/reset-azure-password-notify-primary-mail", (me) => ({ userId: me.userId }), { fallback: "The password could not be reset." });
  if (!r.ok) return r;
  return { ok: true, data: { message: r.data.message || "A new password was sent to your primary email." } };
}

// ---- Section 7 · withdrawal ----

async function eligible() {
  const r = await call("dashboard/student/withdrawal-eligibility", () => ({}), { header: true, fallback: "Withdrawal could not be checked." });
  if (!r.ok) return r;
  if (r.data.selfEligible !== true) return fail("NOT_ELIGIBLE", "Your parent or guardian handles withdrawal requests from their account.");
  return { ok: true };
}

const shapeRequest = (req) => ({
  requestId: req.requestId,
  requestNo: req.requestNo || "",
  status: String(req.status || "").toUpperCase(),
  reason: req.reason || "",
  description: req.description || "",
  remarks: req.remarks || "",
  createdDate: req.createdDate || "",
  bank: req.bank || null,
});

/** { student: { studentStringId, studentName, standardName, programName }, reasons: [{ id, reason }], requests, canCreate } */
export async function getWithdrawal() {
  const ok = await eligible();
  if (!ok.ok) return ok;
  const r = await call("dashboard/parent/withdrawal-init", (me) => ({ studentUserId: me.userId }), { header: true, fallback: "Withdrawal details could not be loaded." });
  if (!r.ok) return r;
  return {
    ok: true,
    data: {
      student: r.data.student || {},
      email: r.data.parentEmail || "",
      reasons: (Array.isArray(r.data.reasons) ? r.data.reasons : []).map((x) => ({ id: String(x.id), reason: String(x.reason || "") })),
      requests: (Array.isArray(r.data.requests) ? r.data.requests : []).map(shapeRequest),
      canCreate: r.data.canCreate === true,
    },
  };
}

/** Step 1: create the request and e-mail a code. Returns { requestId, email }. */
export async function startWithdrawal({ reasonId, description } = {}) {
  const text = String(description || "").trim();
  if (!(Number(reasonId) > 0)) return fail("REQUIRED", "Please choose the main reason.");
  if (!text) return fail("REQUIRED", "Please tell us a little more.");
  const ok = await eligible();
  if (!ok.ok) return ok;
  const r = await call(
    "dashboard/parent/withdrawal-send-otp",
    (me) => ({ studentUserId: me.userId, reasonId: Number(reasonId), otherReason: text.slice(0, 2000) }),
    { header: true, fallback: "The code could not be sent." },
  );
  if (!r.ok) return r;
  return { ok: true, data: { requestId: r.data.requestId, email: r.data.email || "" } };
}

/** Step 2: the e-mailed code submits the request. Returns { requestNo }. */
export async function confirmWithdrawal({ requestId, otp } = {}) {
  if (!/^[0-9]{6}$/.test(String(otp || ""))) return fail("BAD_CODE", "Please enter the 6-digit code.");
  const ok = await eligible();
  if (!ok.ok) return ok;
  const r = await call("dashboard/parent/withdrawal-verify-otp", () => ({ requestId: Number(requestId), otp: Number(otp) }), { header: true, fallback: "The code is incorrect." });
  if (!r.ok) return r;
  return { ok: true, data: { requestNo: r.data.requestNo || "" } };
}

const BANK_FIELDS = ["accountHolder", "holderAddress", "postalCode", "phone", "accountNo", "bankName", "branchAddress", "swiftCode"];

/** After approval: the bank account for the refund (only for one of the student's own approved requests). */
export async function submitWithdrawalBank({ requestId, bank } = {}) {
  const values = Object.fromEntries([...BANK_FIELDS, "routingNo"].map((k) => [k, String(bank?.[k] || "").trim().slice(0, 300)]));
  if (BANK_FIELDS.some((k) => !values[k])) return fail("REQUIRED", "Please fill in every bank detail marked *.");
  const current = await getWithdrawal();
  if (!current.ok) return current;
  const own = current.data.requests.find((x) => String(x.requestId) === String(requestId));
  if (!own || own.status !== "ACCEPTED") return fail("NOT_YOURS", "Bank details can only be added to your approved request.");
  const r = await call("dashboard/parent/withdrawal-bank-details", () => ({ requestId: Number(requestId), ...values }), { header: true, fallback: "The bank details could not be saved." });
  if (!r.ok) return r;
  return { ok: true, data: { message: r.data.message || "Bank details submitted." } };
}
