"use client";

import { useState } from "react";
import { countByCategory, customBounds, groupByDay, validateCustomRange, visibleEvents } from "@/components/parent/classSchedule/scheduleRows";
import { todayYmd } from "@/utils/attendanceDates";

/**
 * The view / custom-range / category state both pages share, turned into what the panel shows. `kind` is
 * "schedule" | "summary"; `rangeFor(view, today, applied)` picks the shown days; `useData(range)` is the page's query
 * hook. A custom range only becomes the shown one when Search is pressed (legacy), and only if it is valid.
 */
export function useClassCalendarState({ kind, rangeFor, useData, now, timeZone }) {
  const today = todayYmd(timeZone, now);
  const [view, setView] = useState("day");
  const [category, setCategory] = useState("ALL");
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [applied, setApplied] = useState(null);
  const [error, setError] = useState(null);

  const range = rangeFor(view, today, applied);
  const data = useData(range);

  const shown = visibleEvents(data.events, range, kind, now);
  const days = groupByDay(shown, range, category);
  const counts = countByCategory(shown);

  const search = () => {
    const message = validateCustomRange(kind, draft.from, draft.to, today);
    setError(message);
    if (!message) setApplied({ from: draft.from, to: draft.to });
  };

  return {
    view,
    onView: (next) => {
      setView(next);
      setError(null);
    },
    category,
    onCategory: setCategory,
    counts,
    days,
    shown,
    custom: {
      from: draft.from,
      to: draft.to,
      onFrom: (from) => setDraft((d) => ({ ...d, from })),
      onTo: (to) => setDraft((d) => ({ ...d, to })),
      onSearch: search,
      error,
      bounds: customBounds(kind, today),
    },
    state: { isLoading: data.isLoading, sessionOut: data.sessionOut, failed: data.failed, retry: data.retry, idle: !range },
  };
}
