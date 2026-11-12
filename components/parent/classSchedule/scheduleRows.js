import { addDaysYmd, parseYmd, resolveTimeZone, todayYmd, weekStartYmd } from "@/utils/attendanceDates";
import { clockInZone, scheduleBadge, wallTimeToDate } from "@/utils/parentHome";
import { salutation } from "@/components/parent/teachers/teacherRows";

/**
 * Pure helpers of the parent Class Schedule and Class Summary pages (legacy parentStudentClassSchedule.js and
 * parentStudentClassSummary.js). Dates are "yyyy-MM-dd" strings in the CHILD's timezone; an item's start/end are
 * wall-clock strings in the item's own timezone, converted to instants and shown in the child's.
 */

export const MAX_RANGE_DAYS = 92; // longest custom range shown (one table block per day)
export const LOOKBACK_DAYS = 365; // how far the custom date pickers reach
export const VIEWS = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "custom", label: "Custom" },
];

/** Days shown by the schedule page: today, this week (Sunday to Saturday) or the applied custom range. */
export function scheduleRange(view, today, custom) {
  if (view === "day") return { start: today, end: today };
  if (view === "week") {
    const start = weekStartYmd(today);
    return { start, end: addDaysYmd(start, 6) };
  }
  return custom ? { start: custom.from, end: custom.to } : null;
}

/** Days shown by the summary page (past only): yesterday, the 7 days up to yesterday, or the custom range (end <= today). */
export function summaryRange(view, today, custom) {
  const yesterday = addDaysYmd(today, -1);
  if (view === "day") return { start: yesterday, end: yesterday };
  if (view === "week") return { start: addDaysYmd(yesterday, -6), end: yesterday };
  return custom ? { start: custom.from, end: custom.to > today ? today : custom.to } : null;
}

/** The request range: the shown days padded by one day each side (legacy), so items near midnight in another zone are not lost. */
export function apiRange(range) {
  return range ? { startDate: addDaysYmd(range.start, -1), endDate: addDaysYmd(range.end, 1) } : null;
}

/** Date-picker limits of the custom range: the schedule looks ahead, the summary looks back. */
export function customBounds(kind, today) {
  return kind === "schedule"
    ? { min: today, max: addDaysYmd(today, LOOKBACK_DAYS) }
    : { min: addDaysYmd(today, -LOOKBACK_DAYS), max: today };
}

/** An error message, or null when `from`..`to` is an allowed custom range for the page. */
export function validateCustomRange(kind, from, to, today) {
  if (!parseYmd(from) || !parseYmd(to)) return "Please select both a start date and an end date.";
  if (to < from) return "The end date cannot be before the start date.";
  const { min, max } = customBounds(kind, today);
  if (from < min) return kind === "schedule" ? "The start date cannot be in the past." : "That start date is too far back.";
  if (to > max) return kind === "schedule" ? "That end date is too far ahead." : "The end date cannot be in the future.";
  let days = 1;
  for (let day = from; day < to && days <= MAX_RANGE_DAYS; day = addDaysYmd(day, 1)) days += 1;
  if (days > MAX_RANGE_DAYS) return `Please choose a range of up to ${MAX_RANGE_DAYS} days.`;
  return null;
}

const attendanceOf = (item) => String(item?.classesAttendance ?? "").trim().toLowerCase();

/**
 * The backend items as display events: start/end as instants, `dateKey` = the day the class starts in the child's
 * timezone. Items whose start or end is not a date-time are dropped.
 */
export function toEvents(items, timeZone) {
  const zone = resolveTimeZone(timeZone);
  if (!Array.isArray(items)) return [];
  return items.flatMap((item, index) => {
    const start = wallTimeToDate(item?.start, item?.timezone);
    const end = wallTimeToDate(item?.end, item?.timezone);
    if (!start || !end) return [];
    const attendance = attendanceOf(item);
    const name = String(item.teacherName ?? "").trim();
    return [
      {
        key: `${item.id ?? "item"}|${item.meetingId ?? ""}|${item.start}|${item.end}|${index}`,
        category: item.category === "ACTIVITY" ? "ACTIVITY" : "CLASS",
        courseName: String(item.courseName ?? "").trim() || String(item.entityName ?? "").trim() || "N/A",
        teacher: name ? `${salutation(item.teacherGender)} ${name}`.trim() : "N/A",
        start,
        end,
        dateKey: todayYmd(zone, start),
        minutes: Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)),
        attended: attendance === "attended",
        attending: attendance === "attending",
        attendanceDuration: String(item.classesAttendanceDuration ?? "").trim(),
        meetingId: String(item.meetingId ?? "").trim(),
        raw: item,
      },
    ];
  });
}

/**
 * The events a page shows for `range`. "schedule": classes that have not ended yet (legacy drops the finished ones).
 * "summary": classes that ended and were attended or are being attended (legacy).
 */
export function visibleEvents(events, range, kind, now) {
  if (!range) return [];
  const t = now.getTime();
  return events.filter((event) => {
    if (event.dateKey < range.start || event.dateKey > range.end) return false;
    if (kind === "schedule") return event.end.getTime() >= t;
    return event.end.getTime() < t && (event.attended || event.attending);
  });
}

export function countByCategory(events) {
  const classes = events.filter((e) => e.category === "CLASS").length;
  return { all: events.length, classes, activities: events.length - classes };
}

/** "Wednesday, Feb 25, 2026" from "yyyy-MM-dd" (a plain calendar date, not run through a timezone). */
export function dayHeading(ymd) {
  const p = parseYmd(ymd);
  if (!p) return ymd;
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** One block per day of `range` (empty days included, as the legacy table), the events sorted by start; `category` ALL|CLASS|ACTIVITY. */
export function groupByDay(events, range, category = "ALL") {
  if (!range || !parseYmd(range.start) || !parseYmd(range.end)) return [];
  const days = [];
  for (let ymd = range.start; ymd <= range.end && days.length <= MAX_RANGE_DAYS + 2; ymd = addDaysYmd(ymd, 1)) {
    const rows = events
      .filter((e) => e.dateKey === ymd && (category === "ALL" || e.category === category))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    days.push({ ymd, heading: dayHeading(ymd), rows });
  }
  return days;
}

/** "9:30 AM to 10:30 AM | 60 min" in the child's timezone. */
export function timeRange(event, timeZone) {
  return `${clockInZone(event.start, timeZone)} to ${clockInZone(event.end, timeZone)} | ${event.minutes} min`;
}

/** The Classes Attendance cell: "Attended | 45 min", "Attending" or "N/A". */
export function attendanceLabel(event) {
  if (event.attended) return event.attendanceDuration ? `Attended | ${event.attendanceDuration}` : "Attended";
  if (event.attending) return "Attending";
  return "N/A";
}

/**
 * The Status badge { label, tone } (legacy getEventStatus): Live while running, Upcoming before, after the end
 * "Completed" for an attended class, else the item's own status (red "Not Started" when empty).
 */
export function eventStatus(event, now) {
  const badge = scheduleBadge(event.raw, now);
  if (!badge) return { label: "Upcoming", tone: "warning" };
  if (now.getTime() > event.end.getTime() && (event.attended || event.attending)) return { label: "Completed", tone: "muted" };
  return badge;
}

/** The facts the summary sheet shows about the class: course, teacher, date, time, duration. */
export function eventMeta(event, timeZone) {
  const zone = resolveTimeZone(timeZone);
  return {
    course: event.courseName,
    teacher: event.teacher,
    date: new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "long", day: "numeric" }).format(event.start),
    time: `${clockInZone(event.start, zone)} - ${clockInZone(event.end, zone)}`,
    duration: `${event.minutes} minutes`,
  };
}
