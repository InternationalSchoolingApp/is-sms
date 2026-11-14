"use client";

import { useId, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";

/**
 * "What to show" - the legacy calendar's filters (renderCalendarFilters) for the grade looks: which kinds of items,
 * assignments and classes appear on the plan. The course on/off toggles stay in My Courses. The choices are the same
 * ones (and the same saved preference) as the standard calendar, so they follow the student between looks.
 */
const GROUPS = [
  {
    title: "On my plan",
    items: [
      ["classes", "Classes"],
      ["activities", "Activities"],
      ["schoolEvents", "School events"],
      ["holidays", "Holidays"],
    ],
  },
  {
    title: "Assignments",
    items: [
      ["pendingAssignments", "Pending"],
      ["submittedAssignments", "Submitted"],
      ["upcomingAssignments", "Upcoming"],
    ],
  },
  {
    title: "Classes",
    items: [
      ["liveActivities", "Live"],
      ["upcomingActivities", "Upcoming"],
      ["pastActivities", "Past"],
      ["missedClasses", "Missed"],
      ["lateJoinClasses", "Late join"],
    ],
  },
];

export function K5PlanFilters({ filters, onToggle }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const hidden = GROUPS.flatMap((g) => g.items).filter(([key]) => filters[key] === false).length;
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-[15px] font-semibold text-k5-ink"
      >
        <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
        What to show{hidden > 0 ? ` (${hidden} hidden)` : ""}
      </button>
      {open && (
        <div id={panelId} role="group" aria-label="What to show on my plan" className="flex w-full flex-col gap-3 rounded-[18px] border-[3px] border-k5-line bg-k5-card p-3.5">
          {GROUPS.map((group) => (
            <div key={group.title} className="flex flex-wrap items-center gap-2">
              <span className="min-w-28 font-k5-display text-base font-semibold text-k5-ink">{group.title}</span>
              {group.items.map(([key, label]) => {
                const on = filters[key] !== false;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(key)}
                    className={`flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border-[3px] px-3 font-k5-display text-[15px] font-semibold text-k5-ink ${
                      on ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card opacity-70"
                    }`}
                  >
                    <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded-full ${on ? "bg-k5-ac text-white" : "border-2 border-k5-line"}`}>
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3.5} />}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
