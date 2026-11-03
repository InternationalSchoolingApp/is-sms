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
 * parentId (numeric parent id) and sessionUserId (the Integer studentUserId of
 * the logged-in caller — the parent themselves, or a sibling student — from
 * the sso-token exchange response, see auth.js/session.studentUserId) travel
 * in the Base64 request payload, NOT as URL path segments. Response data:
 * {schoolId, schoolUUID, signupPage, userId, uniqueId} — signupPage is the
 * resume step (1/2/3), userId/uniqueId identify the child being enrolled,
 * NOT the caller. Safe to call on every add-enrollment wizard mount/refresh —
 * a parent with an in-progress child always resumes the same one.
 */
export async function enrollAnotherChild(schoolUUID, parentId, sessionUserStudentId, rollNo = "", allowCreate = true) {
  return postPayload(schoolUUID, "api/v1/enroll/another/child", {
    // false on a reload of the wizard: the backend then never reserves a new child (resumes / returns the paid one)
    allowCreate,
    parentId: Number(parentId),
    sessionUserId: sessionUserStudentId,
    // roll number the previous call returned for this parent's child ("" on the very first call)
    rollNo: rollNo || "",
    // the key the backend actually reads: a roll number that is already paid comes back as S003 instead of a new child
    studentRollNumber: rollNo || "",
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
 * parentId + sessionUserId (the caller's Integer userId) + sessionUniqueId
 * (the caller's Integer studentUserId, a same-session re-confirmation check
 * against sessionUserId — see auth.js/session.studentUserId) travel in the
 * Base64 payload; childUserId (optional, the child's Integer id) names the child that just
 * finished. Must NOT go through enrollAnotherChild: for a finished child that
 * call would create a brand-new skeleton child.
 */
export async function getAddEnrollmentThankYou(schoolUUID, { parentId, sessionUserId, sessionUniqueId, studentRollNumber, childUserId }) {
  return postPayload(schoolUUID, "api/v1/enroll/another/child/thank-you", {
    parentId: Number(parentId),
    sessionUserId: String(sessionUserId),
    sessionUniqueId,
    // roll number when the caller has it; else the backend finds the child by this user id
    studentRollNumber: studentRollNumber || "",
    childUserId: childUserId || "",
  });
}

/**
 * enrollment/process for the Add Another Student wizard. Same endpoint as the main flow's
 * getEnrollmentProcess, plus ?from=add-enrollment so the backend answers a completed/withdrawn child with
 * statusCode REDIRECT_TO_DASHBOOARD. The main flow never sends the param, so its answer is unchanged.
 * Path segment is the Integer studentUserId — here, the CHILD's own numeric id (childUserId from
 * enrollAnotherChild's response), NOT the caller's session id: this call asks about the child's enrollment,
 * not the caller's.
 */
export async function getAddEnrollmentProcess(schoolUUID, studentUserId) {
  const response = await fetch(
    `${await backendUrl(schoolUUID, `api/v1/student/enrollment/process/${encodeURIComponent(studentUserId)}`)}?from=add-enrollment`
  );
  return parseJsonResponse(response);
}
