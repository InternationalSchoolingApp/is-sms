"use server";

import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { encodePayload } from "@/utils/payloadEncoding";

/**
 * Add-Another-Student backend wrappers. Kept separate from the main
 * services/studentSignupBackendApi.js on purpose: the Add-Another-Student
 * flow is a brand-new wizard (see the add-another-student roadmap +
 * mermaid-flow docs), and must not share service entries with the main
 * enrollment flow — new pages/components/hooks/services only, so the main
 * flow stays completely untouched if either side changes.
 *
 * Same "use server" + encodePayload pattern as the main service file; same
 * backend origin resolution and parseJsonResponse semantics (non-ok → null).
 * Identity/authorization travels in the request payload or URL path segments,
 * never a forwarded session cookie.
 */

async function backendUrl(schoolUUID, path) {
  const baseUrl = await resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error(
      "A backend origin (BACKEND_BASE_URL/NEXT_PUBLIC_BACKEND_BASE_URL) and a schoolUUID are required — schoolUUID must come from the URL, not an env var"
    );
  }
  return `${baseUrl}/${schoolUUID}/${path}`;
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

async function postPayload(schoolUUID, path, data) {
  const response = await fetch(await backendUrl(schoolUUID, path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: encodePayload(data) }),
  });
  return parseJsonResponse(response);
}

/**
 * ParentChildEnrollmentUtil#saveEnrollAnotherChild (ClientSignupStudentController
 * {schoolId}/api/v1/enroll/another/child):
 * resolves the parent's already-partially-enrolled child if one exists
 * (resume, no new row) or creates a new child user skeleton (new enrollment).
 * parentId (numeric parent id) and sessionUserId (the UNIQUEUUID of the
 * logged-in caller — the parent themselves, or a sibling student) travel in
 * the Base64 request payload, NOT as URL path segments. Response data:
 * {schoolId, schoolUUID, signupPage, userId, uniqueId} — signupPage is the
 * resume step (1/2/3), userId/uniqueId identify the child being enrolled,
 * NOT the caller. Safe to call on every add-enrollment wizard mount/refresh —
 * a parent with an in-progress child always resumes the same one.
 */
export async function enrollAnotherChild(schoolUUID, parentId, sessionUserUniqueId, rollNo = "") {
  return postPayload(schoolUUID, "api/v1/enroll/another/child", {
    parentId: Number(parentId),
    sessionUserId: sessionUserUniqueId,
    // roll number the previous call returned for this parent's child ("" on the very first call)
    rollNo: rollNo || "",
  });
}

/**
 * Add-Another-Student variant of save-student-details.
 * {schoolId}/api/v1/parent/child/student-details — same
 * SaveStudentDetailsRequestDTO { authentication, signupStudent } shape; the
 * parent/child controller resolves the target child via the authentication
 * envelope's userId (the childUserId from enrollAnotherChild), not the
 * caller session.
 */
export async function saveAnotherChildStudentDetails(schoolUUID, request) {
  return postPayload(schoolUUID, "api/v1/parent/child/student-details", request);
}

/**
 * Details for the Add Another Student thank-you page. The endpoint path is a
 * placeholder until the backend one is final — change it here only.
 * parentId + sessionUserId (the caller's UNIQUEUUID) travel in the Base64
 * payload like enrollAnotherChild; childUniqueId (optional) names the child that
 * just finished. Must NOT go through enrollAnotherChild: for a finished child that
 * call would create a brand-new skeleton child.
 */
export async function getAddEnrollmentThankYou(schoolUUID, { parentId, sessionUserId, sessionUniqueId, studentRollNumber }) {
  return postPayload(schoolUUID, "api/v1/enroll/another/child/thank-you", {
    parentId: Number(parentId),
    sessionUserId: String(sessionUserId),
    sessionUniqueId,
    studentRollNumber,
  });
}

/**
 * enrollment/process for the Add Another Student wizard. Same endpoint as the main flow's
 * getEnrollmentProcess, plus ?from=add-enrollment so the backend answers a completed/withdrawn child with
 * statusCode REDIRECT_TO_DASHBOOARD. The main flow never sends the param, so its answer is unchanged.
 */
export async function getAddEnrollmentProcess(schoolUUID, uniqueId) {
  const response = await fetch(
    `${await backendUrl(schoolUUID, `api/v1/student/enrollment/process/${encodeURIComponent(uniqueId)}`)}?from=add-enrollment`
  );
  return parseJsonResponse(response);
}
