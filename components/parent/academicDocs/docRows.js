import { addDaysYmd, monthStartYmd, parseYmd, todayYmd, weekStartYmd } from "@/utils/attendanceDates";

/** Legacy PARENT_ACADEMIC_DOCS_FILTER_VIEW: Weekly / Monthly (current week or month by graduation date); "all" is an addition. */
export const VIEWS = [
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "all", label: "All" },
];

/** Last day of the month of a "yyyy-MM-dd" date. */
function monthEndYmd(ymd) {
  const p = parseYmd(ymd);
  const last = new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
  return `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/**
 * Legacy parentAcademicDocsFilterRows: rows whose graduationDate (strict yyyy-MM-dd) falls inside this week (Sunday to
 * Saturday) or this month, inclusive, "today" being the child's calendar day in `timeZone` (missing/invalid -> Asia/Singapore
 * via todayYmd). A row without a valid date is never in Weekly/Monthly. "all" keeps every row.
 */
export function filterRows(rows, view, timeZone, now = new Date()) {
  if (view === "all") return rows;
  const today = todayYmd(timeZone, now);
  const from = view === "month" ? monthStartYmd(today) : weekStartYmd(today);
  const to = view === "month" ? monthEndYmd(today) : addDaysYmd(from, 6);
  return rows.filter((row) => parseYmd(row.graduationDate) && row.graduationDate >= from && row.graduationDate <= to);
}
