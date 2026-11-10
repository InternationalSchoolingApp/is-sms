"use client";

import { Hand } from "lucide-react";
import { CLUE_COLORS as C } from "@/utils/k5Calendar";

const CLUES = [
  { key: "assignment", label: "Assignment", dot: { background: C.assignment } },
  { key: "done", label: "Done Class", dot: { border: `3px solid ${C.done}`, background: "var(--k5-card)" } },
  { key: "live", label: "Live Class", dot: { border: `3px dashed ${C.live}`, background: C.liveTint } },
  { key: "upcoming", label: "Upcoming Class", dot: { border: `3px solid ${C.upcoming}`, background: C.upcomingTint } },
  { key: "activity", label: "School Activity", dot: { background: C.activity } },
  { key: "holiday", label: "Holiday", dot: { background: C.holiday } },
];
// PreK keeps just the class states (plan 12.8).
const PREK_CLUES = new Set(["done", "live", "upcoming"]);

/**
 * Colour clues (mockup legend): each one is a button — tapping it outlines the matching
 * items in the planner, tapping again clears it. Status is never colour-only: every item
 * also carries a label or icon.
 */
export function ColourClues({ clue, onClue, isPreK }) {
  const clues = isPreK ? CLUES.filter((c) => PREK_CLUES.has(c.key)) : CLUES;
  return (
    <div role="group" aria-label="Color clues" data-pin="clues" className="flex flex-wrap items-center justify-center gap-1.5 p-1.5">
      <span className="flex-none font-k5-display text-base font-semibold text-k5-ink">Color clues:</span>
      {clues.map((c) => {
        const active = clue === c.key;
        return (
          <button
            key={c.key}
            type="button"
            aria-pressed={active}
            onClick={() => onClue(active ? null : c.key)}
            className={`flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-full border-[3px] py-1 pl-2 pr-[11px] font-k5-display text-[15px] font-semibold text-k5-ink ${
              active ? "border-[#FFC531] bg-k5-yt" : "border-k5-line bg-k5-card"
            }`}
          >
            <span aria-hidden="true" className="box-border block h-5 w-5 flex-none rounded-full" style={c.dot} />
            {c.label}
          </button>
        );
      })}
      <span className="flex flex-none items-center gap-1 font-k5-display text-[15px] font-semibold text-k5-ink">
        <Hand className="h-5 w-5" aria-hidden="true" />
        Tap a clue!
      </span>
    </div>
  );
}
