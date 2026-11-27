"use client";

import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ClassCalendarPanel } from "@/components/parent/classSchedule/ClassCalendarPanel";
import { scheduleRange } from "@/components/parent/classSchedule/scheduleRows";
import { useClassCalendarState } from "@/components/parent/classSchedule/useClassCalendarState";
import { useNow, useParentClassSchedule } from "@/hooks/parent/useParentClassSchedule";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { resolveTimeZone } from "@/utils/attendanceDates";

/** "Thu, Nov 12, 9:30 AM" - the current time in the child's timezone. */
function clockText(now, timeZone) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
    .format(now)
    .replace(/[  ]/g, " ");
}

/**
 * Parent "Class Schedule" (pageLink parent-class-schedule), legacy parentStudentClassSchedule.js: the selected
 * child's classes and activities that have not ended yet, for today (Daily), this week (Weekly) or a custom range,
 * day by day, with Live / Upcoming badges and All / Classes / Activity counts. Times are in the child's timezone.
 * The child tabs sit above (parent/layout.jsx).
 */
export function ParentClassSchedule() {
  const { selectedChild } = useSelectedChild();
  return (
    <ParentChildRequired>
      {/* Keyed by child: switching child starts again on Daily with no custom range. */}
      <SelectedChildClassSchedule key={selectedChild?.userId} />
    </ParentChildRequired>
  );
}

function SelectedChildClassSchedule() {
  const { selectedChild } = useSelectedChild();
  const timeZone = resolveTimeZone(selectedChild?.studentTimezone);
  const now = useNow();
  const calendar = useClassCalendarState({ kind: "schedule", rangeFor: scheduleRange, useData: useParentClassSchedule, now, timeZone });
  const childName = String(selectedChild?.studentName ?? "").trim();

  const first = childName.split(/\s+/)[0];

  return (
    <ClassCalendarPanel
      title={first ? `${first}\u2019s Class Schedule` : "Class Schedule"}
      timeZone={timeZone}
      clock={clockText(now, timeZone)}
      now={now}
      view={calendar.view}
      onView={calendar.onView}
      category={calendar.category}
      onCategory={calendar.onCategory}
      counts={calendar.counts}
      days={calendar.days}
      custom={calendar.custom}
      state={calendar.state}
    />
  );
}
