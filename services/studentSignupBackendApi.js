import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Thin fetch wrappers, one per confirmed Student Signup backend endpoint.
 * Endpoint paths/behavior confirmed by reading ClientSignupStudentController.java
 * and SignupStudentUtil.java in the is-rest-api repo — do not change the
 * request/response shapes here without re-checking the backend source, since
 * the backend itself is out of scope for this migration.
 *
 * SERVER-ONLY MODULE: imported only by the "use server" wrappers in
 * actions/studentSignupActions.js, so it always runs on the Next.js server,
 * not the browser. No cookies()/next/headers here — per explicit project
 * rule, DO NOT reintroduce `import { cookies } from "next/headers"` or any
 * other cookie-forwarding mechanism into this file. Identity/authorization
 * for these endpoints travels in the request payload itself (the
 * `authentication` envelope and/or an explicit `userId`/`uniqueId`), not a
 * forwarded session cookie.
 *
 * Split out of services/studentSignupApi.js because a Next.js Client
 * Component (AccountCreationForm.jsx) imports a few endpoints from that file
 * directly (no Actions layer — see its own doc comment), and Next's
 * client/server bundling boundary is drawn at the whole-file level: this
 * file still can't be imported by a Client Component (it's reached only via
 * actions/studentSignupActions.js's "use server" boundary), so the split
 * stays even though neither file uses cookies() anymore. The two endpoints
 * that must execute in the browser itself — the captcha <img> URL and the
 * payment-gateway <form> POST/navigation — live in
 * services/studentSignupClientApi.js instead.
 *
 * `schoolUUID` is the {schoolId} URL-PATH segment (school UUID/slug) and is
 * taken as an explicit argument on every call, NOT read from an env var —
 * the real value comes from the URL the user is on.
 *
 * IMPORTANT response-contract quirks (confirmed at source, not guessed):
 *   - save-student-details, save-parent-details, proceed-to-dashboard:
 *     on SUCCESS these do NOT set `statusCode`, only `status`. Callers must
 *     check `status === "1"`, never `statusCode`, for the success path.
 *   - get-student-review-details returns typo'd JSON field names
 *     (`feeSetionTitile`, `isOptedAlternetPaymentMethod`) — consume them
 *     exactly as spelled, they are not a serialization bug to "fix" here.
 *   - eligibleForEdit returns the same statusCode "E001" for three different
 *     failure reasons — distinguish only by the `message` string.
 */

function backendUrl(schoolUUID, path, { includeSchoolId = true } = {}) {
  const baseUrl = resolveServerBackendOrigin();
  if (!hasBackendOrigin() || (includeSchoolId && !schoolUUID)) {
    throw new Error(
      "A backend origin (BACKEND_BASE_URL/NEXT_PUBLIC_BACKEND_BASE_URL) and a schoolUUID are required — schoolUUID must come from the URL, not an env var"
    );
  }
  return includeSchoolId ? `${baseUrl}/${schoolUUID}/${path}` : `${baseUrl}/${path}`;
}

// A non-2xx response, a route that doesn't exist yet, or a backend that's
// simply down can each break naive response.json() two different ways:
// an empty body throws "Unexpected end of JSON input", and Spring's
// default error page (e.g. a 404 for a not-yet-deployed endpoint) is
// itself valid JSON — `{"status":404,"error":"Not Found",...}` — so it
// parses "successfully" into a useless, wrong-shaped object instead of
// throwing at all. Every confirmed endpoint in this app returns 200 with
// its own status/statusCode field even for business-logic failures (see
// the doc comment above), so a non-ok HTTP status here is always
// infrastructure-level (wrong URL, backend down, endpoint missing) —
// treat it the same as an empty body: null, not a fake success value.
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

async function postPayload(schoolUUID, path, data, options) {
  // Legacy's $.ajaxSetup beforeSend sends the session's UNIQUEUUID as a header on every call;
  // a few payment endpoints read it (e.g. common/offline-payment), so callers that need it
  // pass `uniqueId`.
  const headers = { "Content-Type": "application/json" };
  if (options?.uniqueId) headers.UNIQUEUUID = options.uniqueId;
  const response = await fetch(backendUrl(schoolUUID, path, options), {
    method: "POST",
    headers,
    body: JSON.stringify({ payload: encodePayload(data) }),
  });
  return parseJsonResponse(response);
}

async function getPayload(schoolUUID, path, params, options) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  const response = await fetch(backendUrl(schoolUUID, `${path}${query}`, options));
  return parseJsonResponse(response);
}

// --- Stage 1: Student Details ---
export function saveStudentDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/save-student-details", request);
}

export function getStudentDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/get-student-details", request);
}

// --- Common masters (country/state/city cascading dropdowns) ---
// {schoolId}/api/v1/common/masters — confirmed against MastersController.java
// (resolveOneMaster()). requestKey values confirmed against SeriConstant.java:
// COUNTRY_LIST_KEY="COUNTRIES-LIST", STATE_LIST_KEY="STATES-LIST",
// CITY_LIST_KEY="CITIES-LIST". Response items are MasterDTO {key, value, ...}
// under response.mastersData.{countries,states,cities}.
export function getMasters(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/common/masters", request);
}

export function getCountries(schoolUUID, authentication) {
  return getMasters(schoolUUID, { authentication, requestData: { requestKey: "COUNTRIES-LIST" } });
}

export function getStates(schoolUUID, authentication, countryId) {
  return getMasters(schoolUUID, { authentication, requestData: { requestKey: "STATES-LIST", requestValue: String(countryId) } });
}

export function getCities(schoolUUID, authentication, stateId) {
  return getMasters(schoolUUID, { authentication, requestData: { requestKey: "CITIES-LIST", requestValue: String(stateId) } });
}

// --- Stage 2: Parent Details ---
export function saveParentDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/save-parent-details", request);
}

export function getParentDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/get-parent-details", request);
}

// --- Stage 3: Course / Grade + Payment Plan ---
export function chooseCoursesByGrade(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/course-details-by-standard-id", request);
}

export function choosePaymentPlan(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/choose-payment-plan", request);
}

export function getPaymentDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/get-payment-details", request);
}

export function getRecommendedCourses(schoolUUID, request) {
  return postPayload(schoolUUID, "student/recommended-courses", request);
}

// --- Review & Submission ---
export function getStudentReviewDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/get-student-review-details", request);
}

export function submitApplication(schoolUUID, request) {
  return postPayload(schoolUUID, "student/submit-application", request);
}

export function proceedToDashboard(schoolUUID, request) {
  return postPayload(schoolUUID, "student/proceed-to-dashboard", request);
}

// --- Stage resume / polling ---
export function getSignupStageStatus(schoolUUID, uniqueId) {
  return getPayload(schoolUUID, "student/enrollment-stage-status", { uniqueId });
}

// --- Document upload ---
// CONFIRMED QUIRK: these 4 endpoints are mapped WITHOUT the {schoolId} path
// segment in ClientSignupStudentController (unlike every other endpoint in
// this file) — includeSchoolId:false replicates that exactly. Do not "fix"
// this to match the others; it would 404 against the real backend. schoolUUID
// is still accepted (for signature consistency with the rest of this file)
// but intentionally unused in the URL.
export function saveStudentEnrollmentDocuments(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/save-documents", request, { includeSchoolId: false });
}

export function verifyStudentEnrollmentDocuments(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/verify-documents", request, { includeSchoolId: false });
}

export function getStudentEnrollmentDocuments(schoolUUID, payload) {
  return getPayload(schoolUUID, "student/enrollment/get-documents", { payload }, { includeSchoolId: false });
}

export function getStudentEnrollmentDocumentsStatus(schoolUUID, payload) {
  return getPayload(schoolUUID, "student/enrollment/get-documents-status", { payload }, { includeSchoolId: false });
}

// --- Payment gateway (Step 4: Review and Payment "Confirm & Pay") ---
// Both confirmed at ClientCommonPaymentController.java — class-level
// @RequestMapping("{schoolId}") means these DO carry the schoolId path
// segment despite their own mapping strings reading "/common/...".
export function getPaymentGatewayOptions(schoolUUID, request) {
  return postPayload(schoolUUID, "common/payment-gateway/options", request);
}

export function invokePaymentGateway(schoolUUID, request) {
  return postPayload(schoolUUID, "common/invoke-payment-gateway", request);
}

// logoutConfimation(true, ...common/logout/UNIQUEUUID) in signupStudentStage3.js: the backend drops
// the user's login hash, records the logout and invalidates its HTTP session (found via the
// forwarded session cookie). The 302 to the Java login page is deliberately not followed.
export async function logoutSignup(schoolUUID, uniqueId) {
  await fetch(backendUrl(schoolUUID, `common/logout/${encodeURIComponent(uniqueId)}`), {
    method: "GET",
    redirect: "manual",
  });
}

export function getPaymentPaidStatus(schoolUUID, request) {
  return postPayload(schoolUUID, "common/get-payment-paid-status", request);
}

// {schoolId}/api/v1/common-script-variables — the endpoint behind legacy getCommonCustomScript():
// returns the page-wide script globals, including LOCATION_SERVICE_BYPASS (boolean) and
// DEFAULT_LOCATION (a JSON string), i.e. the two flags getPayerCountryCodePromise() reads.
export function getCommonScriptVariables(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/common-script-variables", request);
}

// Offline payments (CASH / WIRETRANSFER) — callOfflinePayment() in commonPaymentGateway.js:
// {schoolId}/common/offline-payment, with the UNIQUEUUID header the controller reads.
export function submitOfflinePayment(schoolUUID, uniqueId, request) {
  return postPayload(schoolUUID, "common/offline-payment", request, { uniqueId });
}

// Proof-of-payment upload — bindFileUploadNew1() in jquery.commonFunction.js: multipart POST to
// {schoolId}/api/upload/{UNIQUEUUID}; the `payload` form field carries the encoded
// { uploadCategory, uploadUserId, skipSession } (getFinalValue() shape) and the file goes under
// the input's name (`fileupload<index>`). Resolves to { status, message, uploadFiles:[{fileName}] }.
// Server Actions accept File/FormData arguments directly, so the caller can
// build this same FormData shape without any browser-only API.
export async function uploadPaymentProof(schoolUUID, uniqueId, { file, uploadIndex, uploadCategory, uploadUserId }) {
  const form = new FormData();
  form.append(
    "payload",
    JSON.stringify({ payload: encodePayload({ uploadCategory, uploadUserId, skipSession: true }) })
  );
  form.append(`fileupload${uploadIndex}`, file);
  const response = await fetch(backendUrl(schoolUUID, `api/upload/${uniqueId}`), {
    method: "POST",
    body: form,
  });
  return parseJsonResponse(response);
}

// Airwallex's selectable payment methods, shown once common/payment-gateway/options lists
// "Airwallex" — getAirwallexMethods() in commonPaymentGateway.js. A plain GET (not the
// encoded-payload POST): schoolId (the gateway's school id) and countryCode travel as
// base64 query params, and the controller mapping carries the {schoolId} path segment
// like the other ClientCommonPaymentController routes.
export function getAirwallexPaymentMethods(schoolUUID, schoolIdOfPaymentGateway, countryCode) {
  return getPayload(schoolUUID, "get-airwallex-payment-methods", {
    schoolId: btoa(String(schoolIdOfPaymentGateway)),
    countryCode: btoa(countryCode || ""),
  });
}

// --- Misc ---
export function eligibleForEdit(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/eligbile-for-edit", request);
}

export function resendCredentials(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/resend-credentiala", request);
}

export function getEnrollmentsGrades(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/get-enrollments-grades", request);
}

export function saveCopyLink(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/save-copy-link", request);
}

export function getStudentCommissionPayBy(schoolUUID, request) {
  return postPayload(schoolUUID, "student/enrollment/get-commission-pay-by", request);
}

// --- Account creation (Online + Offline/B2B) ---
export function signupStage1(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/student/enrollment/stage-1", request);
}

export function checkEmailAvailability(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/common/is-user-available", request);
}

export function resendEmailVerification(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/common/resend-email-verification", request);
}

export function verifyReferralCode(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/common/verify-referral", request);
}
