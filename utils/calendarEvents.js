/**
 * Student dashboard calendar — event normalization, classification, status and
 * filtering logic. A faithful port of the legacy jQuery implementation
 * (is-rest-api: static/theme2/js/custom/dashboardCalendarNew.js) kept
 * framework-agnostic (no DOM/jQuery) so it can be shared by the Today/Week/
 * Month views and the sidebar filters.
 *
 * Backend shape: CalendarEventDTO (is-rest-api
 * com.c2e.is.api.v1.calendar.dto.CalendarEventDTO) — field names below match
 * the DTO/legacy JS exactly.
 */

import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, isValid, startOfMonth, startOfWeek } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export const DEFAULT_COURSE_PALETTE = [
  "#f06292",
  "#2196f3",
  "#f44336",
  "#c9a800",
  "#673ab7",
  "#795548",
  "#1a237e",
  "#800000",
  "#cc0099",
  "#006d77",
];

export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function isTodayView(viewName) {
  return viewName === "today" || !viewName;
}

// Maps our view names to the legacy backend "agenda" request field.
export function getBackendAgenda(viewName) {
  if (viewName === "today") return "agendaDay";
  if (viewName === "week") return "agendaWeek";
  return "month";
}

function safeId(value) {
  return String(value || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
}

// Parses a date-ish string that may or may not carry an explicit UTC offset,
// returning a real Date (instant) converted for display in `timezone`.
// Without an offset, the legacy backend sends a naive wall-clock string that
// is local to `fromTimezone` (CalendarEventDTO.timezone, e.g. "Asia/Singapore"
// for an activity scheduled by a teacher in that zone) — NOT UTC. Only when
// no fromTimezone is given do we fall back to treating it as UTC.
function normalizeDateTime(value, timezone, fromTimezone) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const hasOffset = /Z$/.test(raw) || /[+-]\d\d:?\d\d$/.test(raw);
  const isoLike = raw.includes("T") ? raw : raw.replace(" ", "T");
  if (hasOffset) {
    const parsed = parseISO(isoLike);
    return isValid(parsed) ? toZonedTime(parsed, timezone) : null;
  }
  if (fromTimezone) {
    const parsed = fromZonedTime(isoLike, fromTimezone);
    return isValid(parsed) ? toZonedTime(parsed, timezone) : null;
  }
  const parsed = parseISO(`${isoLike}Z`);
  return isValid(parsed) ? toZonedTime(parsed, timezone) : null;
}

export function classifyEventKind(event) {
  const id = String(event.id || "");
  const category = String(event.category || event.eventType || "").toUpperCase();
  if (id.startsWith("holiday") || category.includes("HOLIDAY")) return "holiday";
  if (id.startsWith("announce") || category.includes("ANNOUNCE") || category.includes("EVENT")) return "schoolEvent";
  if (id.startsWith("activity") || category.includes("ACTIVITY")) return "activity";
  if (category.includes("ASSIGNMENT")) return "assignment";
  return "class";
}

export function getCourseId(event) {
  return safeId(event.courseId || event.subjectId || event.standardId || event.category || event.eventType || "classes");
}

export function getCourseLabel(event) {
  return event.courseName || event.subjectName || event.eventTitle || event.category || event.eventType || "Classes";
}

/**
 * Normalizes one raw CalendarEventDTO into the shape every view renders.
 * `courseDetails` (SchoolCalendarDTO.courseDetails, { subjectId, subjectName })
 * is used to recover a courseId for CLASS events missing subjectId, matching
 * by title the same way the legacy code does.
 */
export function normalizeCalendarEvent(rawEvent, { timezone, courseDetails = [] } = {}) {
  const tz = timezone || getBrowserTimezone();
  const eventKind = classifyEventKind(rawEvent);

  let startZoned;
  if (eventKind === "assignment" && (rawEvent.dueDate || rawEvent.paceDate)) {
    // Assignments carry a plain due date with no time/timezone: treat it as
    // that exact calendar day, no UTC round-trip (avoids shifting a day back
    // for timezones behind UTC).
    const dateOnly = String(rawEvent.dueDate || rawEvent.paceDate).slice(0, 10);
    startZoned = parseISO(`${dateOnly}T00:00:00`);
  } else {
    startZoned = normalizeDateTime(rawEvent.start || rawEvent.startDateTime || rawEvent.dueDate || rawEvent.paceDate, tz, rawEvent.timezone);
  }
  const endZoned = normalizeDateTime(rawEvent.end || rawEvent.endDateTime, tz, rawEvent.timezone);
  const allDay = rawEvent.allDay === true || eventKind === "holiday";

  let courseId = getCourseId(rawEvent);
  if (eventKind === "class" && !rawEvent.subjectId && rawEvent.eventTitle && courseDetails?.length) {
    const match = courseDetails.find((c) => getCourseLabel(c) === rawEvent.eventTitle);
    if (match) courseId = getCourseId(match);
  }

  let title = rawEvent.eventTitle;
  if (!title && eventKind !== "class") {
    title = rawEvent.title || "";
  } else if (rawEvent.category === "CLASS" && ["CUSTOM", "PTM", "BATCH"].includes(rawEvent.eventType)) {
    title = rawEvent.title || "";
  } else if (title && rawEvent.category === "BATCH") {
    title = rawEvent.title || "";
  } else {
    title = "";
  }

  const effectiveEnd = endZoned || (startZoned ? addMinutesOrEndOfDay(startZoned, allDay) : null);

  return {
    ...rawEvent,
    id: rawEvent.id || rawEvent.eventId || `event-${Math.random().toString(36).slice(2)}`,
    title,
    eventKind,
    courseId,
    allDay,
    startZoned,
    endZoned: effectiveEnd,
    localDateKey: startZoned ? format(startZoned, "yyyy-MM-dd") : "",
    displayTime: startZoned && effectiveEnd && !allDay ? `${format(startZoned, "hh:mm a")} - ${format(effectiveEnd, "hh:mm a")}` : "",
    origName: rawEvent.name || rawEvent.teacherName || "",
  };
}

function addMinutesOrEndOfDay(startZoned, allDay) {
  if (allDay) {
    const end = new Date(startZoned);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  return new Date(startZoned.getTime() + 30 * 60 * 1000);
}

export function normalizeCalendarEvents(rawEvents, opts) {
  return (rawEvents || []).map((e) => normalizeCalendarEvent(e, opts));
}

// ── Status (live / upcoming / completed) ────────────────────────────────────

export function isEventActive(event, now = new Date()) {
  if (!event.startZoned || !event.endZoned || event.allDay) return false;
  return now >= event.startZoned && now < event.endZoned;
}

export function getEventStatus(event, now = new Date()) {
  if (event.allDay || !event.startZoned || !event.endZoned) {
    const today = startOfDay(now);
    const eventDay = event.startZoned ? startOfDay(event.startZoned) : today;
    return eventDay < today ? "completed" : "upcoming";
  }
  if (isEventActive(event, now)) return "live";
  if (now < event.startZoned) return "upcoming";
  return "completed";
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toTriBool(value) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return undefined;
}

// Fine-grained status for a COMPLETED class, from recorded attendance.
export function getClassCompletionStatus(event) {
  const attended = toTriBool(event.attended);
  const lateSeconds = Number(event.lateSeconds) || 0;
  if (attended === false) return "missed";
  if (attended === true && (toTriBool(event.onTime) === false || lateSeconds > 0)) return "lateJoin";
  return "past";
}

export function getEventDisplayStatus(event, now = new Date()) {
  const status = getEventStatus(event, now);
  if (status === "completed" && event.eventKind === "class") return getClassCompletionStatus(event);
  return status;
}

// ── Assignment status (submitted / pending / upcoming) ──────────────────────

export function getAssignmentStatus(event, now = new Date()) {
  const todayKey = format(now, "yyyy-MM-dd");
  const dueDate = event.dueDate || event.paceDate || "";
  const isSubmitted = String(event.assignmentType || "").toLowerCase() === "submitted";

  if (isSubmitted) {
    const submittedDate = event.submittedDate || "";
    const result = { status: "submitted", label: "Submitted", timingLabel: "On Time", dateDisplay: "" };
    if (submittedDate) {
      result.dateDisplay = formatDateOnly(submittedDate);
      if (dueDate) {
        const diffDays = diffDaysDateOnly(dueDate, submittedDate);
        if (diffDays > 0) result.timingLabel = `Early (${diffDays} Day${diffDays === 1 ? "" : "s"})`;
        else if (diffDays < 0) {
          const late = Math.abs(diffDays);
          result.timingLabel = `Late (${late} Day${late === 1 ? "" : "s"})`;
        }
      }
    } else if (dueDate) {
      result.dateDisplay = formatDateOnly(dueDate);
    }
    return result;
  }

  if (dueDate && dueDate.slice(0, 10) > todayKey) {
    return { status: "upcoming", label: "Upcoming", timingLabel: null, dateDisplay: formatDateOnly(dueDate) };
  }
  return { status: "pending", label: "Pending", timingLabel: null, dateDisplay: "" };
}

function formatDateOnly(value) {
  const d = parseISO(String(value).slice(0, 10));
  return isValid(d) ? format(d, "MMM d, yyyy") : "";
}

function diffDaysDateOnly(dueDate, submittedDate) {
  const due = parseISO(String(dueDate).slice(0, 10));
  const submitted = parseISO(String(submittedDate).slice(0, 10));
  if (!isValid(due) || !isValid(submitted)) return 0;
  return Math.round((due.getTime() - submitted.getTime()) / 86400000);
}

// ── Course registration / colors ────────────────────────────────────────────

/**
 * "My Courses" registry. `courseDetails` (SchoolCalendarDTO.courseDetails,
 * { subjectId, subjectName }) lists EVERY course the student is enrolled in,
 * regardless of whether it has an event in the currently-fetched window —
 * the legacy sidebar always shows all of a student's subjects, not just ones
 * with visible events — so it seeds the registry first; any CLASS event's
 * course not already covered (e.g. a BATCH class without a matching subject)
 * is added on top.
 */
export function buildCourseRegistry(events, storedColors = {}, courseDetails = []) {
  const registry = {};
  let colorIndex = 0;

  const addCourse = (id, label, eventColor) => {
    if (registry[id]) return;
    const defaultColor = DEFAULT_COURSE_PALETTE[colorIndex % DEFAULT_COURSE_PALETTE.length];
    colorIndex += 1;
    registry[id] = { id, label, color: storedColors[id] || eventColor || defaultColor };
  };

  // Backend can send `courseDetails: null` explicitly (e.g. depending on
  // role/date-range) rather than omitting it, which bypasses the default
  // parameter above — guard here too.
  for (const course of courseDetails || []) {
    addCourse(getCourseId(course), getCourseLabel(course));
  }
  for (const event of events) {
    if (event.eventKind !== "class") continue;
    addCourse(event.courseId, getCourseLabel(event), event.color);
  }
  return registry;
}

function hexToRgb(hex) {
  let value = String(hex || "#888888").replace("#", "");
  if (value.length === 3) value = value.split("").map((c) => c + c).join("");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function colorWithAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function getCourseColor(courseRegistry, courseId) {
  return courseRegistry?.[courseId]?.color || "#1a73e8";
}

export function getEventColor(event, courseRegistry) {
  if (event.eventKind === "holiday") return "#1b5e20";
  if (event.eventKind === "activity") return "#2267f0";
  return getCourseColor(courseRegistry, event.courseId);
}

// ── Filters ──────────────────────────────────────────────────────────────

export const DEFAULT_CALENDAR_FILTERS = {
  courseVisibility: {},
  classes: true,
  activities: true,
  schoolEvents: true,
  holidays: true,
  pendingAssignments: true,
  submittedAssignments: true,
  upcomingAssignments: true,
  liveActivities: true,
  upcomingActivities: true,
  pastActivities: true,
  missedClasses: true,
  lateJoinClasses: true,
};

export function applyCalendarFilters(events, filters, now = new Date()) {
  return events.filter((event) => {
    if ((event.eventKind === "class" || event.eventKind === "assignment") && filters.courseVisibility[event.courseId] === false) {
      return false;
    }
    if (event.eventKind === "class" && !filters.classes) return false;
    if (event.eventKind === "activity" && !filters.activities) return false;
    if (event.eventKind === "schoolEvent" && !filters.schoolEvents) return false;
    if (event.eventKind === "holiday" && !filters.holidays) return false;

    if (event.eventKind === "assignment") {
      const aStatus = getAssignmentStatus(event, now);
      if (aStatus.status === "submitted" && !filters.submittedAssignments) return false;
      if (aStatus.status === "upcoming" && !filters.upcomingAssignments) return false;
      if (aStatus.status === "pending" && !filters.pendingAssignments) return false;
    }

    if (event.eventKind === "class") {
      const status = getEventStatus(event, now);
      if (status === "live" && !filters.liveActivities) return false;
      if (status === "upcoming" && !filters.upcomingActivities) return false;
      if (status === "completed") {
        if (!filters.pastActivities) return false;
        const completion = getClassCompletionStatus(event);
        if (completion === "missed" && !filters.missedClasses) return false;
        if (completion === "lateJoin" && !filters.lateJoinClasses) return false;
      }
    }
    return true;
  });
}

// ── Grouping ─────────────────────────────────────────────────────────────

function isTimedEvent(event) {
  return event.eventKind === "class" || event.eventKind === "activity" || event.eventKind === "schoolEvent";
}

function eventSortValue(event, now) {
  if (isEventActive(event, now)) return -1;
  return event.startZoned ? event.startZoned.getTime() : Number.MAX_SAFE_INTEGER;
}

export function groupEventsByLocalDate(events, now = new Date()) {
  const groups = {};
  for (const event of events) {
    if (!event.startZoned) continue;
    const key = event.localDateKey;
    if (!groups[key]) groups[key] = { date: startOfDay(event.startZoned), events: [] };
    groups[key].events.push(event);
  }
  return Object.keys(groups)
    .sort()
    .map((key) => {
      const group = groups[key];
      group.events.sort((a, b) => eventSortValue(a, now) - eventSortValue(b, now));
      return group;
    });
}

// ── Week view helpers ────────────────────────────────────────────────────

export function getWeekDays(selectedDate) {
  const start = startOfWeek(selectedDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Buckets events for the week grid: each day key ("yyyy-MM-dd") holds its
 * all-day events and a map of hour (0-23) -> timed events starting that hour.
 * Mirrors the legacy renderCustomWeekView's bucketing (max visible columns
 * per bucket is a rendering concern, left to the component).
 */
export function bucketEventsForWeek(events, weekDays) {
  const dayKeys = new Set(weekDays.map((d) => format(d, "yyyy-MM-dd")));
  const buckets = {};
  for (const key of dayKeys) buckets[key] = { allDay: [], byHour: {} };

  for (const event of events) {
    if (!dayKeys.has(event.localDateKey)) continue;
    const bucket = buckets[event.localDateKey];
    if (event.allDay) {
      bucket.allDay.push(event);
      continue;
    }
    const hour = event.startZoned ? event.startZoned.getHours() : 0;
    if (!bucket.byHour[hour]) bucket.byHour[hour] = [];
    bucket.byHour[hour].push(event);
  }
  return buckets;
}

// ── Month view helpers ───────────────────────────────────────────────────

// The full 6-week grid a month view needs: every day from the Sunday on/before
// the 1st through the Saturday on/after the last day of the month.
export function getMonthGridDays(selectedDate) {
  const start = startOfWeek(startOfMonth(selectedDate));
  const end = endOfWeek(endOfMonth(selectedDate));
  return eachDayOfInterval({ start, end });
}

export function bucketEventsByDate(events) {
  const buckets = {};
  for (const event of events) {
    if (!event.localDateKey) continue;
    if (!buckets[event.localDateKey]) buckets[event.localDateKey] = [];
    buckets[event.localDateKey].push(event);
  }
  return buckets;
}

export function getTodayGroups(events, now = new Date()) {
  const todayKey = format(now, "yyyy-MM-dd");
  const groups = { live: [], upcoming: [], completed: [] };
  for (const event of events) {
    if (event.localDateKey !== todayKey || event.allDay || !isTimedEvent(event)) continue;
    if (isEventActive(event, now)) groups.live.push(event);
    else if (event.startZoned && now < event.startZoned) groups.upcoming.push(event);
    else groups.completed.push(event);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => (a.startZoned?.getTime() || 0) - (b.startZoned?.getTime() || 0));
  }
  return groups;
}
