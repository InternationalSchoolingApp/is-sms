"use client";

import { useMemo } from "react";
import { parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

/**
 * Sidebar mini-calendar (legacy bootstrap-datepicker in
 * dashboardCalendarNew.js's updateDatepicker, with the same "dot under days
 * that have an event" decoration). Picking a date jumps the main view to
 * that day (Today view) — same effect as the legacy changeDate handler.
 */
export function CalendarDatepicker({ selectedDate, onSelectDate, events }) {
  const eventDates = useMemo(() => {
    const seen = new Set();
    const dates = [];
    for (const event of events) {
      if (!event.localDateKey || seen.has(event.localDateKey)) continue;
      seen.add(event.localDateKey);
      dates.push(parseISO(event.localDateKey));
    }
    return dates;
  }, [events]);

  return (
    <Calendar
      key={selectedDate.toDateString()}
      mode="single"
      selected={selectedDate}
      onSelect={(date) => date && onSelectDate(date)}
      defaultMonth={selectedDate}
      modifiers={{ hasEvent: eventDates }}
      modifiersClassNames={{
        hasEvent:
          "relative after:content-[''] after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary",
      }}
      className="w-full p-0"
    />
  );
}
