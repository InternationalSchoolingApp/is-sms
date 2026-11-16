"use server";

import { getAccountSession, withServiceKey, withSmsAuth } from "@/lib/auth/session";
import { isRecaptchaRequired, verifyRecaptcha } from "@/lib/recaptcha";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

// The action the teacher sign-up form's reCAPTCHA token is minted for (components/teacher-registration/TeacherAccountForm.jsx).
const TEACHER_SIGNUP_RECAPTCHA_ACTION = "teacher_signup";

async function backendUrl(schoolUUID, path) {
  const baseUrl = await resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error(
      "A backend origin (BACKEND_BASE_URL/NEXT_PUBLIC_BACKEND_BASE_URL) and a schoolUUID are required — schoolUUID must come from the URL, not an env var"
    );
  }
  return `${baseUrl}/${schoolUUID}/${path}`;
}

// A non-2xx / empty / non-JSON answer is null, not a thrown error: callers treat "unknown" and "failed" the
// same way (stay on the page), same convention as services/studentSignupApi.js.
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

/**
 * CONFIGURATION/TEACHER_REGISTRATION_VIA_NEXTJS — the switch the backend branches on
 * (CommonUtil#isTeacherRegistrationViaNextjs): true = teachers register through this Next.js wizard, false =
 * through the legacy JSP one. Only the literal "true" counts on the backend. Here: true / false when the backend
 * says so, null when the answer is empty or unknown (setting missing, backend down), and callers only switch to
 * the legacy flow on an explicit false — "unknown" must never bounce a teacher between the two flows.
 */
export async function isTeacherRegistrationViaNextjs(schoolUUID) {
  const query = "metaType=CONFIGURATION&metaKey=TEACHER_REGISTRATION_VIA_NEXTJS";
  const response = await fetch(await backendUrl(schoolUUID, `api/v1/get-setting?${query}`), withServiceKey());
  const body = await parseJsonResponse(response);
  const metaValue = String(body?.data?.metaValue ?? "").trim().toLowerCase();
  if (metaValue === "true") return true;
  if (metaValue === "false") return false;
  return null;
}

/**
 * Where the signed-in teacher belongs in the wizard: GET {schoolId}/api/v1/teacher/registration/process/{uniqueId}
 * (ClientSignupTeacherController#teacherRegistrationProcess). The backend answers
 *   { status, statusCode, message, firstReset, signupPage, wizardStep (1-6),
 *     state: "FORM" | "LOCKED" | "REDIRECT", lockReason, redirectUri }
 * and status "3" (SESSIONOUT) when the token's teacher is not this uniqueId. The call carries the tab's SMS bearer
 * token, which is how the backend knows the caller is this teacher.
 */
export async function getTeacherRegistrationProcess(schoolUUID, uniqueId) {
  const response = await fetch(
    await backendUrl(schoolUUID, `api/v1/teacher/registration/process/${encodeURIComponent(uniqueId)}`),
    await withSmsAuth({ cache: "no-store" })
  );
  return parseJsonResponse(response);
}

/**
 * POST with the backend's `{ payload: base64(encodeURI(JSON)) }` envelope. The call carries the service key and,
 * when a teacher is signed in, their SMS bearer token (withSmsAuth), so the same helper serves the public landing
 * page (no session yet) and the signed-in steps. null on a non-2xx / empty / non-JSON answer.
 */
async function postPayload(schoolUUID, path, data) {
  const response = await fetch(
    await backendUrl(schoolUUID, path),
    await withSmsAuth({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: encodePayload(data) }),
      cache: "no-store",
    })
  );
  return parseJsonResponse(response);
}

/**
 * Is this e-mail free to register? POST api/v1/common/is-user-available (CommonUtil#isUserAvailable). status "1" =
 * available (statusCode 0002; `emailVerified` false = the deliverability check could not confirm the address);
 * otherwise statusCode 0044/0043/02 = already registered / not verified / declined, 0042 = deleted. Public: the
 * request needs a visitor token or the service key, which withSmsAuth sends.
 */
export async function checkTeacherEmailAvailability(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/common/is-user-available", request);
}

/**
 * Teacher account creation, stage 1: POST api/v1/teacher/enrollment/stage-1. In production the reCAPTCHA token the
 * form minted for "teacher_signup" is verified here first (the backend skips its own check when the Next.js flow is
 * on, see lib/recaptcha.js). Success is { status: "1", redirectUrl, emailVerified }; failures are status "0" with a
 * statusCode (0001 = already registered, E001/E002/0110-0123/0041 = invalid input).
 */
export async function teacherSignupStage1(schoolUUID, request, recaptchaToken) {
  if (isRecaptchaRequired()) {
    const verified = await verifyRecaptcha(recaptchaToken, TEACHER_SIGNUP_RECAPTCHA_ACTION);
    if (!verified) {
      return {
        status: "0",
        statusCode: "RECAPTCHA_FAILED",
        message: "We couldn't verify your request. Please try again.",
      };
    }
  }
  return postPayload(schoolUUID, "api/v1/teacher/enrollment/stage-1", request);
}

/**
 * Step 1 prefill: POST teacher/signup/get-teacher-basic-details with { userId } (it must be the signed-in teacher's
 * own id, otherwise the backend answers 403 and this returns null). Success carries details.teacher with the ids at
 * 0 and the text fields "" when nothing is saved yet; `dob` is "yyyy-MM-dd" or "".
 */
export async function getTeacherBasicDetails(schoolUUID, userId) {
  return postPayload(schoolUUID, "teacher/signup/get-teacher-basic-details", { userId });
}

/**
 * Step 1 save: POST teacher/signup/save-basic-details with { authentication, teacherDetails }. The branch is
 * `statusCode === "SUCCESS"` (status "1" and message "Details Saved"); validation failures have no status, only a
 * message.
 */
export async function saveTeacherBasicDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "teacher/signup/save-basic-details", request);
}

/**
 * Step 2 prefill: POST teacher/signup/get-teacher-academic-professional-details with { userId } (the signed-in
 * teacher's own, otherwise 403 -> null). Success is status "1" with details.teacherDetails (qualification,
 * specialization, experience, organization, job description, selectedGrades CSV, demo link, declaration, and the
 * saved documents' name/URL keys) and `recordingUrls` (the saved demo recording, best effort).
 */
export async function getTeacherProfessionalDetails(schoolUUID, userId) {
  return postPayload(schoolUUID, "teacher/signup/get-teacher-academic-professional-details", { userId });
}

/**
 * The course lists of Step 2: POST teacher/signup/get-teacher-signup-subject-details with { userId }. Success carries
 * details.subjectDetails: the three bands' selectable titles (elementryAllSubject, middleAllSubject, highAllSubject)
 * and this teacher's saved selection (elementrySelectedSubject, middleSelectedSubject, highSelectedSubject).
 */
export async function getTeacherSubjectDetails(schoolUUID, userId) {
  return postPayload(schoolUUID, "teacher/signup/get-teacher-signup-subject-details", { userId });
}

/**
 * Step 2 save: POST teacher/signup/save-academic-professional-details with { authentication, data }. Success is
 * `status === "1"`; every failure answers a message (and a statusCode that differs per failure).
 */
export async function saveTeacherProfessionalDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "teacher/signup/save-academic-professional-details", request);
}

/**
 * Removes the signed-in teacher's uploaded document of one fileType: POST teacher/signup/delete-document. The caller's
 * uniqueId is read from the session here, never taken from the browser. Success is `status === "1"`.
 */
export async function deleteTeacherDocument(schoolUUID, fileType) {
  const session = await getAccountSession();
  if (!session?.uniqueId || session.schoolUUID !== schoolUUID) return null;
  const response = await fetch(
    await backendUrl(schoolUUID, "teacher/signup/delete-document"),
    await withSmsAuth({
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ uniqueId: session.uniqueId, fileType: String(fileType) }).toString(),
      cache: "no-store",
    })
  );
  return parseJsonResponse(response);
}
