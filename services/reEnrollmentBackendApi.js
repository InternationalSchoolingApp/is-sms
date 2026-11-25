"use server";

import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { withSmsAuth } from "@/lib/auth/session";

/**
 * Re-enrollment endpoints (ClientReEnrollmentController.java, is-rest-api):
 *   POST {school}/api/v1/student/re-enrollment/{eligibility,select-option,payment-details,
 *                                                 choose-payment-plan,review,complete,documents,documents-uploaded}
 * Same envelope as studentSignupBackendApi.js: {payload: base64(JSON)}. The payload's `userId` selects the
 * student; the signed-in bearer token authenticates the caller. No browser session cookie is forwarded.
 * Business failures are HTTP 200 with their own status/statusCode, so a non-ok response or empty body means
 * infrastructure trouble and resolves to null.
 *
 * Course selection is NOT here: the screen reuses the enrollment's course-details-by-standard-id
 * (studentSignupBackendApi.chooseCoursesByGrade) with callFrom "dashboard" / requestFromMigration "Y".
 */

// resolveServerBackendOrigin() is async (it can read the backend-override cookie), same as in studentSignupBackendApi.js.
async function backendUrl(schoolUUID, name) {
  const baseUrl = await resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin (BACKEND_BASE_URL/NEXT_PUBLIC_BACKEND_BASE_URL) and a schoolUUID are required");
  }
  return `${baseUrl}/${schoolUUID}/api/v1/student/re-enrollment/${name}`;
}

async function postPayload(schoolUUID, name, data) {
  const url = await backendUrl(schoolUUID, name);
  const response = await fetch(url, await withSmsAuth({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: encodePayload(data) }),
  }));
  if (!response.ok) {
    console.error(`[re-enrollment-api] ${response.status} for POST ${url}`);
    return null;
  }
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** {userId} -> nextAction (DASHBOARD | RE_ENROLLMENT), result, feePaid, options[] with steps, resume info. */
export async function getReEnrollmentEligibility(schoolUUID, request) {
  return postPayload(schoolUUID, "eligibility", request);
}

/** {userId, enrollmentType, learningProgram} -> the student's next record is ready; steps + nextStep. */
export async function selectReEnrollmentOption(schoolUUID, request) {
  return postPayload(schoolUUID, "select-option", request);
}

/** {userId} -> fee plans/amounts (same shape as enrollment get-payment-details). */
export async function getReEnrollmentPaymentDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "payment-details", request);
}

/** {userId, paymentMode} -> userPaymentDetailsId. */
export async function chooseReEnrollmentPaymentPlan(schoolUUID, request) {
  return postPayload(schoolUUID, "choose-payment-plan", request);
}

/** {userId} -> student, course, fee and the pending payment (paymentRequired + gateway ids). */
export async function getReEnrollmentReview(schoolUUID, request) {
  return postPayload(schoolUUID, "review", request);
}

/** {userId} -> finishes the re-enrollment when nothing is left to pay. */
export async function completeReEnrollment(schoolUUID, request) {
  return postPayload(schoolUUID, "complete", request);
}

/** {userId} -> the latest successful grade-fee payment of the next record (payment success page of a payment made elsewhere). */
export async function getReEnrollmentThankYou(schoolUUID, request) {
  return postPayload(schoolUUID, "thank-you", request);
}

/**
 * {userId} -> the "Download your transcript" card of the option screen: available, gradeName, result, transcript /
 * diploma links (only when available) and blockers[] (TRANSCRIPT_ON_HOLD, DOCUMENTS_PENDING, DOCUMENTS_UNDER_VERIFICATION, NOT_AVAILABLE).
 * Called only on the option screen, never polled; an old backend without the endpoint answers 404 -> null (card hidden).
 */
export async function getReEnrollmentDocuments(schoolUUID, request) {
  return postPayload(schoolUUID, "documents", request);
}

/**
 * {userId} -> after the student's last missing mandatory document is uploaded on the card: the backend marks the documents
 * as under verification (the documents answer then carries DOCUMENTS_UNDER_VERIFICATION) and sends the support mail.
 * Idempotent: {status "1", statusCode "S001", requested, alreadyRequested}; "3" session out, "0"/E004, "0"/E005 (not all
 * documents uploaded). Fire-and-forget from the card: any failure (404 old backend, network, no backend origin) -> null.
 */
export async function notifyReEnrollmentDocumentsUploaded(schoolUUID, request) {
  try {
    return await postPayload(schoolUUID, "documents-uploaded", request);
  } catch (error) {
    console.error("[re-enrollment-api] documents-uploaded failed", error);
    return null;
  }
}
