"use server";

import { parentSessionUserId } from "@/services/parentApiBase";
import { DOC_KINDS, fetchRawAcademicDocs, rawRows, rowKeyOf } from "@/app/api/parent/academic-docs/academicDocsSource";

/**
 * The child's academic documents for the page (legacy parentAcademicDocs.js) — POST
 * /dashboard/parent/student-academic-details {userId (the parent, from the session), studentUserId}; the backend
 * verifies the parent-student mapping (status "0", E004). See academicDocsSource.js for the raw response.
 *
 * The backend's response carries ENCRYPTED document URLs; none of them leaves the server. This returns
 *   { status: "1" | "3" | "0", rows: [{ index, rowKey, gradeName, sessionName, learningProgram, graduationDate,
 *     transcript, diploma, verification }] }
 * where the last three are booleans (is there something to download) and `index` + `rowKey` are the opaque reference
 * the browser sends to /api/parent/academic-docs to ask for one document. null when the call fails.
 * A document is offered like legacy: the transcript when showTranscript is not "N" and it has a URL, the other two
 * when they have a URL.
 */
export async function getParentAcademicDocs({ schoolUUID, studentUserId }) {
  const parentUserId = await parentSessionUserId();
  if (!parentUserId) return { status: "3", rows: [] };
  const raw = await fetchRawAcademicDocs({ schoolUUID, parentUserId, studentUserId });
  if (!raw) return null;
  const status = String(raw.status);
  if (status !== "1") return { status: status === "3" ? "3" : "0", rows: [] };
  const rows = rawRows(raw).map((row, index) => ({
    index,
    rowKey: rowKeyOf(row),
    gradeName: row?.gradeName || "",
    sessionName: row?.sessionName || "",
    learningProgram: row?.learningProgram || "",
    graduationDate: row?.graduationDate || "",
    transcript: row?.showTranscript !== "N" && Boolean(row?.[DOC_KINDS.transcript.field]),
    diploma: Boolean(row?.[DOC_KINDS.diploma.field]),
    verification: Boolean(row?.[DOC_KINDS.verification.field]),
  }));
  return { status: "1", rows };
}
