"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek } from "date-fns";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { getLiveClassAttendanceStatus, getSchoolCalendar } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import {
  DEFAULT_CALENDAR_FILTERS,
  applyCalendarFilters,
  buildCourseRegistry,
  getBackendAgenda,
  getBrowserTimezone,
  normalizeCalendarEvents,
} from "@/utils/calendarEvents";

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

// The fetch window for each view. "today" intentionally over-fetches by a day
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

/**
 * Options used by the Grade K–5 home (defaults keep the existing calendar unchanged):
 * `timezone` shows events in that zone instead of the browser's, `monthFetch` always loads
 * the selected date's whole month (± a week) so the mini calendar and every view share one
 * request, and `initialDate` is the first selected date.
 */
export function useStudentCalendar({ schoolUUID, userId, timezone: timezoneOption, monthFetch = false, initialDate }) {
  const [viewName, setViewName] = useState("today");
  const [selectedDate, setSelectedDate] = useState(() => initialDate || new Date());
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_CALENDAR_FILTERS, ...(loadStoredPrefs().filters || {}) }));
  const [courseColors, setCourseColors] = useState(() => loadStoredPrefs().courseColors || {});
  const timezone = timezoneOption || getBrowserTimezone();
  const fetchView = monthFetch ? "month" : viewName;

  const { start, end } = useMemo(() => getFetchRange(fetchView, selectedDate), [fetchView, selectedDate]);
  const startDate = format(start, "yyyy-MM-dd");
  const endDate = format(end, "yyyy-MM-dd");

  // Dummy (demo) student mode: legacy patchDummySchoolCalendar's generated classes/assignments/holidays/activities.
  const dummy = useDummyStudent();
  const query = useQuery({
    queryKey: ["student-school-calendar", schoolUUID, userId, getBackendAgenda(fetchView), startDate, endDate, timezone, dummy.key],
    queryFn: () =>
      dummy.enabled
        ? dummy.student.calendar({ startDate, endDate, timezone })
        : getSchoolCalendar({ schoolUUID, userId, startDate, endDate }),
    enabled: Boolean(schoolUUID && userId && dummy.settled),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const baseEvents = useMemo(
    () => normalizeCalendarEvents(query.data?.event, { timezone, courseDetails: query.data?.courseDetails }),
    [query.data, timezone]
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

  const normalizedEvents = useMemo(
    () => (Object.keys(attendance).length ? baseEvents.map((event) => (attendance[event.id] ? { ...event, ...attendance[event.id] } : event)) : baseEvents),
    [baseEvents, attendance]
  );

  const courseRegistry = useMemo(
    () => buildCourseRegistry(normalizedEvents, courseColors, query.data?.courseDetails),
    [normalizedEvents, courseColors, query.data?.courseDetails]
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
    isLoading: !dummy.settled || query.isLoading,
    isError: query.isError,
    holidays: query.data?.holidays || [],
    events: normalizedEvents,
    filteredEvents,
    courseRegistry,
    filters,
    toggleFilter,
    toggleCourseVisibility,
    setCourseColor,
  };
}
