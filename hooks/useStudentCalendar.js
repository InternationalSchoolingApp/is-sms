"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { addDays, addMonths, addWeeks, endOfMonth, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { getLiveClassAttendanceStatus, getSchoolCalendar } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import {
  DEFAULT_CALENDAR_FILTERS,
  applyCalendarFilters,
  buildCourseRegistry,
  getBrowserTimezone,
  isEventActive,
  normalizeCalendarEvents,
} from "@/utils/calendarEvents";
import { buildFeedbackInfo } from "@/utils/classFeedback";
import { notifyFeedbackEventEnded } from "@/utils/feedbackEvents";

const STORAGE_KEY = "studentDashboardCalendarNew";

// Legacy getUtcClassStartTime / getAttendanceEntityType: what the attendance-status call needs to find the class.
function utcClassStart(event) {
  const raw = event.classStartTime || event.classDate || event.occurrenceDate || event.start;
  if (!raw) return raw;
  const text = String(raw).replace("T", " ");
  const hasOffset = /Z$/.test(text) || /[+-]\d\d:?\d\d$/.test(text);
  const instant = event.timezone && !hasOffset ? fromZonedTime(text, event.timezone) : new Date(hasOffset ? raw : `${text}Z`);
  return Number.isNaN(instant.getTime()) ? raw : formatInTimeZone(instant, "UTC", "yyyy-MM-dd HH:mm:ss");
}
const attendanceEntityType = (event) => event.entityType || (String(event.eventType || "").toUpperCase() === "BATCH" ? "BATCH_TEACHER_MAPPING" : "MEETINGS");

function loadStoredPrefs() {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveStoredPrefs(prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota/private-mode errors — preferences just won't persist
  }
}

// The fetch window for each view (old dashboard shell). "today" intentionally over-fetches by a day
// on either side (legacy behavior) and the UI filters down client-side, which
// avoids an extra request when the user nudges the date by one day.
function getFetchRange(viewName, selectedDate) {
  if (viewName === "week") {
    const start = startOfWeek(selectedDate);
    return { start, end: addDays(start, 6) };
  }
  if (viewName === "month") {
    const start = startOfMonth(selectedDate);
    return { start: addDays(start, -7), end: addDays(addMonths(start, 1), 7) };
  }
  return { start: addDays(selectedDate, -1), end: addDays(selectedDate, 1) };
}

// ── The Grade K–5 / Middle / High home asks for as few days as the legacy dashboard does ─────────────────────
// The backend works day by day (one holiday lookup per day), so the size of the window is the cost. Legacy requests:
//   first render  agendaDay   today .. today + 1        (the Today card and the Tomorrow card)
//   Today click   agendaDay   selected - 1 .. selected + 1
//   Week click    agendaWeek  the week (Monday .. Sunday here, the K–5 week)
//   Month click   month       the month
// Each window is its own request; the answers are merged, so what is already loaded is never requested for again.
const ymd = (date) => format(date, "yyyy-MM-dd");
const rangeOf = (start, end) => ({ startDate: ymd(start), endDate: ymd(end) });
const rangeKey = (r) => r.startDate + "|" + r.endDate;
const coveredBy = (ranges, from, to) => ranges.some((r) => r.startDate <= from && r.endDate >= to);

/** The month of `date`, first to last day (only these days show data in the mini calendar and the month plan). */
const monthRange = (date) => rangeOf(startOfMonth(date), endOfMonth(date));
/** The request for a month: one day more on each side (see lazyNeed). */
const monthAsk = (date) => rangeOf(addDays(startOfMonth(date), -1), addDays(endOfMonth(date), 1));

/**
 * What the current view needs: `must` = days that have to be loaded to draw it, `ask` = the window to request when they are not.
 * Every `ask` reaches one day further on each side (legacy asks yesterday / today / tomorrow): the backend answers by its own
 * dates, so a class just after midnight in the student's zone (12:30 AM Kolkata) is still "the day before" there and would
 * be missing until a wider request (the month) came in.
 */
function lazyNeed(viewName, selectedDate, anchor) {
  if (viewName === "week") {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const r = rangeOf(start, addDays(start, 6));
    return { must: [r.startDate, r.endDate], ask: rangeOf(addDays(start, -1), addDays(start, 7)) };
  }
  if (viewName === "month") {
    const r = monthRange(selectedDate);
    return { must: [r.startDate, r.endDate], ask: monthAsk(selectedDate) };
  }
  const day = ymd(selectedDate);
  // Today (the first render's day) also draws the Tomorrow card.
  const must = day === ymd(anchor) ? [day, ymd(addDays(anchor, 1))] : [day, day];
  return { must, ask: rangeOf(addDays(selectedDate, -1), addDays(selectedDate, 1)) };
}

// How long after the first answer the mini calendar's month is loaded in the background (its dots). It is a second,
// bigger request, so it waits for the first screen to be done. Set to null to load a month only when its view is opened.
const MONTH_PREFETCH_DELAY_MS = 1500;

/**
 * Options used by the Grade K–5 home (defaults keep the existing calendar unchanged):
 * `timezone` shows events in that zone instead of the browser's, `monthFetch` switches on the lazy windows above
 * (first render = yesterday + today + tomorrow, like legacy; Week / Month / other days are requested when opened), `prefetchMonth` also
 * loads the selected month in the background for the mini calendar's dots, and `initialDate` is the first selected date.
 */
export function useStudentCalendar({ schoolUUID, userId, timezone: timezoneOption, monthFetch = false, prefetchMonth = false, initialDate }) {
  const [viewName, setViewName] = useState("today");
  const [selectedDate, setSelectedDate] = useState(() => initialDate || new Date());
  const [anchor] = useState(() => startOfDay(initialDate || new Date()));
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_CALENDAR_FILTERS, ...(loadStoredPrefs().filters || {}) }));
  const [courseColors, setCourseColors] = useState(() => loadStoredPrefs().courseColors || {});
  const timezone = timezoneOption || getBrowserTimezone();
  const lazy = monthFetch;

  // The windows that have been requested for so far (lazy mode): the first render's, then whatever the student opened.
  // Like legacy: yesterday, today and tomorrow (see lazyNeed - a just-after-midnight class is on the backend's day before).
  const base = useMemo(() => rangeOf(addDays(anchor, -1), addDays(anchor, 1)), [anchor]);
  const [extras, setExtras] = useState([]);
  const addExtra = useCallback((range) => setExtras((prev) => (prev.some((r) => rangeKey(r) === rangeKey(range)) ? prev : [...prev, range])), []);

  const need = useMemo(() => {
    if (lazy) return lazyNeed(viewName, selectedDate, anchor);
    const { start, end } = getFetchRange(viewName, selectedDate);
    return { must: null, ask: rangeOf(start, end) };
  }, [lazy, viewName, selectedDate, anchor]);
  const requested = useMemo(() => (lazy ? [base, ...extras] : []), [lazy, base, extras]);
  const needsFetch = !lazy || !coveredBy(requested, need.must[0], need.must[1]);
  const wanted = useMemo(() => (lazy ? (needsFetch ? [...requested, need.ask] : requested) : [need.ask]), [lazy, requested, needsFetch, need]);
  // Remember the window being asked for (state adjusted while rendering, React's way): it stays loaded when the view changes.
  if (lazy && needsFetch && !extras.some((r) => rangeKey(r) === rangeKey(need.ask))) setExtras((prev) => [...prev, need.ask]);

  // Dummy (demo) student mode: legacy patchDummySchoolCalendar's generated classes/assignments/holidays/activities.
  const dummy = useDummyStudent();
  const enabled = Boolean(schoolUUID && userId && dummy.settled);
  const results = useQueries({
    queries: wanted.map((range) => ({
      queryKey: ["student-school-calendar", schoolUUID, userId, range.startDate, range.endDate, timezone, dummy.key],
      queryFn: () =>
        dummy.enabled
          ? dummy.student.calendar({ ...range, timezone })
          : getSchoolCalendar({ schoolUUID, userId, startDate: range.startDate, endDate: range.endDate }),
      enabled,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  });

  // The selected month's dots for the mini calendar, once the first screen is in (lazy mode, home only).
  const firstDone = lazy && Boolean(results[0]?.isSuccess);
  const monthKey = lazy ? rangeKey(monthRange(selectedDate)) : "";
  useEffect(() => {
    if (!lazy || !prefetchMonth || !firstDone || MONTH_PREFETCH_DELAY_MS === null) return undefined;
    const timer = setTimeout(() => addExtra(monthAsk(selectedDate)), MONTH_PREFETCH_DELAY_MS);
    return () => clearTimeout(timer);
    // selectedDate itself is not a dependency: only a different month matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lazy, prefetchMonth, firstDone, monthKey, addExtra]);

  // Merge the answers: events once each (a later answer replaces an earlier one), holidays together, the course list of the first.
  const signature = results.map((r) => r.dataUpdatedAt).join(",") + "#" + wanted.map(rangeKey).join(",");
  const loadedRanges = wanted.filter((_, i) => results[i]?.isSuccess);
  const data = useMemo(() => {
    const byKey = new Map();
    const holidays = new Set();
    let courseDetails;
    let anyData = false;
    results.forEach((r) => {
      const d = r.data;
      if (!d) return;
      anyData = true;
      (d.event || []).forEach((event) => byKey.set([event.id ?? event.eventId ?? "", event.start ?? event.dueDate ?? event.paceDate ?? "", event.eventType ?? ""].join("|"), event));
      (d.holidays || []).forEach((h) => holidays.add(h));
      if (courseDetails === undefined && d.courseDetails) courseDetails = d.courseDetails;
    });
    return anyData ? { event: [...byKey.values()], holidays: [...holidays], courseDetails } : null;
    // results is a new array every render; the signature says when it really changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  // Loading until the days the view draws are in (nothing to load without a signed-in student).
  const isLoading = !dummy.settled || (lazy ? enabled && !coveredBy(loadedRanges, need.must[0], need.must[1]) : Boolean(results[0]?.isLoading));
  const isError = isLoading && results.length > 0 && results.every((r) => r.isError);

  const baseEvents = useMemo(
    () => normalizeCalendarEvents(data?.event, { timezone, courseDetails: data?.courseDetails }),
    [data, timezone]
  );

  // Missed / Late refresh (legacy handleEventCompleted + refreshEventAttendance): when a class ends while the page is open,
  // ask for its freshest attendance so the status (Done / Missed / Late join) is right without a reload. Activities carry
  // none; on failure the event keeps what the calendar already gave. Not in demo mode.
  const [attendance, setAttendance] = useState({});
  const asked = useRef(new Set());
  const pageOpenedAt = useRef(null);
  useEffect(() => {
    if (!schoolUUID || !dummy.settled || dummy.enabled) return undefined;
    if (pageOpenedAt.current === null) pageOpenedAt.current = toZonedTime(new Date(), timezone);
    const check = () => {
      const now = toZonedTime(new Date(), timezone);
      baseEvents.forEach((event) => {
        if (event.eventKind !== "class" || !event.endZoned || asked.current.has(event.id)) return;
        if (event.endZoned > now || event.endZoned <= pageOpenedAt.current) return;
        asked.current.add(event.id);
        getLiveClassAttendanceStatus({
          schoolUUID,
          entityId: event.entityId || event.eventId || event.itemId,
          entityType: attendanceEntityType(event),
          classDate: event.classDate || event.occurrenceDate || utcClassStart(event),
          classStartTime: utcClassStart(event),
        }).then((answer) => {
          const details = answer?.details;
          if (!details) return;
          setAttendance((old) => ({ ...old, [event.id]: { attended: details.attended, onTime: details.onTime, lateSeconds: details.lateSeconds } }));
        });
      });
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [baseEvents, schoolUUID, timezone, dummy.settled, dummy.enabled]);

  // Class feedback (legacy processLiveEventLifecycle): a class / activity this page saw LIVE and that has now ended tells the
  // feedback host (components/dashboard/ClassFeedbackHost.jsx), once. An event already over when the page opened never does.
  const liveSeen = useRef(new Set());
  const feedbackSent = useRef(new Set());
  useEffect(() => {
    if (!schoolUUID || !dummy.settled || dummy.enabled) return undefined;
    const check = () => {
      const now = toZonedTime(new Date(), timezone);
      baseEvents.forEach((event) => {
        if ((event.eventKind !== "class" && event.eventKind !== "activity") || event.allDay || !event.startZoned || !event.endZoned) return;
        if (isEventActive(event, now)) {
          liveSeen.current.add(event.id);
          return;
        }
        if (!liveSeen.current.has(event.id) || feedbackSent.current.has(event.id) || now < event.endZoned) return;
        feedbackSent.current.add(event.id);
        notifyFeedbackEventEnded(buildFeedbackInfo(event, timezone));
      });
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [baseEvents, schoolUUID, timezone, dummy.settled, dummy.enabled]);

  const normalizedEvents = useMemo(
    () => (Object.keys(attendance).length ? baseEvents.map((event) => (attendance[event.id] ? { ...event, ...attendance[event.id] } : event)) : baseEvents),
    [baseEvents, attendance]
  );

  const courseRegistry = useMemo(
    () => buildCourseRegistry(normalizedEvents, courseColors, data?.courseDetails),
    [normalizedEvents, courseColors, data?.courseDetails]
  );

  useEffect(() => {
    saveStoredPrefs({ filters, courseColors });
  }, [filters, courseColors]);

  const filteredEvents = useMemo(() => applyCalendarFilters(normalizedEvents, filters), [normalizedEvents, filters]);

  const toggleFilter = useCallback((key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleCourseVisibility = useCallback((courseId) => {
    setFilters((prev) => ({
      ...prev,
      courseVisibility: { ...prev.courseVisibility, [courseId]: prev.courseVisibility[courseId] === false },
    }));
  }, []);

  const setCourseColor = useCallback((courseId, color) => {
    setCourseColors((prev) => ({ ...prev, [courseId]: color }));
  }, []);

  const goToday = useCallback(() => setSelectedDate(new Date()), []);
  const goPrev = useCallback(() => {
    setSelectedDate((prev) => (viewName === "week" ? addWeeks(prev, -1) : viewName === "month" ? addMonths(prev, -1) : addDays(prev, -1)));
  }, [viewName]);
  const goNext = useCallback(() => {
    setSelectedDate((prev) => (viewName === "week" ? addWeeks(prev, 1) : viewName === "month" ? addMonths(prev, 1) : addDays(prev, 1)));
  }, [viewName]);

  return {
    viewName,
    setViewName,
    selectedDate,
    setSelectedDate,
    goToday,
    goPrev,
    goNext,
    timezone,
    isLoading,
    isError,
    holidays: data?.holidays || [],
    events: normalizedEvents,
    filteredEvents,
    courseRegistry,
    filters,
    toggleFilter,
    toggleCourseVisibility,
    setCourseColor,
  };
}
