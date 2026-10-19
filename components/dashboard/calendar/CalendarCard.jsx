"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useStudentCalendar } from "@/hooks/useStudentCalendar";
import { CalendarFilters } from "@/components/dashboard/calendar/CalendarFilters";
import { TodayView } from "@/components/dashboard/calendar/TodayView";
import { WeekView } from "@/components/dashboard/calendar/WeekView";
import { WeekDayDrilldown } from "@/components/dashboard/calendar/WeekDayDrilldown";
import { MonthView } from "@/components/dashboard/calendar/MonthView";
import { EventDetailModal } from "@/components/dashboard/calendar/EventDetailModal";
import { JoinClassModal } from "@/components/dashboard/calendar/JoinClassModal";
import { CalendarClockPill } from "@/components/dashboard/calendar/CalendarClockPill";
import { getEventStatus } from "@/utils/calendarEvents";

const VIEW_TABS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

function titleFor(viewName, selectedDate) {
  if (viewName === "today") return format(selectedDate, "EEEE, MMMM d, yyyy");
  return format(selectedDate, "MMMM yyyy");
}

// A non-completed class with a join link goes straight to the join flow on
// click (legacy openDashboardCalendarEvent's "has event.url" branch) instead
// of the read-only detail modal, which completed classes still get.
function isJoinableClass(event) {
  return event.eventKind === "class" && Boolean(event.url) && getEventStatus(event) !== "completed";
}

/**
 * Student home calendar — classes, activities, assignments, holidays and
 * school events. Today view is fully built; Week/Month land in a follow-up
 * pass (see Phase B plan) and currently show a "coming soon" placeholder so
 * the view pill is honest about what's wired up.
 */
export function StudentCalendarCard({ schoolUUID, userId }) {
  const calendar = useStudentCalendar({ schoolUUID, userId });
  const [drilldownDate, setDrilldownDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [joiningEvent, setJoiningEvent] = useState(null);

  const handleSelectEvent = (event) => {
    if (isJoinableClass(event)) setJoiningEvent(event);
    else setSelectedEvent(event);
  };

  // Any date/view navigation drops the drilldown back to the week/month grid.
  const goPrev = () => {
    setDrilldownDate(null);
    calendar.goPrev();
  };
  const goNext = () => {
    setDrilldownDate(null);
    calendar.goNext();
  };
  const goToday = () => {
    setDrilldownDate(null);
    calendar.goToday();
  };
  const setViewName = (view) => {
    setDrilldownDate(null);
    calendar.setViewName(view);
  };

  return (
    // No overflow-hidden here: it would turn this card into its own
    // sticky-positioning boundary, breaking CalendarFilters' `lg:sticky`
    // (the sidebar needs to track the page's real scroll container, not
    // just scroll within this card's own box).
    <section className="rounded-2xl border border-slate-200 bg-white lg:min-h-[calc(100vh-150px-var(--dash-footer-h,0px))]">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <CalendarClockPill timezone={calendar.timezone} />
        <div className="flex items-center gap-1 rounded-full bg-black/5 p-1">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous"
            className="flex h-7 w-7 items-center justify-center rounded-full text-black hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={goToday} className="px-2 text-xs font-bold text-black hover:underline">
            Today
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next"
            className="flex h-7 w-7 items-center justify-center rounded-full text-black hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-sm font-bold text-black">{titleFor(calendar.viewName, calendar.selectedDate)}</span>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-black/5 p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setViewName(tab.key)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                calendar.viewName === tab.key ? "bg-primary text-white" : "text-black hover:bg-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-b border-slate-200 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-black/50">
        <span>Legend:</span>
        <span className="flex items-center gap-1">
          <span className="h-4 w-4 border-2 border-black/60" /> Assignment
        </span>
        <span className="flex items-center gap-1">
          <span className="h-4 w-4" style={{ borderWidth: 2, borderStyle: "dashed", borderColor: "#888" }} /> Class
        </span>
        <span className="flex items-center gap-1 text-[#2267f0]">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#2267f0]" /> School Activity
        </span>
        <span className="flex items-center gap-1 text-[#1b5e20]">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#1b5e20]" /> Holiday
        </span>
      </div>

      <div className="flex flex-col lg:flex-row">
        <CalendarFilters
          events={calendar.events}
          courseRegistry={calendar.courseRegistry}
          filters={calendar.filters}
          toggleFilter={calendar.toggleFilter}
          toggleCourseVisibility={calendar.toggleCourseVisibility}
          setCourseColor={calendar.setCourseColor}
          selectedDate={calendar.selectedDate}
          onSelectDate={(date) => {
            setDrilldownDate(null);
            calendar.setViewName("today");
            calendar.setSelectedDate(date);
          }}
          onSelectEvent={handleSelectEvent}
        />
        <div
          className={`min-h-[360px] flex-1 ${
            (calendar.viewName === "week" || calendar.viewName === "month") && !drilldownDate ? "max-h-[640px] overflow-y-auto" : ""
          }`}
        >
          {calendar.isLoading ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-black/60">Loading your calendar…</div>
          ) : calendar.isError ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-black/60">
              Couldn&apos;t load your calendar. Please try again shortly.
            </div>
          ) : drilldownDate ? (
            <WeekDayDrilldown
              date={drilldownDate}
              events={calendar.filteredEvents}
              courseRegistry={calendar.courseRegistry}
              onBack={() => setDrilldownDate(null)}
              backLabel={calendar.viewName === "month" ? "Back to month" : "Back to week"}
              onSelectEvent={handleSelectEvent}
            />
          ) : calendar.viewName === "today" ? (
            <TodayView
              events={calendar.filteredEvents}
              selectedDate={calendar.selectedDate}
              courseRegistry={calendar.courseRegistry}
              onSelectEvent={handleSelectEvent}
            />
          ) : calendar.viewName === "week" ? (
            <WeekView
              events={calendar.filteredEvents}
              selectedDate={calendar.selectedDate}
              courseRegistry={calendar.courseRegistry}
              onSelectDay={setDrilldownDate}
              onSelectEvent={handleSelectEvent}
            />
          ) : (
            <MonthView
              events={calendar.filteredEvents}
              selectedDate={calendar.selectedDate}
              courseRegistry={calendar.courseRegistry}
              onSelectDay={setDrilldownDate}
              onSelectEvent={handleSelectEvent}
            />
          )}
        </div>
      </div>
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} courseRegistry={calendar.courseRegistry} onClose={() => setSelectedEvent(null)} />
      )}
      {joiningEvent && (
        <JoinClassModal
          event={joiningEvent}
          schoolUUID={schoolUUID}
          courseRegistry={calendar.courseRegistry}
          onClose={() => setJoiningEvent(null)}
        />
      )}
    </section>
  );
}
