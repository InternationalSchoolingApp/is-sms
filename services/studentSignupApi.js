"use server";

import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Student Signup API surface that's safe to import directly from a Client
 * Component (AccountCreationForm.jsx, hooks/useEnrollmentContext.js — no
 * cookies()/next/headers). Follows the plain "use server" pattern
 * demonstrated by services/serverApi.js (see app/test/TestComponent.js)
 * exactly — the directive lives at the top of the file, same as that
 * reference, so every export below is a real Server Action: a plain fetch, a
 * straight `response.json()`-style parse, nothing session/cookie-related.
 * That's safe here specifically because every endpoint in this file is
 * public/pre-auth (see each function's own doc comment) — none of them ever
 * depended on the backend's session cookie for identity.
 *
 * Every OTHER Student Signup endpoint (the authenticated ones — save/get
 * student & parent details, course selection, payment, review, etc.) lives
 * in services/studentSignupBackendApi.js, also a file-level "use server"
 * module, called directly by Client Components too — there is no separate
 * actions/ wrapper layer; this file and that one together make up "the
 * Student Signup API", split into two files only because of how these
 * public endpoints were introduced, not because either needs the other.
 */

function backendUrl(schoolUUID, path) {
  const baseUrl = resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error(
      "A backend origin (BACKEND_BASE_URL/NEXT_PUBLIC_BACKEND_BASE_URL) and a schoolUUID are required — schoolUUID must come from the URL, not an env var"
    );
  }
  return `${baseUrl}/${schoolUUID}/${path}`;
}

// Same non-2xx/empty-body/Spring-error-page handling as
// services/studentSignupBackendApi.js:parseJsonResponse — see that file's
// comment for why a non-ok HTTP status is treated as null, not a thrown error.
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

// ClientSignupStudentController.getEnrollmentProcess(): resolves the saved
// enrollment stage and custom-payment override — used by
// hooks/useEnrollmentContext.js, the context hook every Stage1-4 step page
// shares, not just StudentDetailsStep.jsx.
export async function getEnrollmentProcess(schoolUUID, uniqueId) {
  const response = await fetch(backendUrl(schoolUUID, `api/v1/student/enrollment/process/${encodeURIComponent(uniqueId)}`));
  return parseJsonResponse(response);
}

// CommonController.getSettingsByTypeKey(): GET /{schoolId}/api/v1/get-setting.
// The Next.js equivalent of legacy jquery.commonFunction.js's
// getSettingsByTypeAndKey() + getSettingMetaValue() pair — the endpoint answers
// {data: {metaValue}}, and a missing/deleted SETTINGS row comes back as "".
// Public/pre-auth like the rest of this file (login.js calls it logged out too).
export async function getSettingValue(schoolUUID, metaType, metaKey) {
  const query = `metaType=${encodeURIComponent(metaType)}&metaKey=${encodeURIComponent(metaKey)}`;
  const response = await fetch(backendUrl(schoolUUID, `api/v1/get-setting?${query}`));
  const body = await parseJsonResponse(response);
  return body?.data?.metaValue ?? "";
}

// CONFIGURATION/ENROLLMENT_VIA_NEXTJS — the master switch the backend already
// branches on (CommonUtil#getFinalEnrollmentUrl, is-rest-api): true = students
// enroll through this Next.js wizard, false = through the legacy JSP flow at
// {schoolId}/student/enrollment/process/{uniqueId}. Matched to
// CommonUtil#getSettingValueByTypeAndKeyAsBoolean: only the literal "true"
// (case-insensitive, trimmed) counts, everything else — including an
// unreachable backend — is false.
export async function isEnrollmentViaNextjs(schoolUUID) {
  const metaValue = await getSettingValue(schoolUUID, "CONFIGURATION", "ENROLLMENT_VIA_NEXTJS");
  return String(metaValue).trim().toLowerCase() === "true";
}

// Public, pre-auth resolution of the {schoolId} URL slug/UUID into the
// numeric row id/name/WhatsApp number — see PublicSchoolInfoDTO in
// is-rest-api. Called directly from AccountCreationForm.jsx and
// hooks/useEnrollmentContext.js.
export async function getPublicSchoolInfo(schoolUUID) {
  const response = await fetch(backendUrl(schoolUUID, "api/v1/student/enrollment/public-info"));
  return parseJsonResponse(response);
}

/**
 * Initializes the public enrollment form. Route and request parameters match
 * PaymentResponseApiController.studentEnrollmentSignup():
 * GET /api/v1/{schoolId}/student/{enrollmentFor}/{learningProgram}.
 * Preserve the page query as-is (including repeated keys); the controller
 * reads payload, referralCode, ras, and v from it. `params` is a plain
 * string (not a URLSearchParams instance) — Server Actions can only accept
 * serializable arguments, so the caller passes the raw query string and
 * this builds its own URLSearchParams from it. Called directly from
 * AccountCreationForm.jsx.
 */
export async function getEnrollmentSignupInfo(schoolUUID, learningProgram, params) {
  const baseUrl = resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID are required for enrollment setup");
  }

  const query = new URLSearchParams(params?.toString() || "");
  if (!query.has("ras")) query.set("ras", "N");

  const response = await fetch(
    `${baseUrl}/api/v1/${encodeURIComponent(schoolUUID)}/student/enrollment/${encodeURIComponent(learningProgram)}?${query.toString()}`
  );
  return parseJsonResponse(response);
}
