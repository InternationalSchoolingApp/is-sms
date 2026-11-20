// My Certificates helpers — the legacy myCertificatesContent.js status / stepper rules.

export const isCertificateOk = (response) => Boolean(response && (response.status === "SUCCESS" || response.statusCode === "200"));

// Request status -> label and tone (legacy chip classes wait / ok / no / off). `key` names the translated label
// (certificates.steps.<key>); `label` stays the English text.
export const REQUEST_STATUS = {
  PENDING: { label: "Requested", key: "requested", tone: "wait" },
  UNDER_REVIEW: { label: "Under review", key: "underReview", tone: "wait" },
  GENERATING: { label: "Generating certificate", key: "generating", tone: "wait" },
  DISPATCHING: { label: "Dispatching", key: "dispatching", tone: "wait" },
  PROCESSING: { label: "Generating certificate", key: "generating", tone: "wait" },
  APPROVED: { label: "Certificate generated", key: "generated", tone: "ok" },
  REJECTED: { label: "Not approved", key: "notApproved", tone: "no" },
  CANCELLED: { label: "Cancelled", key: "cancelled", tone: "off" },
};
export const statusOf = (status) => REQUEST_STATUS[status] || { label: status || "", tone: "off" };

/**
 * The progress track of a request: Requested -> Under review -> Generating certificate -> [Dispatching]
 * -> Certificate generated, and where the request is on it. Rejected / cancelled requests have no track.
 * Returns { labels, keys, current } (current = index of the step being worked on; labels.length = all done) or null.
 * `keys` are the steps' translation keys (certificates.steps.<key>), in the same order as the English `labels`.
 */
export function requestSteps(status) {
  const labels = ["Requested", "Under review", "Generating certificate"];
  const keys = ["requested", "underReview", "generating"];
  if (status === "DISPATCHING") {
    labels.push("Dispatching");
    keys.push("dispatching");
  }
  labels.push("Certificate generated");
  keys.push("generated");
  const at = { PENDING: 0, UNDER_REVIEW: 1, GENERATING: 2, PROCESSING: 2, DISPATCHING: 3, APPROVED: labels.length }[status];
  return at === undefined ? null : { labels, keys, current: at };
}

/** "03 Nov 2026" (epoch millis or ISO string). `localeTag` (BCP 47) names the months in another language. */
export function certDate(value, localeTag = "en-GB") {
  if (value == null || value === "") return "";
  const d = new Date(typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(localeTag, { day: "2-digit", month: "short", year: "numeric" });
}

/** `requested(date)` words the "Requested <date>" part (default English); `localeTag` is passed to certDate. */
export function requestMeta(r, { requested = (date) => `Requested ${date}`, localeTag } = {}) {
  const grade = r.gradeLabel || r.grade;
  return [grade, r.academicYear, requested(certDate(r.requestedAt, localeTag)), r.purpose].filter(Boolean).join(" · ");
}

export const certificateTitle = (c) => c.activityTitle || c.templateName || "Certificate";

/** Copies the public verification link (legacy: clipboard, then a prompt as the last resort). */
export async function copyVerifyLink(url, promptText = "Copy this link:") {
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
  window.prompt(promptText, url);
  return false;
}

/** "Grade 6 · 2026-2027 (current)" — a grade option of the request form. `currentWord` translates "current". */
export const enrolmentLabel = (e, currentWord = "current") => `${e.gradeLabel || e.grade}${e.academicYear ? ` · ${e.academicYear}` : ""}${e.current ? ` (${currentWord})` : ""}`;
