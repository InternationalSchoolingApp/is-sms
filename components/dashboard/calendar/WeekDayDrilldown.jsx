"use client";

import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { EventCard } from "@/components/dashboard/calendar/EventCard";
import { getTodayGroups } from "@/utils/calendarEvents";

/**
 * Single-day agenda reached by clicking a week-view day header or a "+N
 * more" overflow chip (legacy renderWeekDayListView). Reuses EventCard the
 * same way the Today view does.
 */
export function WeekDayDrilldown({ date, events, courseRegistry, onBack, backLabel = "Back", onSelectEvent }) {
  const dayKey = format(date, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => e.localDateKey === dayKey);
  // getTodayGroups is keyed on "now" being the viewed day so live/upcoming/completed
  // sort correctly even when the drilled-down day isn't today.
  const groups = getTodayGroups(dayEvents, date);
  const sorted = [...groups.live, ...groups.upcoming, ...groups.completed];

  return (
    <div className="p-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
      </button>
      <h3 className="mb-3 text-sm font-extrabold text-black">{format(date, "EEEE, MMMM d, yyyy")}</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-black/60">Nothing scheduled for this day.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((event) => (
            <EventCard key={event.id} event={event} courseRegistry={courseRegistry} onSelect={onSelectEvent} />
          ))}
        </div>
      )}
    </div>
  );
}
