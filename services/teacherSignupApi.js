"use server";

import { withServiceKey, withSmsAuth } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

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
