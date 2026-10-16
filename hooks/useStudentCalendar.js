"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek } from "date-fns";
import { getSchoolCalendar } from "@/services/dashboardApi";
import {
  DEFAULT_CALENDAR_FILTERS,
  applyCalendarFilters,
  buildCourseRegistry,
  getBackendAgenda,
  getBrowserTimezone,
  normalizeCalendarEvents,
} from "@/utils/calendarEvents";

const STORAGE_KEY = "studentDashboardCalendarNew";

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

export function useStudentCalendar({ schoolUUID, userId }) {
  const [viewName, setViewName] = useState("today");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_CALENDAR_FILTERS, ...(loadStoredPrefs().filters || {}) }));
  const [courseColors, setCourseColors] = useState(() => loadStoredPrefs().courseColors || {});
  const timezone = getBrowserTimezone();

  const { start, end } = useMemo(() => getFetchRange(viewName, selectedDate), [viewName, selectedDate]);
  const startDate = format(start, "yyyy-MM-dd");
  const endDate = format(end, "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["student-school-calendar", schoolUUID, userId, getBackendAgenda(viewName), startDate, endDate],
    queryFn: () => getSchoolCalendar({ schoolUUID, userId, startDate, endDate }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const normalizedEvents = useMemo(
    () => normalizeCalendarEvents(query.data?.event, { timezone, courseDetails: query.data?.courseDetails }),
    [query.data, timezone]
  );

  const courseRegistry = useMemo(() => buildCourseRegistry(normalizedEvents, courseColors), [normalizedEvents, courseColors]);

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
    isLoading: query.isLoading,
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
