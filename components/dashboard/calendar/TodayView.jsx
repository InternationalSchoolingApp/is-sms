"use client";

import { format } from "date-fns";
import { EventCard } from "@/components/dashboard/calendar/EventCard";
import { groupEventsByLocalDate } from "@/utils/calendarEvents";

/**
 * Today view: the selected day's classes/activities/assignments/holidays,
 * grouped and sorted exactly like the legacy renderCustomTodayView (live
 * events float to the top, then chronological).
 */
export function TodayView({ events, selectedDate, courseRegistry, onSelectEvent }) {
  const dayKey = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => e.localDateKey === dayKey);
  const groups = groupEventsByLocalDate(dayEvents);

  if (groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center text-sm text-black/60">
        Nothing scheduled for {format(selectedDate, "EEEE, MMMM d")}.
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      {groups.map((group) => (
        <div key={group.date.toISOString()}>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-black">{format(group.date, "d")}</span>
            <span className="text-xs font-bold uppercase tracking-wide text-black/60">{format(group.date, "EEEE, MMMM yyyy")}</span>
          </div>
          <div className="space-y-2">
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} courseRegistry={courseRegistry} onSelect={onSelectEvent} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
