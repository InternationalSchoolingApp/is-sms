"use client";

import { getTodayGroups } from "@/utils/calendarEvents";
import { CalendarDatepicker } from "@/components/dashboard/calendar/CalendarDatepicker";
import { CourseColorPicker } from "@/components/dashboard/calendar/CourseColorPicker";

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
      <span className="w-4 flex-shrink-0 text-xs font-bold text-black/40">{index}.</span>
      <button
        type="button"
        onClick={onToggleVisibility}
        aria-label={checked ? "Hide course" : "Show course"}
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 border-black/20"
        style={{ background: checked ? "#1b5e20" : "transparent" }}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </button>
      <CourseColorPicker color={course.color} onPick={onPickColor} />
      <span className="truncate text-xs font-semibold text-black">{course.label}</span>
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
}) {
  const courses = Object.values(courseRegistry);
  const todayGroups = getTodayGroups(events);
  const todayItems = [...todayGroups.live, ...todayGroups.upcoming, ...todayGroups.completed].slice(0, 5);

  return (
    <aside className="w-full flex-shrink-0 space-y-4 border-slate-200 p-3 lg:w-72 lg:border-r">
      <CalendarDatepicker selectedDate={selectedDate} onSelectDate={onSelectDate} events={events} />

      <FilterSection title="Today">
        {todayItems.length === 0 ? (
          <p className="px-2 text-xs text-black/50">Nothing scheduled today.</p>
        ) : (
          todayItems.map((event) => (
            <div key={event.id} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
              <span className="font-bold text-black">{event.title || event.eventTitle || "Untitled"}</span>
              {event.displayTime && <span className="block text-black/60">{event.displayTime}</span>}
            </div>
          ))
        )}
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
