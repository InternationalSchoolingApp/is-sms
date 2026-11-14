"use server";

import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Reserve a seat / re-enroll for the next grade — legacy reserveSeat.js (getReserveASeatForNextGrade /
 * acceptReserveASeatForNextGrade) -> ClientDashboardStudentController -> ReserveASeatUtil.
 *
 * The student is taken from the signed-in session, never from the browser. Non-2xx / empty / non-JSON answers
 * come back as null (the dashboard then simply shows nothing, like the legacy error branch).
 */

async function identity() {
  const session = await getAccountSession();
  if (!session?.userId || !session?.schoolUUID) return null;
  return { userId: session.userId, schoolUUID: session.schoolUUID };
}

async function post(schoolUUID, path, body) {
  const baseUrl = await resolveServerBackendOrigin();
  const response = await fetch(`${baseUrl}/${schoolUUID}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...serviceKeyHeaders(), ...(await smsAuthHeaders()) },
    body: JSON.stringify({ payload: encodePayload(body) }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * POST /dashboard/eligible-for-ras-for-next-grade. Answer: { status, statusCode, message, details?: { userId,
 * eligibleFor: "ADV" | "BAE", monthName, activeSessionYear, planDiscount, progressionDiscount, addtionalDiscount,
 * progressionDiscountDueDate }, eligible: "Y" | "N", timeInterval, durationTime, standardId }.
 */
export async function getReserveSeatEligibility() {
  const me = await identity();
  if (!me || !hasBackendOrigin()) return null;
  try {
    return await post(me.schoolUUID, "/dashboard/eligible-for-ras-for-next-grade", { userId: me.userId });
  } catch {
    return null;
  }
}

/**
 * POST /dashboard/accept-ras-for-next-grade (creates the advance-fee row when needed). Answer details: { eligibleFor,
 * grade, credits, learningProgram, courseFee, payableFee, planDiscount, progressionDiscount,
 * eligibleForProgressionDiscount, addtionalDiscount, monthName, activeSessionYear, userPaymentDetailsId }.
 */
export async function acceptReserveSeat() {
  const me = await identity();
  if (!me || !hasBackendOrigin()) return null;
  try {
    return await post(me.schoolUUID, "/dashboard/accept-ras-for-next-grade", { userId: me.userId });
  } catch {
    return null;
  }
}
