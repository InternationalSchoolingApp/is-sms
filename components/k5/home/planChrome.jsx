"use client";

import { createContext, useContext } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/*
 * Playful.dc.html "My Classes and Activities": the Today / Week / Month switch and the previous / next arrows live INSIDE the
 * plan card's header (not in a toolbar above it). K5Planner provides what the header needs here, so Day / Week / Month plans do
 * not have to pass it down; it is null for the Balanced / Mature looks, which keep their own toolbar.
 *   { viewName, onView, onToday, onPrev, onNext, prevLabel, nextLabel, titleBig, titleSmall }
 */
export const PlanChromeContext = createContext(null);
export const usePlanChrome = () => useContext(PlanChromeContext);

const VIEWS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

/** The Today / Week / Month pill switch (mockup .pvsw). PreK has no Month. */
export function PlanViewSwitch({ chrome, isPreK = false }) {
  const views = isPreK ? VIEWS.filter((v) => v.key !== "month") : VIEWS;
  return (
    <div role="group" aria-label="Calendar view" data-pin="views" className="ms-auto flex flex-none gap-[3px] rounded-full bg-k5-act p-[5px]">
      {views.map((v) => {
        const active = v.key === chrome.viewName;
        return (
          <button
            key={v.key}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (v.key === "today") chrome.onToday();
              chrome.onView(v.key);
            }}
            className={`min-h-[38px] cursor-pointer rounded-full border-none px-[13px] font-k5-display text-[15px] font-semibold ${
              active ? "bg-k5-ac text-white shadow-[0_4px_0_var(--k5-acd)]" : "bg-transparent text-k5-ink"
            }`}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

/** Day view: the small "‹ Thursday, October 22, 2026 ›" line under the title (mockup .pdline). */
export function PlanDateLine({ chrome }) {
  const btn = "flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full border-2 border-k5-line bg-k5-card p-0 text-k5-ink";
  return (
    <div className="mt-1 flex items-center gap-1.5 max-[760px]:gap-1">
      <button type="button" aria-label={chrome.prevLabel} onClick={chrome.onPrev} className={btn}>
        <ChevronLeft className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
      </button>
      <span className="whitespace-nowrap text-base font-extrabold text-k5-mut max-[760px]:text-sm">
        {/* {chrome.titleBig},  */}
        {chrome.titleSmall}
      </span>
      <button type="button" aria-label={chrome.nextLabel} onClick={chrome.onNext} className={btn}>
        <ChevronRight className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Week / Month view: the bigger "‹ October 18 – 24 ›" pair on its own row (mockup .pdnav). */
export function PlanNavPair({ chrome }) {
  const btn = "flex h-[38px] w-[38px] flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card text-k5-ink shadow-[0_3px_0_var(--k5-line)]";
  return (
    <div className="flex flex-none items-center gap-1.5">
      <button type="button" aria-label={chrome.prevLabel} onClick={chrome.onPrev} className={btn}>
        <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={3} aria-hidden="true" />
      </button>
      <span className="flex min-w-[128px] flex-col items-center whitespace-nowrap text-center">
        <span className="font-k5-display text-xl font-semibold leading-[1.1] text-k5-ink">{chrome.titleBig}</span>
        <span className="text-sm font-extrabold text-k5-mut">{chrome.titleSmall}</span>
      </span>
      <button type="button" aria-label={chrome.nextLabel} onClick={chrome.onNext} className={btn}>
        <ChevronRight className="h-[18px] w-[18px]" strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  );
}
