/**
 * Grade K–5 home planner model (docs/migration/grade_k5_dashboard_plan.html, Phase 2).
 * Turns the normalized school-calendar events (utils/calendarEvents.js — same data and
 * status rules as the existing calendar) into per-day buckets the Day / Week / Month
 * plans render. Pure functions: `now` is the current wall-clock time in the planner's
 * timezone, so live / done / upcoming match what the student sees on the clock.
 */

import { addDays, format, getDay, parseISO } from "date-fns";
import { getAssignmentStatus, getEventStatus } from "@/utils/calendarEvents";

export const dayKey = (date) => format(date, "yyyy-MM-dd");
export const keyToDate = (key) => parseISO(`${key}T00:00:00`);
export const isWeekendKey = (key) => [0, 6].includes(getDay(keyToDate(key)));

const CLASS_STATUS = { completed: "done", live: "live", upcoming: "next" };

function emptyDay() {
  return { classes: [], activities: [], assignments: [], holidays: [] };
}

/** { [yyyy-MM-dd]: { classes, activities, assignments, holidays } }, each list sorted by start. */
export function buildDayMap(events, now) {
  const days = {};
  for (const event of events) {
    if (!event.localDateKey) continue;
    const day = (days[event.localDateKey] ||= emptyDay());
    if (event.eventKind === "class") day.classes.push({ ...event, k5Status: CLASS_STATUS[getEventStatus(event, now)] });
    else if (event.eventKind === "activity" || event.eventKind === "schoolEvent")
      day.activities.push({ ...event, k5Status: CLASS_STATUS[getEventStatus(event, now)] });
    else if (event.eventKind === "assignment") day.assignments.push({ ...event, k5Assignment: getAssignmentStatus(event, now) });
    else if (event.eventKind === "holiday") day.holidays.push(event);
  }
  const byStart = (a, b) => (a.startZoned?.getTime() || 0) - (b.startZoned?.getTime() || 0);
  Object.values(days).forEach((day) => {
    day.classes.sort(byStart);
    day.activities.sort(byStart);
  });
  return days;
}

export function dayAt(days, key) {
  return days[key] || emptyDay();
}

export function countStatuses(classes) {
  return {
    done: classes.filter((c) => c.k5Status === "done").length,
    live: classes.filter((c) => c.k5Status === "live").length,
    next: classes.filter((c) => c.k5Status === "next").length,
  };
}

/**
 * Why a day has no classes, for the "No classes" card. Self-Study students (SCHOLARSHIP /
 * SSP) rarely have live classes, so a plain weekday is a course-work day for them, never
 * "game day" (plan section 6.1).
 */
export function noClassReason(key, day, { isSelfStudy, firstName }) {
  if (day.holidays.length) return { kind: "holiday", title: day.holidays[0].title || day.holidays[0].eventTitle || "Holiday", text: "It's a holiday. No school today!" };
  if (isWeekendKey(key)) return { kind: "weekend", title: "Weekend!", text: "It's the weekend. No school today!" };
  if (isSelfStudy) return { kind: "study", title: "No live classes", text: "Keep going with your courses today!" };
  return { kind: "free", title: "No classes!", text: `There are no classes today. Enjoy your free day${firstName ? `, ${firstName}` : ""}!` };
}

/** Short summary for a day (month summary bar, tomorrow card). */
export function daySummary(key, day, todayKey, { isSelfStudy }) {
  const parts = [];
  if (day.holidays.length) parts.push(`${day.holidays[0].title || day.holidays[0].eventTitle || "Holiday"} · No school`);
  if (day.classes.length) {
    const { done, live } = countStatuses(day.classes);
    const n = `${day.classes.length} class${day.classes.length === 1 ? "" : "es"}`;
    if (live) parts.push(`${n} · ${classTitle(day.classes.find((c) => c.k5Status === "live"))} is live now!`);
    else if (done === day.classes.length && key <= todayKey) parts.push(`${n} · all done`);
    else parts.push(n);
  }
  if (day.assignments.length) parts.push(`${day.assignments.length} assignment${day.assignments.length === 1 ? "" : "s"} due`);
  if (day.activities.length) parts.push(day.activities[0].title || day.activities[0].eventTitle || "School activity");
  if (!parts.length) parts.push(isWeekendKey(key) ? "Weekend! No school." : isSelfStudy ? "No live classes. Course work day!" : "No classes today. Free day!");
  return parts.join(" · ");
}

/** The Monday-to-Sunday week containing `date` (mockup: 5 school days + Sat · Sun), as day keys. */
export function weekKeys(date) {
  const start = addDays(date, -((getDay(date) + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => dayKey(addDays(start, i)));
}

export const classTitle = (event) => event.courseName || event.subjectName || event.eventTitle || event.title || "Class";
export const activityTitle = (event) => event.title || event.eventTitle || "School activity";
export const timeLabel = (event) => (event.startZoned && !event.allDay ? format(event.startZoned, "h:mm a") : "");
export const timeRange = (event) =>
  event.startZoned && event.endZoned && !event.allDay ? `${format(event.startZoned, "h:mm")} – ${format(event.endZoned, "h:mm a")}` : "";

/** "Ms. Lily Morgan" -> "LM" for the teacher bubble. */
export function initials(name) {
  return String(name || "")
    .replace(/^(Mr|Mrs|Ms|Miss|Dr)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** Teacher line as the existing calendar shows it (salutation + name). */
export function teacherName(event) {
  const name = String(event.origName || event.teacherName || "").trim();
  if (!name) return "";
  return event.salutation ? `${event.salutation}. ${name}` : name;
}

// Subject → icon key + tint pair (mockup: math blue, science green, language pink, computers violet, civics mustard).
const SUBJECTS = [
  [/math|algebra|geometry|calculus|statistic/i, "math", "bg-k5-bt", "text-k5-bi", "var(--k5-bI)"],
  [/science|biology|physics|chemistry|environment/i, "science", "bg-k5-tt", "text-k5-ti", "var(--k5-tI)"],
  [/english|language|reading|writing|literature|spanish|french|german|chinese/i, "language", "bg-k5-pt", "text-k5-pi", "var(--k5-pI)"],
  [/computer|technology|coding|programming/i, "computer", "bg-k5-vt", "text-k5-vi", "var(--k5-vI)"],
  [/social|history|geography|civics|government/i, "civics", "bg-k5-mt", "text-k5-mi", "var(--k5-mI)"],
  [/art|music|drama/i, "art", "bg-k5-ot", "text-k5-oi", "var(--k5-oI)"],
  [/physical|health|fitness|\bpe\b/i, "pe", "bg-k5-tt", "text-k5-ti", "var(--k5-tI)"],
];
export function subjectStyle(name) {
  const match = SUBJECTS.find(([re]) => re.test(String(name || "")));
  return match
    ? { icon: match[1], tile: match[2], ink: match[3], color: match[4] }
    : { icon: "book", tile: "bg-k5-soft", ink: "text-k5-acx", color: "var(--k5-acx)" };
}

// Week-day heads (mockup WC): Sun..Sat colour + its darker shadow.
export const WEEKDAY_HEAD = ["#C92F6E", "#C2410C", "#8A6A00", "#237A45", "#0F766E", "#2563EB", "#6A3FC4"];
export const WEEKDAY_SHADOW = ["#8F1F4E", "#8A2E08", "#5E4800", "#145A29", "#0B5E58", "#1747A6", "#4C2A94"];
// Mini / month calendar weekday letters use the tint "I" colours (mockup wkN).
export const WEEKDAY_TEXT = ["text-k5-pi", "text-k5-oi", "text-k5-mi", "text-k5-gi", "text-k5-ti", "text-k5-bi", "text-k5-vi"];

// Colour clues (mockup --cAsg, --cDone, --cLive, --cUp, --cAct, --cHol) as theme tokens, so
// night mode and the colour-blind palette (app/appearance.css) can swap them.
export const CLUE_COLORS = {
  assignment: "var(--k5-c-asg)",
  done: "var(--k5-c-done)",
  live: "var(--k5-c-live)",
  liveTint: "var(--k5-c-live-t)",
  liveText: "var(--k5-c-live-x)",
  upcoming: "var(--k5-c-up)",
  upcomingTint: "var(--k5-c-up-t)",
  activity: "var(--k5-c-act)",
  activityText: "var(--k5-c-act-x)",
  activityShadow: "var(--k5-c-act-d)",
  holiday: "var(--k5-c-hol)",
};

/** A course colour from the calendar data, only if it is a plain hex (never raw CSS from the API). */
export function safeCourseColor(value) {
  return /^#[0-9a-f]{3,8}$/i.test(String(value || "").trim()) ? String(value).trim() : null;
}

/** Soft background for a course colour: the colour mixed into the card, so night mode still works. */
export function courseTint(color) {
  return `color-mix(in srgb, ${color} 16%, var(--k5-card))`;
}
