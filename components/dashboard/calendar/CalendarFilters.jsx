"use client";

import { getEventColor, getEventStatus, getTodayGroups } from "@/utils/calendarEvents";
import { CalendarDatepicker } from "@/components/dashboard/calendar/CalendarDatepicker";
import { CourseColorPicker } from "@/components/dashboard/calendar/CourseColorPicker";
import { FaCheck } from "react-icons/fa";

function FilterRow({ label, color, checked, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-black hover:bg-black/5"
    >
      <span
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2"
        style={{ borderColor: color, background: checked ? color : "transparent" }}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  );
}

// "My Courses" row: numbered, a plain check/uncheck box PLUS a separate color
// swatch that opens a palette (legacy renderCourseFilters) — two different
// controls, unlike every other FilterRow where the swatch itself is the
// checkbox.
function CourseRow({ index, course, checked, onToggleVisibility, onPickColor }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/5">
      {/* <span className="w-4 flex-shrink-0 text-xs font-bold text-black/40">{index}.</span> */}
      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label={checked ? "Hide course" : "Show course"}
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 border-black/20 ${checked ? "bg-green-600 border-green-600" : "transparent" }` }
        style={{ background: checked ? "#bg-green-600" : "transparent" }}
      >
        {checked && <FaCheck  className="text-white w-2" />}
      </button>
      <CourseColorPicker color={course.color} onPick={onPickColor} />
      <span className="truncate text-xs font-semibold text-black">{course.label}</span>
    </div>
  );
}

// One compact item in a Today subgroup — legacy renderTodaySummary: a
// color-coded border (dashed for classes, solid otherwise), the live "marching
// ants" animation when it's happening right now, title (often blank for a
// plain CLASS event — see normalizeCalendarEvent) and the time range.
function TodaySummaryItem({ event, courseRegistry, onSelectEvent }) {
  const color = getEventColor(event, courseRegistry);
  const isClass = event.eventKind === "class";
  const isLive = getEventStatus(event) === "live";
  const title = event.title || event.eventTitle;

  return (
    <button
      type="button"
      onClick={() => onSelectEvent?.(event)}
      className={`w-full rounded-lg border bg-white px-2 py-1.5 text-center text-xs hover:bg-black/5 ${isLive ? "calendar-live-dashed" : ""}`}
      style={isLive ? { "--live-color": color } : isClass ? { borderStyle: "dashed", borderColor: color } : { borderColor: color }}
    >
      {title && <span className="block font-bold text-black">{title}</span>}
      {event.displayTime && <span className="block text-black/60">{event.displayTime}</span>}
    </button>
  );
}

// One of the Today panel's three subsections (Live / Upcoming / Completed),
// each either listing its items or showing the legacy's "No Class & School
// Activity" placeholder when empty.
function TodaySubgroup({ label, items, courseRegistry, onSelectEvent }) {
  return (
    <div className="mb-3 last:mb-0">
      <h4 className="mb-1 text-xs font-bold text-black">{label}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-black/50">No Class &amp; School Activity</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((event) => (
            <TodaySummaryItem key={event.id} event={event} courseRegistry={courseRegistry} onSelectEvent={onSelectEvent} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <div className="border-t border-slate-200 pt-3 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-black/50">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

/**
 * The calendar sidebar's filter stack — My Courses, Assignments, Class
 * Status, Events, Holidays — ported from the legacy sidebar sections
 * (renderCourseFilters / renderCategoryFilters / renderSchoolEventFilters).
 * Course color picker popup is intentionally deferred (visibility toggle only
 * for now).
 */
export function CalendarFilters({
  events,
  courseRegistry,
  filters,
  toggleFilter,
  toggleCourseVisibility,
  setCourseColor,
  selectedDate,
  onSelectDate,
  onSelectEvent,
}) {
  const courses = Object.values(courseRegistry);
  const todayGroups = getTodayGroups(events);
  return (
    <aside className="w-full flex-shrink-0 space-y-4 overflow-y-auto border-slate-200 p-3 lg:sticky lg:top-0 lg:max-h-[calc(100vh-170px-var(--dash-footer-h,0px))] lg:w-72 lg:self-start lg:border-r">
      <CalendarDatepicker selectedDate={selectedDate} onSelectDate={onSelectDate} events={events} />

      <FilterSection title="Today">
        <TodaySubgroup label="Live Class & School Activity" items={todayGroups.live} courseRegistry={courseRegistry} onSelectEvent={onSelectEvent} />
        <TodaySubgroup label="Upcoming Class & School Activity" items={todayGroups.upcoming} courseRegistry={courseRegistry} onSelectEvent={onSelectEvent} />
        <TodaySubgroup label="Completed Class & School Activity" items={todayGroups.completed} courseRegistry={courseRegistry} onSelectEvent={onSelectEvent} />
      </FilterSection>

      {courses.length > 0 && (
        <FilterSection title="My Courses">
          {courses.map((course, index) => (
            <CourseRow
              key={course.id}
              index={index + 1}
              course={course}
              checked={filters.courseVisibility[course.id] !== false}
              onToggleVisibility={() => toggleCourseVisibility(course.id)}
              onPickColor={(color) => setCourseColor(course.id, color)}
            />
          ))}
        </FilterSection>
      )}

      <FilterSection title="Assignments">
        <FilterRow label="Pending" color="#f4b400" checked={filters.pendingAssignments} onToggle={() => toggleFilter("pendingAssignments")} />
        <FilterRow label="Submitted" color="#1b5e20" checked={filters.submittedAssignments} onToggle={() => toggleFilter("submittedAssignments")} />
        <FilterRow label="Upcoming" color="#1a73e8" checked={filters.upcomingAssignments} onToggle={() => toggleFilter("upcomingAssignments")} />
      </FilterSection>

      <FilterSection title="Class Status">
        <FilterRow label="Live" color="#e53935" checked={filters.liveActivities} onToggle={() => toggleFilter("liveActivities")} />
        <FilterRow label="Upcoming" color="#2267f0" checked={filters.upcomingActivities} onToggle={() => toggleFilter("upcomingActivities")} />
        <FilterRow label="Expired" color="#5f6368" checked={filters.pastActivities} onToggle={() => toggleFilter("pastActivities")} />
        <FilterRow label="Missed Class" color="#d93025" checked={filters.missedClasses} onToggle={() => toggleFilter("missedClasses")} />
        <FilterRow label="Late Join Class" color="#ff6d00" checked={filters.lateJoinClasses} onToggle={() => toggleFilter("lateJoinClasses")} />
      </FilterSection>

      <FilterSection title="Events">
        <FilterRow label="School Activities" color="#2267f0" checked={filters.activities} onToggle={() => toggleFilter("activities")} />
        <FilterRow label="School Events" color="#2267f0" checked={filters.schoolEvents} onToggle={() => toggleFilter("schoolEvents")} />
      </FilterSection>

      <FilterSection title="Holidays">
        <FilterRow label="Holidays & Breaks" color="#1b5e20" checked={filters.holidays} onToggle={() => toggleFilter("holidays")} />
      </FilterSection>
    </aside>
  );
}
