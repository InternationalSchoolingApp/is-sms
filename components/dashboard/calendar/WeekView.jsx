"use client";

import { useEffect, useRef } from "react";
import { format, isSameDay } from "date-fns";
import { bucketEventsForWeek, getEventColor, getEventStatus, getWeekDays } from "@/utils/calendarEvents";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MAX_VISIBLE_PER_HOUR = 2;
const ROW_HEIGHT = 60;

function EventChip({ event, courseRegistry, onSelect, widthClassName = "w-full" }) {
  const color = getEventColor(event, courseRegistry);
  const status = getEventStatus(event);
  const isClass = event.eventKind === "class";
  const isLive = status === "live";
  console.log("event", event)
  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      className={`block ${widthClassName} truncate rounded cursor-pointer px-1.5 py-1 text-left text-[11px] font-semibold border-2 ${
        isLive ? "calendar-live-dashed" : ""
      }`}
      style={
        isLive
          ? { borderColor: color, "--live-color": "#fff" }
          : {
              borderColor: color,
              borderStyle: isClass ? "dashed" : "solid",
              borderWidth: isClass ? 2 : 2,
              opacity: status === "completed" ? 0.75 : 1,
              color:getEventColor(event, courseRegistry)
            }
      }
      title={event.title || event.eventTitle}
    >
      {event.title || event.eventTitle || "Untitled"}
    </button>
  );
}

/**
 * Custom week grid — the legacy renderCustomWeekView is hand-built HTML (not
 * FullCalendar), so this mirrors that directly rather than pulling in a
 * calendar grid library: 7-day header, an all-day row, then a 24-hour grid
 * with up to 2 visible events per day/hour cell and a "+N more" overflow
 * chip that drills into that day's list.
 */
export function WeekView({ events, selectedDate, courseRegistry, onSelectDay, onSelectEvent }) {
  const bodyRef = useRef(null);
  const weekDays = getWeekDays(selectedDate);
  const buckets = bucketEventsForWeek(events, weekDays);
  const today = new Date();

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 7 * ROW_HEIGHT;
  }, [selectedDate]);

  return (
    <div className="flex h-full flex-col">
      <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div />
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className="flex flex-col items-center gap-1 border-l border-slate-200 py-2 hover:bg-black/5"
            >
              <span className="text-[10px] font-bold uppercase text-black/50">{format(day, "EEE")}</span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  isToday ? "bg-primary text-white" : "text-black"
                }`}
              >
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="py-1 text-right text-[10px] font-bold text-black/40">All day</div>
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const allDayEvents = buckets[key]?.allDay || [];
          return (
            <div key={key} className="min-h-[28px] min-w-0 space-y-1 border-l border-slate-200 p-1">
              {allDayEvents.map((event) => (
                <EventChip key={event.id} event={event} courseRegistry={courseRegistry} onSelect={onSelectEvent} />
              ))}
            </div>
          );
        })}
      </div>

      <div ref={bodyRef} className="flex-1 overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          {HOURS.map((hour) => (
            <div key={`label-${hour}`} className="border-b border-dashed border-slate-100 pr-2 text-right text-[10px] text-black/40" style={{ height: ROW_HEIGHT }}>
              {format(new Date(2000, 0, 1, hour), "h a")}
            </div>
          )).reduce((rows, label, idx) => {
            // interleave hour label with its 7 day cells so the grid stays a single flat list
            const hour = idx;
            rows.push(label);
            weekDays.forEach((day) => {
              const key = format(day, "yyyy-MM-dd");
              const hourEvents = buckets[key]?.byHour[hour] || [];
              const visible = hourEvents.slice(0, MAX_VISIBLE_PER_HOUR);
              const overflow = hourEvents.length - visible.length;
              rows.push(
                // Legacy's renderCustomWeekView never grows an hour row for its
                // "+N more" chip either — events there are absolutely positioned
                // on one continuous per-day column, and the overflow chip is
                // placed right past the bottom of its hour's slot, free to
                // visually spill into the next hour's space. Matched here with
                // position: relative + an absolutely positioned overflow chip
                // anchored to this cell's bottom edge, so every row stays the
                // same fixed, compact height instead of stretching. Concurrent
                // events in the same hour sit side by side (each an equal
                // 1/visible.length share, like legacy's `pct = 100 / tc`)
                // instead of stacking, so 2 visible events split 50/50.
                <div
                  key={`${key}-${hour}`}
                  className="relative min-w-0 border-b border-l border-dashed border-slate-100 p-0.5"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div className="flex gap-0.5">
                    {visible.map((event) => (
                      <EventChip
                        key={event.id}
                        event={event}
                        courseRegistry={courseRegistry}
                        onSelect={onSelectEvent}
                        widthClassName="min-w-0 flex-1"
                      />
                    ))}
                  </div>
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={() => {onSelectDay(day)}}
                      className="absolute inset-x-0.5 bottom-0 cursor-pointer z-10 block rounded bg-primary/10 px-1 text-[10px] font-bold text-primary hover:underline"
                    >
                      +{overflow} more
                    </button>
                  )}
                </div>
              );
            });
            return rows;
          }, [])}
        </div>
      </div>
    </div>
  );
}
