import { trackRequest } from "@/utils/loaderStore";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveBackendOrigin } from "@/utils/backendOrigin";

/**
 * Thin fetch wrappers, one per confirmed Student Signup backend endpoint.
 * Endpoint paths/behavior confirmed by reading ClientSignupStudentController.java
 * and SignupStudentUtil.java in the is-rest-api repo — do not change the
 * request/response shapes here without re-checking the backend source, since
 * the backend itself is out of scope for this migration.
 *
 * `schoolUUID` is the {schoolId} URL-PATH segment (school UUID/slug) and is
 * now taken as an explicit argument on every call, NOT read from an env
 * var — the real value comes from the URL the user is on
 * (/{schoolId}/student/{enrollmentFor}/{learningProgram}, see
 * app/[enrollmentFor]/[learningProgram]/page.jsx),
 * matching how the JSP app resolves it per-request rather than a single
 * fixed school for the whole deployment.
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
  const baseUrl = resolveBackendOrigin();
  if (!hasBackendOrigin() || (includeSchoolId && !schoolUUID)) {
    throw new Error(
      "A backend origin (NEXT_PUBLIC_BACKEND_BASE_URL) and a schoolUUID are required — schoolUUID must come from the URL, not an env var"
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
  // pass `uniqueId`. Left off otherwise: a custom header forces a CORS preflight when the
  // backend origin differs from this page's.
  const headers = { "Content-Type": "application/json" };
  if (options?.uniqueId) headers.UNIQUEUUID = options.uniqueId;
  return trackRequest(async () => {
    const response = await fetch(backendUrl(schoolUUID, path, options), {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ payload: encodePayload(data) }),
    });
    return parseJsonResponse(response);
  }, options);
}

async function getPayload(schoolUUID, path, params, options) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  return trackRequest(async () => {
    const response = await fetch(backendUrl(schoolUUID, `${path}${query}`, options), {
      method: "GET",
      credentials: "include",
    });
    return parseJsonResponse(response);
  }, options);
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
  return getPayload(schoolUUID, "student/enrollment-stage-status", { uniqueId }, { silent: true });
}

// ClientSignupStudentController.getEnrollmentProcess(): resolves the saved
// enrollment stage and custom-payment override used by the legacy process page.
export function getEnrollmentProcess(schoolUUID, uniqueId) {
  return getPayload(
    schoolUUID,
    `api/v1/student/enrollment/process/${encodeURIComponent(uniqueId)}`,
    null,
    { silent: true }
  );
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

// --- Stage 2: Parent email OTP verification ---
// CommonController.java: send-otp-for-parent-verification / verify-otp.
// Both live under the same {schoolId}/api/v1/common/* prefix as login/captcha,
// not under student/enrollment/* like the other Stage 2 endpoints.
export function sendOtpForParentVerification(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/common/send-otp-for-parent-verification", request);
}

export function verifyParentOtp(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/common/verify-otp", request);
}

// --- Payment gateway (Step 4: Review and Payment "Confirm & Pay") ---
// Both confirmed at ClientCommonPaymentController.java — class-level
// @RequestMapping("{schoolId}") means these DO carry the schoolId path
// segment despite their own mapping strings reading "/common/...".
export function getPaymentGatewayOptions(schoolUUID, request) {
  return postPayload(schoolUUID, "common/payment-gateway/options", request);
}

export function invokePaymentGateway(schoolUUID, request) {
  // Pay Now (client-side gateways): show which URL is hit and with what.
  console.log("[Pay Now] POST", backendUrl(schoolUUID, "common/invoke-payment-gateway"), request);
  return postPayload(schoolUUID, "common/invoke-payment-gateway", request);
}

// logoutConfimation(true, ...common/logout/UNIQUEUUID) in signupStudentStage3.js: the backend drops
// the user's login hash, records the logout and invalidates its HTTP session (found via the session
// cookie, hence credentials: "include"). The 302 to the Java login page is deliberately not followed.
export async function logoutSignup(schoolUUID, uniqueId) {
  await fetch(backendUrl(schoolUUID, `common/logout/${encodeURIComponent(uniqueId)}`), {
    method: "GET",
    credentials: "include",
    redirect: "manual",
  });
}

export function getPaymentPaidStatus(schoolUUID, request) {
  return postPayload(schoolUUID, "common/get-payment-paid-status", request, { silent: true });
}

export function launchPaymentGatewayForm(schoolUUID, payload) {
  const form = document.createElement("form");
  form.method = "GET";
  form.action = backendUrl(schoolUUID, "common/launch-payment-gateway");
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "payload";
  input.value = encodePayload(payload);
  form.appendChild(input);
  // Pay Now (redirect gateways): the browser navigates to this exact URL (GET form -> ?payload=...).
  console.log("[Pay Now] GET", `${form.action}?payload=${encodeURIComponent(input.value)}`, payload);
  document.body.appendChild(form);
  form.submit();
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
export async function uploadPaymentProof(schoolUUID, uniqueId, { file, uploadIndex, uploadCategory, uploadUserId }) {
  const form = new FormData();
  form.append(
    "payload",
    JSON.stringify({ payload: encodePayload({ uploadCategory, uploadUserId, skipSession: true }) })
  );
  form.append(`fileupload${uploadIndex}`, file);
  return trackRequest(async () => {
    const response = await fetch(backendUrl(schoolUUID, `api/upload/${uniqueId}`), {
      method: "POST",
      credentials: "include",
      body: form,
    });
    return parseJsonResponse(response);
  });
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

// Public, pre-auth resolution of the {schoolId} URL slug/UUID into the
// numeric row id/name/WhatsApp number — see PublicSchoolInfoDTO in
// is-rest-api. Used to populate SIGNUP_CONTEXT dynamically instead of the
// old NEXT_PUBLIC_SCHOOL_NUMERIC_ID/NEXT_PUBLIC_SCHOOL_NAME/
// NEXT_PUBLIC_WHATSAPP_NUMBER env vars.
export function getPublicSchoolInfo(schoolUUID) {
  return getPayload(schoolUUID, "api/v1/student/enrollment/public-info");
}

/**
 * Initializes the public enrollment form. Route and request parameters match
 * PaymentResponseApiController.studentEnrollmentSignup():
 * GET /api/v1/{schoolId}/student/{enrollmentFor}/{learningProgram}.
 * Preserve the page query as-is (including repeated keys); the controller
 * reads payload, referralCode, ras, and v from it.
 */
export function getEnrollmentSignupInfo(schoolUUID, learningProgram, params) {
  const baseUrl = resolveBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID are required for enrollment setup");
  }

  const query = new URLSearchParams(params?.toString() || "");
  if (!query.has("ras")) query.set("ras", "N");

  return trackRequest(async () => {
    const response = await fetch(
      `${baseUrl}/api/v1/${encodeURIComponent(schoolUUID)}/student/enrollment/${encodeURIComponent(learningProgram)}?${query.toString()}`,
      { method: "GET", credentials: "include" }
    );
    return parseJsonResponse(response);
  });
}

/**
 * Not JSON — a captcha image. `cacheBust` should change (e.g. Date.now())
 * whenever the visible captcha needs to change, matching refreshCaptcha()'s
 * behavior of reloading the <img> with a new query param.
 */
export function getCaptchaImageUrl(schoolUUID, cacheBust) {
  const baseUrl = resolveBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID (from the URL) are required");
  }
  const color = process.env.NEXT_PUBLIC_CATPCHA_COLOR || "2563eb";
  return `${baseUrl}/${schoolUUID}/api/v1/common/captcha.jpg?payload=${encodeURIComponent(color)}&v=${cacheBust}`;
}
