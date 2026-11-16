"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useStudentCalendar } from "@/hooks/useStudentCalendar";
import { buildDayMap, dayKey } from "@/utils/k5Calendar";
import { applyCalendarFilters } from "@/utils/calendarEvents";

const nowIn = (timezone) => toZonedTime(new Date(), timezone);

/**
 * Data for the Grade K–5 home planner: the existing school-calendar hook (same request,
 * normalization, course colours and course on/off as the legacy calendar), loaded a month
 * at a time and shown in `timezone`, plus a ticking `now` in that zone and per-day buckets.
 * The legacy filters (item kinds, assignment and class states, course on/off) all apply; K5PlanFilters is their UI.
 */
export function useK5CalendarModel({ schoolUUID, userId, timezone }) {
  const [now, setNow] = useState(() => nowIn(timezone));
  useEffect(() => {
    const tick = () => setNow(nowIn(timezone));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [timezone]);

  const calendar = useStudentCalendar({ schoolUUID, userId, timezone, monthFetch: true, initialDate: startOfDay(nowIn(timezone)) });
  const { viewName, setViewName, selectedDate, setSelectedDate, filters, events } = calendar;

  const visibleEvents = useMemo(() => applyCalendarFilters(events, filters, now), [events, filters, now]);
  const days = useMemo(() => buildDayMap(visibleEvents, now), [visibleEvents, now]);

  const step = useCallback(
    (dir) =>
      setSelectedDate((prev) => (viewName === "week" ? addWeeks(prev, dir) : viewName === "month" ? addMonths(prev, dir) : addDays(prev, dir))),
    [viewName, setSelectedDate],
  );
  const goToday = useCallback(() => setSelectedDate(startOfDay(nowIn(timezone))), [setSelectedDate, timezone]);
  const openDay = useCallback(
    (date) => {
      setSelectedDate(startOfDay(date));
      setViewName("today");
    },
    [setSelectedDate, setViewName],
  );

  return {
    now,
    todayKey: dayKey(now),
    timezone,
    days,
    viewName,
    setViewName,
    selectedDate,
    selectedKey: dayKey(selectedDate),
    setSelectedDate,
    goPrev: () => step(-1),
    goNext: () => step(1),
    goToday,
    openDay,
    isLoading: calendar.isLoading,
    isError: calendar.isError,
    courseRegistry: calendar.courseRegistry,
    courseVisibility: filters.courseVisibility,
    filters,
    toggleFilter: calendar.toggleFilter,
    toggleCourseVisibility: calendar.toggleCourseVisibility,
  };
}
