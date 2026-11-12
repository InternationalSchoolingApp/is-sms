"use server";

import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { parentPost } from "@/services/parentApiBase";
import { payloadOf, reportDataOwners } from "@/components/parent/progress/reportPayload";

/**
 * BFF of the parent Progress page. The parent is always the session user; the child is passed by the page and the
 * backend verifies the parent-student mapping on the list call. The report call does its own check below because the
 * gradebook endpoint is a public route that trusts its payload.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The parent's own children (user ids as strings), from the parent gate; empty when the call fails. */
async function ownChildIds(schoolUUID) {
  const session = await getAccountSession();
  if (!session?.userId) return null;
  const gate = await parentPost(schoolUUID, "/dashboard/parent/get-students-by-parent", { userId: session.userId });
  const list = Array.isArray(gate?.studentBasicDetails) ? gate.studentBasicDetails : [];
  return new Set(list.map((child) => String(child.userId)));
}

/**
 * The child's progress reports — POST /dashboard/parent/weekly-progress-reports-detail
 * {userId (the parent, from the session), studentUserId, startDate?, endDate?} (ISO yyyy-MM-dd, both or neither).
 * Response (ResponseCommon): status "1" with details (StudentWeeklyProgressReportDetailsDTO)
 * { studentWeeklyProgressReports[] { weeklyReportId, studentId, courseProviderName, studentName, grade, mailStatus,
 *   createdDate, reportStartDate, reportEndDate, playloadUrl, daysType } }; the list is absent when there is none.
 * playloadUrl = {backend}/{school}/dashboard/get-user-gradebook/{parent uniqueId}?payload=<AES>. A child that is not
 * the parent's comes back as a FAILED status without details; session out is status "3". null on any failure.
 */
export async function getParentProgressReports({ schoolUUID, studentUserId, startDate, endDate }) {
  if (!hasBackendOrigin() || !schoolUUID || !studentUserId) return null;
  try {
    const session = await getAccountSession();
    if (!session?.userId) return null;
    const body = { userId: String(session.userId), studentUserId: String(studentUserId) };
    if (DATE.test(startDate || "") && DATE.test(endDate || "")) {
      body.startDate = startDate;
      body.endDate = endDate;
    }
    return await parentPost(schoolUUID, "/dashboard/parent/weekly-progress-reports-detail", body);
  } catch {
    return null;
  }
}

/**
 * One report as JSON — GET /dashboard/get-user-gradebook/{parent uniqueId}?payload=...&format=json (same endpoint the
 * legacy page loads as HTML). Response: status "SUCCESS" plus the report fields used by ParentProgressReportView
 * (studentName, standardName, rollNumber, country, reportStartDate/EndDate, subReportType, lmsProId, data,
 * downloadUrl, reportMessage, gradebookEnroll[]). null on any failure or when the report is not this parent's.
 *
 * The caller sends either `params` ({data, startdate, enddate, subReportType}, readable payload or a date search)
 * or `rawPayload` (the list's encrypted payload). Neither is trusted:
 *  - params.data names its child and parent ("lms-provider-child-parent"): the parent must be the session user and
 *    the child one of the parent's children;
 *  - rawPayload cannot be read here, so it must equal the payload of a row the backend itself returns for the
 *    selected child (range = the list filter that row came from).
 * The unique id in the URL is the session's, never the browser's.
 */
export async function getParentGradebookReport({ schoolUUID, studentUserId, params, rawPayload, startDate, endDate }) {
  if (!hasBackendOrigin() || !schoolUUID || !(params?.data || rawPayload)) return null;
  try {
    const session = await getAccountSession();
    if (!session?.userId || !session?.uniqueId) return null;
    const children = await ownChildIds(schoolUUID);
    if (!children?.size) return null;

    let payload;
    if (params?.data) {
      const owners = reportDataOwners(params.data);
      if (!owners || owners.parentUserId !== String(session.userId) || !children.has(owners.studentUserId)) return null;
      // Plain base64 of the JSON, like legacy: this endpoint reads the payload with AesUtil.decodeOrDecrypt, which only
      // takes base64 whose text starts with "{" and tries AES on anything else, so encodePayload's encodeURI fails.
      payload = Buffer.from(
        JSON.stringify({
          data: params.data,
          startdate: params.startdate || "",
          enddate: params.enddate || "",
          subReportType: params.subReportType || "",
          requestFrom: "true",
          forDownload: "false",
        }),
        "utf8",
      ).toString("base64");
    } else {
      if (!studentUserId || !children.has(String(studentUserId))) return null;
      const list = await getParentProgressReports({ schoolUUID, studentUserId, startDate, endDate });
      const rows = Array.isArray(list?.details?.studentWeeklyProgressReports) ? list.details.studentWeeklyProgressReports : [];
      if (!rows.some((row) => payloadOf(row?.playloadUrl) === String(rawPayload))) return null;
      payload = String(rawPayload);
    }

    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(
      `${baseUrl}/${schoolUUID}/dashboard/get-user-gradebook/${encodeURIComponent(session.uniqueId)}?payload=${encodeURIComponent(payload)}&format=json`,
      { headers: { ...serviceKeyHeaders(), ...(await smsAuthHeaders()) }, cache: "no-store" },
    );
    if (!response.ok) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
