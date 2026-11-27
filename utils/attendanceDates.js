// Pure date helpers for My Attendance > Attendance Details (no React, no project imports, so they can be
// checked with scripts/verifyAttendanceDetails.mjs).
//
// Calendar dates travel as "YYYY-MM-DD" strings and are only ever computed with UTC arithmetic on those
// parts, so no browser / server timezone can shift a day. Real instants (startTime, endTime, joinedTime) are
// formatted with an explicit IANA timezone - the student's resolved timezone - never "as local".

export const FALLBACK_TIMEZONE = "Asia/Singapore"; // project rule: only when no valid timezone is configured
export const WEEK_STARTS_ON = 0; // 0 = Sunday: the project's calendar (date-fns startOfWeek default, K5 week view)

export const DATE_FILTERS = [
  { value: "TODAY", label: "Today" },
  { value: "YESTERDAY", label: "Yesterday" },
  { value: "WEEK", label: "Week" },
  { value: "MONTH", label: "Month" },
  { value: "CUSTOM", label: "Custom" },
];

// UI status -> the status the backend accepts (ALL | PRESENT | LATE | ABSENT). "Missed by student" is just an
// absent class, so it is not a separate option: such rows come under Absent (and keep their own label in the table).
export const STATUS_OPTIONS = [
  { key: "", label: "Select Status", api: "ALL" },
  { key: "all", label: "All", api: "ALL" },
  { key: "present", label: "Present", api: "PRESENT" },
  { key: "late", label: "Late", api: "LATE" },
  { key: "absent", label: "Absent", api: "ABSENT" },
];
export const apiStatus = (key) => (STATUS_OPTIONS.find((s) => s.key === key) || STATUS_OPTIONS[0]).api;

export function isValidTimeZone(value) {
  const zone = String(value || "").trim();
  if (!zone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** A valid configured timezone is kept as it is; anything else (missing, blank, invalid) becomes Asia/Singapore. */
export const resolveTimeZone = (value) => (isValidTimeZone(value) ? String(value).trim() : FALLBACK_TIMEZONE);

// ---- date-only strings -------------------------------------------------------------------------------------

const pad = (n) => String(n).padStart(2, "0");

export function parseYmd(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d ? { y, m, d } : null;
}

const fromUtc = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export function addDaysYmd(ymd, days) {
  const p = parseYmd(ymd);
  if (!p) return null;
  return fromUtc(new Date(Date.UTC(p.y, p.m - 1, p.d + days)));
}

export function weekStartYmd(ymd, weekStartsOn = WEEK_STARTS_ON) {
  const p = parseYmd(ymd);
  if (!p) return null;
  const dow = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return addDaysYmd(ymd, -((dow - weekStartsOn + 7) % 7));
}

export function monthStartYmd(ymd) {
  const p = parseYmd(ymd);
  return p ? `${p.y}-${pad(p.m)}-01` : null;
}

/** Today's calendar date in `timeZone` as "YYYY-MM-DD" (an instant is read in that zone, not in the browser's). */
export function todayYmd(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: resolveTimeZone(timeZone), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** { from, to } of a date filter. "To" is always today; CUSTOM has no preset range (the caller keeps its own From). */
export function rangeForFilter(filter, today) {
  switch (filter) {
    case "TODAY":
      return { from: today, to: today };
    case "YESTERDAY": {
      const yesterday = addDaysYmd(today, -1);
      return { from: yesterday, to: yesterday };
    }
    case "WEEK":
      return { from: weekStartYmd(today), to: today };
    case "MONTH":
      return { from: monthStartYmd(today), to: today };
    default:
      return null;
  }
}

/** Custom range: From may be any day in the last `days` days, To is today; nothing in the future. */
export function customBounds(today, days) {
  return { min: addDaysYmd(today, -days), max: today };
}

/** Returns an error message, or null when `from`..`to` is an allowed custom range. */
export function validateCustomRange(from, to, today, days) {
  if (!parseYmd(from) || !parseYmd(to)) return "Please choose a valid date.";
  if (to !== today) return "The To date is always today.";
  if (from > today) return "Future dates cannot be selected.";
  const { min } = customBounds(today, days);
  if (from < min) return `You can look back only ${days} days.`;
  return null;
}

// Date pickers speak JS Dates: build them from the parts (local midnight) and read the parts back, so the
// shown day is the stored day in every timezone.
export function ymdToPickerDate(ymd) {
  const p = parseYmd(ymd);
  return p ? new Date(p.y, p.m - 1, p.d) : undefined;
}
export const pickerDateToYmd = (date) => (date instanceof Date && !Number.isNaN(date.getTime()) ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : null);

// ---- display -----------------------------------------------------------------------------------------------

const NARROW_SPACES = /[  ]/g;

/** "Fri, Oct 30, 2026" from a date-only "YYYY-MM-DD" (never converted through a timezone). */
export function formatClassDate(ymd) {
  const p = parseYmd(ymd);
  if (!p) return "";
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "2-digit", year: "numeric" })
    .format(new Date(Date.UTC(p.y, p.m - 1, p.d, 12)))
    .replace(NARROW_SPACES, " ");
}

function instant(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "1:20 PM" - a UTC instant shown in `timeZone`; null when the value is empty or not a timestamp. */
export function formatTimeInZone(value, timeZone) {
  const date = instant(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", { timeZone: resolveTimeZone(timeZone), hour: "numeric", minute: "2-digit", hour12: true }).format(date).replace(NARROW_SPACES, " ");
}

/** The calendar date ("YYYY-MM-DD") an instant falls on in `timeZone`. */
export function localDateInZone(value, timeZone) {
  const date = instant(value);
  return date ? todayYmd(timeZone, date) : null;
}

/** "2025-10-14 06:30 AM" - date and time of a UTC instant in `timeZone`. */
export function formatDateTimeInZone(value, timeZone) {
  const date = instant(value);
  if (!date) return null;
  const time = new Intl.DateTimeFormat("en-US", { timeZone: resolveTimeZone(timeZone), hour: "2-digit", minute: "2-digit", hour12: true }).format(date).replace(NARROW_SPACES, " ");
  return `${localDateInZone(value, timeZone)} ${time}`;
}

/**
 * The display values of one API row. The raw row is untouched (and returned as `raw`); only the three UTC
 * instants are converted. `late`, `lateByMinutes`, `status` and `absentLabel` are the backend's, as they are.
 * A time that lands on another calendar day than the class date (midnight crossed) also carries that day.
 */
export function toDisplayRow(row, timeZone) {
  const zone = resolveTimeZone(timeZone);
  const part = (value) => {
    const time = formatTimeInZone(value, zone);
    if (time == null) return { time: null, shiftedDate: null };
    const day = localDateInZone(value, zone);
    return { time, shiftedDate: day && row.classDate && day !== row.classDate ? formatClassDate(day) : null };
  };
  return {
    raw: row,
    className: row.className || "",
    classDate: row.classDate,
    classDateLabel: formatClassDate(row.classDate),
    start: part(row.startTime),
    end: part(row.endTime),
    joined: part(row.joinedTime),
    status: row.status,
    absentLabel: row.absentLabel ?? null,
    late: Boolean(row.late),
    lateByMinutes: Number(row.lateByMinutes) || 0,
  };
}
