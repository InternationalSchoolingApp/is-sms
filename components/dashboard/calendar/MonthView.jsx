"use client";

import { format, isSameDay, isSameMonth } from "date-fns";
import { bucketEventsByDate, getEventColor, getMonthGridDays } from "@/utils/calendarEvents";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PER_DAY = 3;

/**
 * Custom month grid (the legacy app delegates Month view to jQuery
 * FullCalendar; this is the React-native equivalent — a plain 6-week grid
 * with up to 3 events per day and a "+N more" overflow that drills into that
 * day's full agenda, same pattern as the week view's overflow chip).
 */
export function MonthView({ events, selectedDate, courseRegistry, onSelectDay, onSelectEvent }) {
  const days = getMonthGridDays(selectedDate);
  const buckets = bucketEventsByDate(events);
  const today = new Date();

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-2 text-center text-[10px] font-bold uppercase text-black/50">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = buckets[key] || [];
          const visible = dayEvents.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = dayEvents.length - visible.length;
          const inMonth = isSameMonth(day, selectedDate);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`flex min-h-[90px] flex-col items-stretch gap-1 border-b border-l border-slate-100 p-1.5 text-left hover:bg-black/5 ${
                inMonth ? "bg-white" : "bg-black/[0.02]"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center self-end rounded-full text-xs font-bold ${
                  isToday ? "bg-primary text-white" : inMonth ? "text-black" : "text-black/30"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="space-y-0.5 overflow-hidden">
                {visible.map((event) => (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent?.(event);
                    }}
                    className="truncate rounded px-1 py-0.5 text-[10px] font-semibold text-white hover:opacity-90"
                    style={{ background: getEventColor(event, courseRegistry) }}
                  >
                    {event.title || event.eventTitle || "Untitled"}
                  </div>
                ))}
                {overflow > 0 && <span className="block text-[10px] font-bold text-primary">+{overflow} more</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
