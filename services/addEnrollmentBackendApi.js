"use server";

import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

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

function backendUrl(schoolUUID, path) {
  const baseUrl = resolveServerBackendOrigin();
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
  const response = await fetch(backendUrl(schoolUUID, path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: encodePayload(data) }),
  });
  return parseJsonResponse(response);
}

/**
 * ParentChildEnrollmentUtil#saveEnrollAnotherChild (ClientSignupStudentController
 * {schoolId}/api/v1/enroll/another/child/{parentId}/{sessionUserUniqueId}):
 * resolves the parent's already-partially-enrolled child if one exists
 * (resume, no new row) or creates a new child user skeleton (new enrollment).
 * Both ids travel as path segments, NOT in a body payload — parentId is the
 * numeric parent id from the URL, sessionUserUniqueId is the UNIQUEUUID of
 * the logged-in caller (parent themselves, or a sibling student). Response
 * data: {schoolId, schoolUUID, signupPage, userId, uniqueId} — signupPage is
 * the resume step (1/2/3), userId/uniqueId identify the child being enrolled,
 * NOT the caller. Safe to call on every add-enrollment wizard mount/refresh —
 * a parent with an in-progress child always resumes the same one.
 */
export async function enrollAnotherChild(schoolUUID, parentId, sessionUserUniqueId) {
  return postPayload(
    schoolUUID,
    `api/v1/enroll/another/child/${encodeURIComponent(parentId)}/${encodeURIComponent(sessionUserUniqueId)}`,
    {}
  );
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
