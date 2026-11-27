// My Certificates helpers — the legacy myCertificatesContent.js status / stepper rules.

export const isCertificateOk = (response) => Boolean(response && (response.status === "SUCCESS" || response.statusCode === "200"));

// Request status -> label and tone (legacy chip classes wait / ok / no / off).
export const REQUEST_STATUS = {
  PENDING: { label: "Requested", tone: "wait" },
  UNDER_REVIEW: { label: "Under review", tone: "wait" },
  GENERATING: { label: "Generating certificate", tone: "wait" },
  DISPATCHING: { label: "Dispatching", tone: "wait" },
  PROCESSING: { label: "Generating certificate", tone: "wait" },
  APPROVED: { label: "Certificate generated", tone: "ok" },
  REJECTED: { label: "Not approved", tone: "no" },
  CANCELLED: { label: "Cancelled", tone: "off" },
};
export const statusOf = (status) => REQUEST_STATUS[status] || { label: status || "", tone: "off" };

/**
 * The progress track of a request: Requested -> Under review -> Generating certificate -> [Dispatching]
 * -> Certificate generated, and where the request is on it. Rejected / cancelled requests have no track.
 * Returns { labels, current } (current = index of the step being worked on; labels.length = all done) or null.
 */
export function requestSteps(status) {
  const labels = ["Requested", "Under review", "Generating certificate"];
  if (status === "DISPATCHING") labels.push("Dispatching");
  labels.push("Certificate generated");
  const at = { PENDING: 0, UNDER_REVIEW: 1, GENERATING: 2, PROCESSING: 2, DISPATCHING: 3, APPROVED: labels.length }[status];
  return at === undefined ? null : { labels, current: at };
}

/** "03 Nov 2026" (epoch millis or ISO string). */
export function certDate(value) {
  if (value == null || value === "") return "";
  const d = new Date(typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function requestMeta(r) {
  const grade = r.gradeLabel || r.grade;
  return [grade, r.academicYear, `Requested ${certDate(r.requestedAt)}`, r.purpose].filter(Boolean).join(" · ");
}

export const certificateTitle = (c) => c.activityTitle || c.templateName || "Certificate";

/** Copies the public verification link (legacy: clipboard, then a prompt as the last resort). */
export async function copyVerifyLink(url) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    const area = document.createElement("textarea");
    area.value = url;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (ok) return true;
  } catch {
    // fall through
  }
  window.prompt("Copy this link:", url);
  return false;
}

/** "Grade 6 · 2026-2027 (current)" — a grade option of the request form. */
export const enrolmentLabel = (e) => `${e.gradeLabel || e.grade}${e.academicYear ? ` · ${e.academicYear}` : ""}${e.current ? " (current)" : ""}`;
