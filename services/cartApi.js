"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Phase C — Buy Extra Classes + Cart (sidebar pageLink `student-addon`). Ports
 * the live legacy flow in is-rest-api (buyExtraClass.js / buyExtraClassContent.js
 * / cartDetail.js / cartDetailContent.js -> ClientDashboardStudentController ->
 * CartUtil). Every endpoint is an existing JSON endpoint under
 * {schoolUUID}/dashboard/...; no backend change.
 *
 * Identity (userId, school) is read from the next-auth session on the server,
 * never taken from the browser: CartUtil trusts the userId in the payload and
 * these calls create book-session rows, apply discounts and raise a payment.
 * For the same reason the amount and booking ids sent to cart-payment are
 * re-read from get-cart-details here instead of trusting the client's copy.
 *
 * Non-2xx / empty / non-JSON responses come back as null.
 */

async function identity() {
  const session = await auth();
  if (!session?.userId || !session?.schoolUUID) return null;
  return { userId: session.userId, schoolUUID: session.schoolUUID, schoolId: session.schoolNumericId };
}

async function sessionCookieHeader() {
  try {
    return (await cookies()).toString();
  } catch {
    return "";
  }
}

async function parseJsonResponse(response) {
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function callBackend(schoolSegment, path, body) {
  const baseUrl = await resolveServerBackendOrigin();
  const response = await fetch(`${baseUrl}/${schoolSegment}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: await sessionCookieHeader() },
    body: JSON.stringify({ payload: encodePayload(body) }),
  });
  return parseJsonResponse(response);
}

async function callDashboard(path, extra = {}) {
  const me = await identity();
  if (!hasBackendOrigin() || !me) return null;
  try {
    return await callBackend(me.schoolUUID, `/dashboard${path}`, { schoolId: me.schoolId, userId: me.userId, ...extra });
  } catch {
    return null;
  }
}

/**
 * Plans screen — POST /dashboard/buy-extra-class (CartUtil.buyExtraClass).
 * statusCode "AY_NOT_STARTED" (sent with status "1") means "show `message`
 * instead of the plans". Otherwise details = { subjects: [{subjectId,
 * subjectName, enrollmentEndDate}], customPlans: [{planId, planName,
 * classCount, validity, singleClassFee, amount, saving}], purchasedItems?,
 * standardId, learningProgram }. The plan named "plan-custom" drives the
 * "Customise your plan" modal; the rest are the fixed plan cards.
 */
export async function getBuyExtraClass() {
  return callDashboard("/buy-extra-class");
}

/**
 * Add to cart / Buy — POST /dashboard/add-to-cart (CartUtil.addToCart). Upserts
 * the BOOK_SESSION row for (subject, plan), the OPEN cart and its line item.
 * subjectId is ignored server-side for elementary grades and SSP.
 */
export async function addPlanToCart({ subjectId, planId, planName, singleClassFee, planAmount, sessionCount, planStartDate, planEndDate }) {
  return callDashboard("/add-to-cart", {
    subjectId,
    planId,
    planName,
    singleClassFee,
    planAmount,
    sessionCount,
    planStartDate,
    planEndDate,
  });
}

/** Header badge — POST /dashboard/get-cart-count -> { cartCount }. */
export async function getCartCount() {
  return callDashboard("/get-cart-count");
}

/**
 * Cart screen — POST /dashboard/get-cart-details -> details = { cartCount,
 * cart: { cartItems: [{cartId, subjectId, subjectName, classCount,
 * planStartDate, planEndDate, planAmount, imgURl}], cartTotal, cpDiscount,
 * discountCode, totalPayAmount, bookSessionIds, errorMsg } }.
 */
export async function getCartDetails() {
  return callDashboard("/get-cart-details");
}

/**
 * Remove one line item — POST /dashboard/update-cart-details with
 * type "remove" (CartUtil.getStudentCartDetails). `cartId` is the line item's
 * cartId (ADD_TO_CART.ID). Same response shape as getCartDetails.
 */
export async function removeCartItem({ cartId }) {
  return callDashboard("/update-cart-details", { type: "remove", bookId: cartId });
}

/**
 * Apply / remove a discount code — POST /dashboard/apply-discount-on-cart.
 * appliedScholarshipCode 1 applies `scholarshipCode`, 2 removes the current
 * one. The fixed fields are what cartDetail.js's applyDiscountOnCart sends.
 */
export async function applyCartDiscount({ scholarshipCode, remove = false }) {
  return callDashboard("/apply-discount-on-cart", {
    requestKey: "APPLY-SCHOLARSHIP",
    paymentMode: "annually",
    scholarshipCode: remove ? "" : scholarshipCode,
    appliedScholarshipCode: remove ? 2 : 1,
    scholarshipFor: "Teacher Assistance",
    learningProgram: "Teacher Assistance",
  });
}

/**
 * CONFIRM AND PAY — POST /dashboard/cart-payment (CartUtil.cartPayment).
 * Creates a SCHEDULED USER_PAYMENT_DETAILS row for the cart total and links the
 * cart's book-session rows to it. Returns details = { userPaymentDetailsId,
 * standardId, planStatus } (planStatus picks the T&C text).
 *
 * The amount and booking ids come from a fresh get-cart-details, not from the
 * caller. A cart whose discount is larger than its total is refused, matching
 * the disabled button in cartDetailContent.js.
 */
export async function createCartPayment() {
  const cartResponse = await getCartDetails();
  const cart = cartResponse?.details?.cart;
  if (cartResponse?.status !== "1" || !cart?.cartItems?.length) {
    return { status: "0", message: "Your cart is empty." };
  }
  if (cart.errorMsg) return { status: "0", message: cart.errorMsg };
  return callDashboard("/cart-payment", {
    amount: String(cart.totalPayAmount),
    bookingIds: cart.bookSessionIds,
  });
}

/**
 * Pay Now (after the T&C) — POST /{schoolUUID}/common/check-payment
 * (ClientCommonPaymentController.checkPayment), as commonPaymentGateway.js's
 * checkPayment() calls it. Success details carry what the gateway options call
 * needs: { upid, schoolId, entityType, entityId, userId }. statusCode
 * "OLD_FEE" / status "0"|"2" carry a `message` to show instead.
 */
export async function checkCartPayment({ userPaymentDetailsId }) {
  const me = await identity();
  if (!hasBackendOrigin() || !me || !userPaymentDetailsId) return null;
  try {
    return await callBackend(me.schoolUUID, "/common/check-payment", { userPaymentDetailsId, schoolId: me.schoolId });
  } catch {
    return null;
  }
}

/**
 * The school's currency — POST /{schoolNumericId}/api/v1/technical
 * (CommonController.getSchoolSettingTechnical), the source of the legacy
 * `schoolSettingsTechnical.currencySymbol` / `currencyIsoCode` globals.
 */
export async function getSchoolCurrency() {
  const me = await identity();
  if (!hasBackendOrigin() || !me?.schoolId) return null;
  try {
    const technical = await callBackend(me.schoolId, "/api/v1/technical", { schoolId: me.schoolId });
    if (!technical) return null;
    return { symbol: technical.currencySymbol || "", isoCode: technical.currencyIsoCode || "" };
  } catch {
    return null;
  }
}
