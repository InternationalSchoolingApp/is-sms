const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";

// Legacy StudentAttendance.jsp: a second standard taken to improve / complete the grades is marked " (New)".
const NEW_TYPES = ["REGISTRATION_IMPORVE_GRADES", "REGISTRATION_COMPLETE_GRADES"];

/**
 * The items of the Transcript action menu - legacy StudentAttendance.jsp, per published grade:
 *   "Transcript - {grade}"   (+ " (New)" when the student has more than one transcript and this one is an improve / complete-grades enrolment)
 *   "Diploma - {grade}"      only for the final grade (the backend sends `diplomaUrl` for it)
 * -> [{ key, kind: "transcript" | "diploma", label, href }]
 */
export function transcriptLinks(transcripts) {
  const list = Array.isArray(transcripts) ? transcripts : [];
  const links = [];
  list.forEach((t, index) => {
    const isNew = list.length > 1 && NEW_TYPES.includes(String(t.enrolmentType || "").toUpperCase());
    links.push({ key: `t${index}`, kind: "transcript", label: `Transcript - ${t.gradeName}${isNew ? " (New)" : ""}`, href: `${BACKEND_URL}${t.viewPath}` });
    if (t.diplomaUrl) links.push({ key: `d${index}`, kind: "diploma", label: `Diploma - ${t.gradeName}`, href: `${BACKEND_URL}${t.diplomaUrl}` });
  });
  return links;
}
