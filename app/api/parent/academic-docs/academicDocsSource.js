import { parentPost } from "@/services/parentApiBase";

/**
 * Server-only source of the child's academic documents WITH the backend's encrypted URLs. Lives next to the route (not
 * in services/parentAcademicDocsApi.js, a "use server" file whose exports the browser can call) so those URLs can never
 * be returned to the browser: the service strips them, the route resolves them.
 *
 * POST /dashboard/parent/student-academic-details {userId (the parent, from the session), studentUserId}.
 * Response (ResponseCommon): status "1" ok / "3" session out / "0" failed (E004 = child not mapped to this parent);
 * details (StudentAcademicDocumentDetailsDTO) { userId, userName, academicDocuments[] { gradeName, learningProgram,
 * sessionName, graduationDate ("yyyy-MM-dd"), showTranscript ("Y"/"N"), transcriptUrl, deplomaUrl ("deploma" is the
 * backend's spelling; only for standardId 7), academicVerficationUrl } }. The three URLs are empty when
 * showTranscript is not "Y". Each is {backend}/{school}/dashboard/{student-transcript-view-after-publish |
 * view-diploma | transcript-verification-page}/{student uniqueId}?payload=<encrypted>. academicDocuments is absent
 * when the child has none. null when the call fails.
 */
export async function fetchRawAcademicDocs({ schoolUUID, parentUserId, studentUserId }) {
  if (!schoolUUID || !parentUserId || !studentUserId) return null;
  return parentPost(schoolUUID, "/dashboard/parent/student-academic-details", {
    userId: String(parentUserId),
    studentUserId: String(studentUserId),
  });
}

/** The document list of a raw response ([] when none). */
export const rawRows = (response) =>
  String(response?.status) === "1" && Array.isArray(response?.details?.academicDocuments) ? response.details.academicDocuments : [];

/** document kind -> the raw URL field, the backend page segment it must point at, and the default file name. */
export const DOC_KINDS = {
  transcript: { field: "transcriptUrl", segment: "student-transcript-view-after-publish", fileName: "transcript" },
  diploma: { field: "deplomaUrl", segment: "view-diploma", fileName: "diploma" },
  verification: { field: "academicVerficationUrl", segment: "transcript-verification-page", fileName: "academic-verification" },
};

/** The row identity the page sends back with the index, so a list that changed in between is refused, not mixed up. */
export const rowKeyOf = (row) => [row?.gradeName, row?.sessionName, row?.learningProgram].map((v) => String(v ?? "")).join("|");
