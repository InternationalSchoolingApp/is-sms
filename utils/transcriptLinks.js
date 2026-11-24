import { transcriptBlockReasons } from "@/utils/reEnrollmentDocuments";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";

// Legacy StudentAttendance.jsp: a second standard taken to improve / complete the grades is marked " (New)".
const NEW_TYPES = ["REGISTRATION_IMPORVE_GRADES", "REGISTRATION_COMPLETE_GRADES"];

/**
 * The items of the Transcript action menu - legacy StudentAttendance.jsp, per published grade:
 *   "Transcript - {grade}"   (+ " (New)" when the student has more than one transcript and this one is an improve / complete-grades enrolment)
 *   "Diploma - {grade}"      only for the final grade (the backend sends `diplomaUrl` for it)
 *   "Academic Verification - {grade}"   for every published grade (the backend sends `academicVerificationUrl`)
 * -> [{ key, kind: "transcript" | "diploma" | "verification", label, href }]
 */
export function transcriptLinks(transcripts) {
  const list = Array.isArray(transcripts) ? transcripts : [];
  const links = [];
  list.forEach((t, index) => {
    // Phase 4: a blocked grade has no links (the backend sends ""); blockedTranscripts() lists its reasons instead.
    if (t?.transcriptBlocked === true) return;
    const isNew = list.length > 1 && NEW_TYPES.includes(String(t.enrolmentType || "").toUpperCase());
    links.push({ key: `t${index}`, kind: "transcript", label: `Transcript - ${t.gradeName}${isNew ? " (New)" : ""}`, href: `${BACKEND_URL}${t.viewPath}` });
    if (t.diplomaUrl) links.push({ key: `d${index}`, kind: "diploma", label: `Diploma - ${t.gradeName}`, href: `${BACKEND_URL}${t.diplomaUrl}` });
    if (t.academicVerificationUrl) links.push({ key: `v${index}`, kind: "verification", label: `Academic Verification - ${t.gradeName}`, href: `${BACKEND_URL}${t.academicVerificationUrl}` });
  });
  return links;
}

/**
 * Phase 4 (plan v3 section 10): the grades the backend marks `transcriptBlocked` (current grade, enforcement flag on) ->
 * [{ key, label, reasons }] — the same reasons / copy as the re-enrollment card (utils/reEnrollmentDocuments.js).
 * Rows without `transcriptBlocked` are not listed (they keep their links, as before).
 */
export function blockedTranscripts(transcripts) {
  const list = Array.isArray(transcripts) ? transcripts : [];
  return list
    .map((t, index) =>
      t?.transcriptBlocked === true
        ? { key: `b${index}`, label: `Transcript - ${t.gradeName}`, reasons: transcriptBlockReasons(t.transcriptBlockers) }
        : null,
    )
    .filter(Boolean);
}
