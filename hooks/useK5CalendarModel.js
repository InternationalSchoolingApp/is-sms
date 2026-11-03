"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useStudentCalendar } from "@/hooks/useStudentCalendar";
import { buildDayMap, dayKey } from "@/utils/k5Calendar";

const nowIn = (timezone) => toZonedTime(new Date(), timezone);

/**
 * Data for the Grade K–5 home planner: the existing school-calendar hook (same request,
 * normalization, course colours and course on/off as the legacy calendar), loaded a month
 * at a time and shown in `timezone`, plus a ticking `now` in that zone and per-day buckets.
 * Legacy filters other than the course on/off toggles have no K–5 UI, so they are ignored.
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

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (e) => !((e.eventKind === "class" || e.eventKind === "assignment") && filters.courseVisibility[e.courseId] === false),
      ),
    [events, filters.courseVisibility],
  );
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
    toggleCourseVisibility: calendar.toggleCourseVisibility,
  };
}
