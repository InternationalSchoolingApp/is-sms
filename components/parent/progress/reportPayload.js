// Pure helpers of the parent Progress pages (no React, no server imports): list-row wording and the report link
// payload. Shared by the page components, the server action and the PDF route, and unit-testable on their own.

/** Legacy parentProgressMapRows: daysType -> report type label. */
export function reportType(daysType) {
  const days = Number(daysType);
  if (days === 14 || days === 15) return "Biweekly Progress Report";
  if (days === 28 || days === 30) return "Monthly Progress Report";
  return "Weekly Progress Report";
}

/** Legacy parentProgressGetDateRange. */
export function dateRange(startDate, endDate) {
  if (!startDate && !endDate) return "N/A";
  return `${startDate || "N/A"} - ${endDate || "N/A"}`;
}

/**
 * The backend joins its base URL and the school UUID with a doubled slash. Only the part before "?" is touched:
 * the payload after it is base64/AES text and may contain "//" that must survive.
 */
export function normalizeUrl(url) {
  const value = String(url ?? "");
  if (!value) return "";
  const at = value.indexOf("?");
  const head = at < 0 ? value : value.slice(0, at);
  const tail = at < 0 ? "" : value.slice(at);
  return head.replace(/([^:/])\/{2,}/g, "$1/") + tail;
}

/** The `payload` query value of a report link exactly as URLSearchParams reads it, or "". */
export function payloadOf(link) {
  try {
    return new URL(String(link ?? ""), "http://localhost").searchParams.get("payload") || "";
  } catch {
    return "";
  }
}

/**
 * Plain base64 JSON payload (the download link's, and an older list link's) -> object, or null for anything else
 * (the list's own payload is AES-encrypted and is not readable here by design).
 */
export function decodeJsonPayload(payload) {
  try {
    const text = atob(String(payload ?? "").replace(/ /g, "+"));
    if (!text.trim().startsWith("{")) return null;
    let decoded = text;
    try {
      decoded = decodeURIComponent(text);
    } catch {
      // not URL-encoded text: use it as it is
    }
    const value = JSON.parse(decoded);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Splits a report's `data` ("<lmsUserId>-<providerId>-<studentUserId>-<parentUserId>", as DashboardParentUtil
 * writes it) into the child and the parent it was issued for. The LMS id may itself contain "-", so the last two
 * parts are taken. null when it does not have that shape.
 */
export function reportDataOwners(data) {
  const parts = String(data ?? "").split("-");
  if (parts.length < 4) return null;
  const studentUserId = parts[parts.length - 2];
  const parentUserId = parts[parts.length - 1];
  return /^\d+$/.test(studentUserId) && /^\d+$/.test(parentUserId) ? { studentUserId, parentUserId } : null;
}

/** A row's playloadUrl -> { params, rawPayload }: readable (plain) payloads become params, encrypted ones stay raw. */
export function parseReportUrl(url) {
  const rawPayload = payloadOf(url);
  const params = decodeJsonPayload(rawPayload);
  return params?.data ? { params, rawPayload: "" } : { params: null, rawPayload };
}

// ---- list filter ranges (legacy parentProgressApplyFilter), all as "YYYY-MM-DD" ---------------------------------

const pad = (n) => String(n).padStart(2, "0");

/** Last day of the month of `ymd`. */
export function monthEndYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(String(ymd ?? ""));
  if (!m) return null;
  const last = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  return `${m[1]}-${m[2]}-${pad(last)}`;
}
