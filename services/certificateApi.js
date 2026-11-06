"use server";

import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * My Certificates (sidebar pageLink `my-certificates`) — legacy myCertificates.js ->
 * CertificateController ({schoolUUID}/api/v1/certificate/my/...) -> CertificateAdminUtil.decodeForStudent.
 * Every endpoint is POST with body { payload: encode({schoolId, userId, ...}) } (numeric school id). The
 * backend takes the student from the session and ignores the userId; it checks the student's rights on
 * `my-certificates`. Answers are ResponseCommon: status "SUCCESS" (statusCode "200") / "FAILED" / "EXCEPTION".
 * Non-2xx / empty / non-JSON responses come back as null.
 */

async function identity() {
  const session = await getAccountSession();
  if (!session?.userId || !session?.schoolUUID || !session?.schoolNumericId) return null;
  return { userId: Number(session.userId), schoolUUID: session.schoolUUID, schoolId: Number(session.schoolNumericId) };
}

// The signed-in user's SMS access token (Bearer) + this server's service key. The backend knows the user from
// the token (lib/auth/session.js); the browser's cookies are no longer forwarded.
async function authHeaders() {
  return { ...serviceKeyHeaders(), ...(await smsAuthHeaders()) };
}

async function callCertificate(path, extra = {}) {
  const me = await identity();
  if (!hasBackendOrigin() || !me) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/${me.schoolUUID}/api/v1/certificate/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ payload: encodePayload({ schoolId: me.schoolId, userId: me.userId, ...extra }) }),
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** details: [{ certCode, recipientName, activityTitle, activityType, templateName, issueDate, pdfStatus "READY"|"PENDING", pdfUrl, verifyUrl }] */
export async function getMyCertificates() {
  return callCertificate("my/list");
}

/** details: [{ id, typeName, grade, gradeLabel, academicYear, purpose, status, requestedAt, actionedAt, rejectReason, certCode, verifyUrl, pdfUrl }] */
export async function getMyCertificateRequests() {
  return callCertificate("my/requests");
}

/** details: { types: [{ id, typeName, askName, ... }], enrolments: [{ studentStandardId, grade, gradeLabel, academicYear, current }] } */
export async function getMyCertificateRequestOptions() {
  return callCertificate("my/request-options");
}

/** Creates a PENDING request (the school is emailed). details = the new request row. */
export async function createMyCertificateRequest({ requestTypeId, otherName, studentStandardId, purpose }) {
  return callCertificate("my/requests/create", {
    requestTypeId: Number(requestTypeId),
    otherName: otherName || null,
    studentStandardId: studentStandardId ? Number(studentStandardId) : null,
    purpose: purpose || "",
  });
}

/** Only a PENDING request of this student can be cancelled. */
export async function cancelMyCertificateRequest({ requestId }) {
  return callCertificate("my/requests/cancel", { requestId: Number(requestId) });
}
