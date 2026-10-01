"use server";

import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Student Signup API surface that's safe to import directly from a Client
 * Component (AccountCreationForm.jsx, hooks/useEnrollmentContext.js — no
 * actions/studentSignupActions.js wrapper, no cookies()/next/headers).
 * Follows the plain "use server" pattern demonstrated by services/serverApi.js
 * (see app/test/TestComponent.js) exactly — the directive lives at the top
 * of the file, same as that reference, so every export below is a real
 * Server Action: a plain fetch, a straight `response.json()`-style parse,
 * nothing session/cookie-related.
 * That's safe here specifically because every endpoint in this file is
 * public/pre-auth (see each function's own doc comment) — none of them ever
 * depended on the backend's session cookie for identity.
 *
 * Every OTHER Student Signup endpoint (the authenticated ones — save/get
 * student & parent details, course selection, payment, review, etc.) still
 * needs the backend's session cookie forwarded, which requires next/headers'
 * cookies() — and a Client Component can't import a module that uses
 * next/headers at all, even for an unrelated export, without breaking the
 * build. Those endpoints live in services/studentSignupBackendApi.js instead
 * (used only by actions/studentSignupActions.js); this file and that one
 * together make up "the Student Signup API", split purely for that Next.js
 * bundling constraint, not as a change in endpoint ownership.
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
