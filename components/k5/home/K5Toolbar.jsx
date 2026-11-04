"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";
import { K5_CARD, K5_ROUND_BTN } from "@/components/k5/home/k5Bits";
import { K5WeatherTile } from "@/components/k5/home/K5WeatherTile";
import { weekKeys, keyToDate } from "@/utils/k5Calendar";

const VIEWS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

function greeting(hour) {
  if (hour < 12) return "Good Morning!";
  if (hour < 17) return "Good Afternoon!";
  return "Good Evening!";
}

// "America/New_York" -> "New York time".
const zoneLabel = (timezone) => `${String(timezone).split("/").pop().replace(/_/g, " ")} time`;

function titles(viewName, selectedDate) {
  if (viewName === "week") {
    const keys = weekKeys(selectedDate);
    const first = keyToDate(keys[0]);
    const last = keyToDate(keys[6]);
    const range = first.getMonth() === last.getMonth() ? `${format(first, "MMMM d")} – ${format(last, "d")}` : `${format(first, "MMM d")} – ${format(last, "MMM d")}`;
    return ["My Week", range];
  }
  if (viewName === "month") return [format(selectedDate, "MMMM"), format(selectedDate, "yyyy")];
  return [format(selectedDate, "EEEE"), format(selectedDate, "MMMM d, yyyy")];
}

/**
 * Planner toolbar (mockup top card): clock in the student's timezone with a greeting,
 * previous / next, the period title, and the Today / Week / Month switch. PreK has no
 * Month view (plan 12.8). The weather tile shows real weather for the timezone city and is hidden until it arrives.
 */
export function K5Toolbar({ now, timezone, viewName, onView, selectedDate, onPrev, onNext, onToday, isCurrent, isPreK }) {
  const [big, small] = titles(viewName, selectedDate);
  const views = isPreK ? VIEWS.filter((v) => v.key !== "month") : VIEWS;
  const unit = viewName === "week" ? "week" : viewName === "month" ? "month" : "day";
  // Mockup: a moon before 6 AM and from 6 PM in the student's timezone, else a sun.
  const night = now.getHours() < 6 || now.getHours() >= 18;

  return (
    <div className={`${K5_CARD} flex flex-wrap items-center gap-3 px-4 pb-3 pt-3.5`}>
      <div className="flex items-center gap-2.5 rounded-[20px] bg-k5-yt py-2 pl-2 pr-4 max-[760px]:box-border max-[760px]:w-full">
        <span className={`flex h-14 w-14 flex-none items-center justify-center rounded-full max-[760px]:h-[52px] max-[760px]:w-[52px] ${night ? "bg-[#6A3FC4]/15" : "bg-[#FFC531]/25"}`}>
          {night ? (
            <Moon className="h-10 w-10 fill-[#8B6BE0] text-[#6A3FC4]" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Sun className="h-10 w-10 fill-[#FFC531] text-[#FFB020]" strokeWidth={2} aria-hidden="true" />
          )}
        </span>
        <div className="flex flex-col whitespace-nowrap">
          <span className="font-k5-display text-[28px] font-semibold leading-none text-k5-ink max-[760px]:text-[25px]">{format(now, "h:mm a")}</span>
          <span className="text-[15px] font-black text-k5-yx">{greeting(now.getHours())}</span>
          <span className="text-[13px] font-extrabold text-k5-yx">{zoneLabel(timezone)}</span>
        </div>
      </div>

      <K5WeatherTile timezone={timezone} />

      <div className="flex items-center gap-1.5 max-[760px]:flex-[1_1_100%] max-[760px]:justify-center">
        <button type="button" aria-label={`Previous ${unit}`} onClick={onPrev} className={K5_ROUND_BTN}>
          <ChevronLeft className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>
        <span className="flex min-w-[150px] flex-col items-center whitespace-nowrap text-center">
          <span className="font-k5-display text-[26px] font-semibold leading-[1.1] text-k5-ink">{big}</span>
          <span className="text-base font-extrabold text-k5-mut">{small}</span>
        </span>
        <button type="button" aria-label={`Next ${unit}`} onClick={onNext} className={K5_ROUND_BTN}>
          <ChevronRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-[1_1_0px] flex-wrap items-center justify-center gap-2.5 max-[760px]:order-5 max-[760px]:flex-[0_1_auto]">
        {!isCurrent && (
          <button type="button" onClick={onToday} className="min-h-11 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-4 text-[15px] font-black text-k5-acx">
            Back to today
          </button>
        )}
      </div>

      <div role="group" aria-label="Calendar view" data-pin="views" className="ms-auto flex flex-none gap-1 rounded-full bg-k5-act p-[5px] max-[760px]:me-auto">
        {views.map((v) => {
          const active = v.key === viewName;
          return (
            <button
              key={v.key}
              type="button"
              aria-pressed={active}
              onClick={() => onView(v.key)}
              className={`min-h-11 cursor-pointer rounded-full border-none px-[15px] font-k5-display text-[17px] font-semibold ${
                active ? "bg-k5-ac text-white shadow-[0_4px_0_var(--k5-acd)]" : "bg-transparent text-k5-ink"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
