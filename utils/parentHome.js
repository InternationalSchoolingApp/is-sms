/**
 * Pure helpers for the parent dashboard home (no React): grade letters, greeting, chart months, schedule times
 * and status badges, due-payment rows. Ported from the legacy parentDashboard.js / parentDashboardContent.js.
 * Times are always read in an explicit IANA zone (the child's, falling back to Asia/Singapore), never "as local".
 */
import { fromZonedTime } from "date-fns-tz";
import { resolveTimeZone } from "@/utils/attendanceDates";

// Legacy getGradeFromPercentage (parentDashboard.js): the lowest percentage of each letter.
const GRADE_STEPS = [
  [95.1, "A+"], [92.1, "A"], [88.1, "A-"], [85.1, "B+"], [82.1, "B"], [78.1, "B-"],
  [75.1, "C+"], [72.1, "C"], [68.1, "C-"], [65.1, "D+"], [62.1, "D"], [59.1, "D-"],
];

export function gradeFromPercentage(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "F";
  const step = GRADE_STEPS.find(([min]) => n >= min);
  return step ? step[1] : "F";
}

/** Legacy getWelcomeMessage: 00-11 morning, 12-15 afternoon, 16-23 evening. */
export function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 16) return "Good afternoon";
  return "Good evening";
}

// Legacy getLearningProgramLabel (masterContent.js); anything else is shown as it came.
const PROGRAM_LABELS = {
  BATCH: "Group Learning",
  DUAL_DIPLOMA: "Dual Diploma",
  ONE_TO_ONE: "One-to-One Learning",
  ONE_TO_ONE_FLEX: "Flexy Program",
  SCHOLARSHIP: "Self Study",
  SSP: "Self Study Plus",
};
export const learningProgramLabel = (value) => (value ? PROGRAM_LABELS[value] || value : "");

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLong = (date) => date.toLocaleString("en-US", { month: "long" });

/**
 * Chart bars: January up to the current month of `now`'s year (not all twelve), one per month, 0 where the
 * backend has no row for that month. `rows` carry monthKey "yyyy-MM"; `valueOf` reads the number.
 */
export function chartMonths(rows, valueOf, now = new Date()) {
  const year = now.getFullYear();
  const byKey = new Map((Array.isArray(rows) ? rows : []).map((r) => [r.monthKey, r]));
  const out = [];
  for (let m = 0; m <= now.getMonth(); m += 1) {
    const key = `${year}-${String(m + 1).padStart(2, "0")}`;
    const row = byKey.get(key);
    const value = row ? Number(valueOf(row)) || 0 : 0;
    out.push({ key, label: `${MONTH_SHORT[m]} ${year}`, value });
  }
  return out;
}

/**
 * A schedule item's `start`/`end` are wall-clock strings ("yyyy-MM-dd HH:mm[:ss]") in the item's own `timezone`.
 * Returns the instant, or null when the value is not a date-time.
 */
export function wallTimeToDate(value, timeZone) {
  const text = String(value ?? "").trim().replace("T", " ");
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) return null;
  const date = fromZonedTime(text, resolveTimeZone(timeZone));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "9:30 AM" — an instant shown in `timeZone`. */
export function clockInZone(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", { timeZone: resolveTimeZone(timeZone), hour: "numeric", minute: "2-digit", hour12: true })
    .format(date)
    .replace(/[  ]/g, " ");
}

/**
 * Legacy updateClassStatusBadges: between start and end "Live"; after the end the item's own classStatus (red when
 * it is "Not Started" or empty, grey otherwise); before the start "Upcoming".
 */
export function scheduleBadge(item, now = new Date()) {
  const start = wallTimeToDate(item.start, item.timezone);
  const end = wallTimeToDate(item.end, item.timezone);
  if (!start || !end) return null;
  const t = now.getTime();
  if (t >= start.getTime() && t <= end.getTime()) return { label: "Live", tone: "live" };
  if (t > end.getTime()) {
    const status = String(item.classStatus ?? "").trim();
    return { label: status || "Not Started", tone: !status || /^not started$/i.test(status) ? "danger" : "muted" };
  }
  return { label: "Upcoming", tone: "warning" };
}

/**
 * The rows the home payments card shows (legacy): only SCHEDULED rows with a scheduled date. "Due" when that date
 * is today or earlier, "Upcoming" after. `today` is "YYYY-MM-DD"; dates are compared as plain date strings, so
 * the formatted `scheduledPayDate` is parsed with Date and read back in local parts.
 */
export function duePayments(rows, now = new Date()) {
  const list = Array.isArray(rows) ? rows : [];
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return list
    .filter((r) => r?.status === "SCHEDULED" && String(r.scheduledPayDate ?? "").trim())
    .map((r) => {
      const due = new Date(r.scheduledPayDate);
      const overdue = !Number.isNaN(due.getTime()) && new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() <= midnight;
      return { id: r.id, name: String(r.paymentName ?? "").replace(/<br\s*\/?>/gi, " "), date: r.scheduledPayDate, overdue };
    });
}

/** Legacy: a non-empty list where every row is SUCCESS earns the thank-you ribbon instead of a footer link. */
export const allPaymentsSuccessful = (rows) => Array.isArray(rows) && rows.length > 0 && rows.every((r) => r?.status === "SUCCESS");
