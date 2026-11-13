"use server";

import { backendRequest } from "@/utils/backendRequest";

/**
 * Contact check (is-rest-api ContactCheckController, {school}/dashboard/contact-check/*): the student's failing
 * email / mobile / WhatsApp, fixed or proved with a 6-digit code. The person is always the signed-in user, taken
 * by the backend from the token (utils/backendRequest.js) - no user id is sent, so buildBody ignores the session.
 *
 * The backend answers { status: "1" ok | "0" refused | "2" error, message, data }. Each action returns
 *   { ok: true, data }                                  status "1"
 *   { ok: false, refused: true, message, data }         status "0": the server's own message, and what it sent with
 *                                                       the refusal (e.g. { mandatory: true, laterLeft: 0 } from "later")
 *   { ok: false, refused: false, message, sessionExpired? }   status "2", no answer, signed out
 * The flow that reads these is utils/contactCheckFlow.js.
 */

const ERROR_MESSAGE = "This could not be done just now. Please try again in a minute.";

async function post(name, request = {}) {
  const result = await backendRequest({ path: `dashboard/contact-check/${name}`, buildBody: () => request });
  if (!result.ok) return { ok: false, refused: false, code: result.code, message: result.message || ERROR_MESSAGE, sessionExpired: result.sessionExpired === true };
  const answer = result.data;
  const status = String(answer?.status ?? "");
  if (status === "1") return { ok: true, data: answer.data || {} };
  const refused = status === "0";
  return { ok: false, refused, code: refused ? "REFUSED" : "ERROR", message: answer?.message || ERROR_MESSAGE, data: (refused && answer?.data) || {} };
}

const text = (value, max) => (value === null || value === undefined ? "" : String(value).slice(0, max));
const ACTIONS = ["CHANGE", "CONFIRM", "ALTERNATE"];
const action = (value) => (ACTIONS.includes(value) ? value : "");
const reviewId = (value) => Number(value) || 0;

/** { enabled, items: [{ id, channel, value, isdCode, reason, lastFailedAt, laterLeft, mandatory, canAddAlternate, about }], appInstalled } */
export async function loadPendingContactChecks() {
  return post("pending");
}

/** value / isdCode for CHANGE and ALTERNATE; CONFIRM uses the stored value. -> { sentTo, channel } */
export async function sendContactCheckCode({ reviewId: id, action: act, value, isdCode } = {}) {
  return post("send-code", { reviewId: reviewId(id), action: action(act), value: text(value, 150), isdCode: text(isdCode, 6) });
}

/** -> { status } */
export async function verifyContactCheckCode({ reviewId: id, action: act, value, isdCode, code, alsoMobile } = {}) {
  return post("verify", {
    reviewId: reviewId(id),
    action: action(act),
    value: text(value, 150),
    isdCode: text(isdCode, 6),
    code: text(code, 6).replace(/\D/g, ""),
    alsoMobile: alsoMobile === true,
  });
}

export async function stopContactCheckWhatsapp({ reviewId: id } = {}) {
  return post("no-whatsapp", { reviewId: reviewId(id) });
}

/** -> { laterLeft, mandatory }; refused with data { mandatory: true, laterLeft: 0 } when the skips are used up. */
export async function skipContactCheck({ reviewId: id } = {}) {
  return post("later", { reviewId: reviewId(id) });
}
