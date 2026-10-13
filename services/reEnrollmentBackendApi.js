"use server";

import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Re-enrollment endpoints (ClientReEnrollmentController.java, is-rest-api):
 *   POST {school}/api/v1/student/re-enrollment/{eligibility,select-option,payment-details,
 *                                                 choose-payment-plan,review,complete}
 * Same envelope as studentSignupBackendApi.js: {payload: base64(JSON)}, identity travels in the payload
 * (`userId`), no cookie forwarding. Business failures are HTTP 200 with their own status/statusCode, so a
 * non-ok response or empty body means infrastructure trouble and resolves to null.
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
  const response = await fetch(await backendUrl(schoolUUID, name), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: encodePayload(data) }),
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

/** {userId} -> nextAction (DASHBOARD | RE_ENROLLMENT), result, feePaid, options[] with steps, resume info. */
export async function getReEnrollmentEligibility(schoolUUID, request) {
  return postPayload(schoolUUID, "eligibility", request);
}

/** {userId, enrollmentType} -> the student's next record is ready; steps + nextStep. */
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
