"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ClassCalendarPanel } from "@/components/parent/classSchedule/ClassCalendarPanel";
import { summaryRange } from "@/components/parent/classSchedule/scheduleRows";
import { useClassCalendarState } from "@/components/parent/classSchedule/useClassCalendarState";
import { ClassSummarySheet } from "@/components/parent/classSummary/ClassSummarySheet";
import { useNow } from "@/hooks/parent/useParentClassSchedule";
import { useParentClassScheduleSummary } from "@/hooks/parent/useParentClassSummary";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { resolveTimeZone } from "@/utils/attendanceDates";

/**
 * Parent "Class Summary" (pageLink parent-class-summary), legacy parentStudentClassSummary.js: the selected child's
 * past, attended classes for yesterday (Daily), the 7 days up to yesterday (Weekly) or a custom range, day by day,
 * with a View Summary button that opens the generated class summary in a side sheet. Times are in the child's
 * timezone. The child tabs sit above (parent/layout.jsx).
 */
export function ParentClassSummary() {
  const { selectedChild } = useSelectedChild();
  return (
    <ParentChildRequired>
      {/* Keyed by child: switching child starts again on Daily and closes any open summary. */}
      <SelectedChildClassSummary key={selectedChild?.userId} />
    </ParentChildRequired>
  );
}

function SelectedChildClassSummary() {
  const { selectedChild } = useSelectedChild();
  const timeZone = resolveTimeZone(selectedChild?.studentTimezone);
  // Past classes only: the clock is read once per minute-ish, a class that just ended shows on the next refresh.
  const now = useNow(60_000);
  const calendar = useClassCalendarState({ kind: "summary", rangeFor: summaryRange, useData: useParentClassScheduleSummary, now, timeZone });
  const [opened, setOpened] = useState(null);
  const childName = String(selectedChild?.studentName ?? "").trim();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex items-center gap-2 px-1 pb-4">
        <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-extrabold text-black sm:text-xl">Class Summary{childName ? ` - ${childName}` : ""}</h1>
      </div>
      <ClassCalendarPanel
        title="Class Summary"
        timeZone={timeZone}
        now={now}
        view={calendar.view}
        onView={calendar.onView}
        category={calendar.category}
        onCategory={calendar.onCategory}
        counts={calendar.counts}
        days={calendar.days}
        custom={calendar.custom}
        state={calendar.state}
        onViewSummary={setOpened}
      />
      <ClassSummarySheet event={opened} onClose={() => setOpened(null)} />
    </div>
  );
}
