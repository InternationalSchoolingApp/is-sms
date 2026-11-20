"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { K5_CARD, K5_ROUND_BTN } from "@/components/k5/home/k5Bits";
import { K5ClockIcon } from "@/components/k5/home/K5ClockIcon";
import { K5WeatherTile, kindOf } from "@/components/k5/home/K5WeatherTile";
import { useK5Weather } from "@/hooks/useK5Weather";
import { weekKeys, keyToDate } from "@/utils/k5Calendar";

const VIEWS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

function greeting(hour) {
  // `hour` is the hour in the student's timezone (now comes from nowIn(timezone)).
  if (hour < 5) return "Good Evening!";
  if (hour < 12) return "Good Morning!";
  if (hour < 17) return "Good Afternoon!";
  if (hour < 21) return "Good Evening!";
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
export function K5Toolbar({ now, timezone, viewName, onView, selectedDate, onPrev, onNext, onToday, isPreK }) {
  const [big, small] = titles(viewName, selectedDate);
  const views = isPreK ? VIEWS.filter((v) => v.key !== "month") : VIEWS;
  const unit = viewName === "week" ? "week" : viewName === "month" ? "month" : "day";
  const weather = useK5Weather(timezone);
  // Real weather decides day / night and the picture; until it arrives, the clock does.
  const night = weather ? !weather.isDay : now.getHours() < 6 || now.getHours() >= 18;
  // The Good Evening greeting gets a soft night-lavender card instead of the light yellow one.
  const goodNight = greeting(now.getHours()) === "Good Evening!";

  return (
    <div className={`${K5_CARD} flex flex-wrap items-center gap-3 px-4 pb-3 pt-3.5 in-data-[hand=left]:flex-row-reverse in-data-[hand=left]:justify-end min-[1101px]:in-data-[hand=left]:grid min-[1101px]:in-data-[hand=left]:grid-cols-[1fr_auto_1fr]`}>
      <div className={`k5h-tbox in-data-[hand=left]:ms-auto min-[1101px]:in-data-[hand=left]:order-3 min-[1101px]:in-data-[hand=left]:justify-self-end flex items-center gap-2.5 rounded-[22px] ${goodNight ? "bg-[#e6e3fb]" : "bg-k5-yt"} px-2.5 py-1.5 max-[760px]:box-border max-[760px]:w-full max-[760px]:flex-nowrap max-[760px]:gap-2 max-[760px]:px-2`}>
        <K5ClockIcon kind={weather ? kindOf(weather.code) : "sun"} night={night} className="max-[760px]:!h-11 max-[760px]:!w-11" />
        <div className="flex flex-none flex-col items-start whitespace-nowrap text-start">
          <span className="font-k5-display text-[26px] font-bold leading-none text-k5-ink max-[760px]:text-[22px]">{format(now, "h:mm a")}</span>
          <span className="font-k5-display text-base font-semibold leading-[1.2] text-k5-ink">{greeting(now.getHours())}</span>
          <span className={`k5h-zone text-[13px] font-extrabold ${goodNight ? "text-[#4b3fa6]" : "text-k5-yx"}`}>{zoneLabel(timezone)}</span>
        </div>
        <K5WeatherTile weather={weather} />
      </div>

      <div data-pin="prevnext" className="min-[1101px]:in-data-[hand=left]:order-2 min-[1101px]:in-data-[hand=left]:justify-self-center flex items-center gap-1.5 max-[760px]:flex-[1_1_100%] max-[760px]:justify-center">
        <button type="button" aria-label={`Previous ${unit}`} onClick={onPrev} className={K5_ROUND_BTN}>
          <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={3} aria-hidden="true" />
        </button>
        <span className="flex min-w-[150px] flex-col items-center whitespace-nowrap text-center">
          <span className="font-k5-display text-[26px] font-semibold leading-[1.1] text-k5-ink">{big}</span>
          <span className="text-base font-extrabold text-k5-mut">{small}</span>
        </span>
        <button type="button" aria-label={`Next ${unit}`} onClick={onNext} className={K5_ROUND_BTN}>
          <ChevronRight className="h-[22px] w-[22px]" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>

      <div role="group" aria-label="Calendar view" data-pin="views" className="ms-auto in-data-[hand=left]:ms-0! min-[1101px]:in-data-[hand=left]:order-1 min-[1101px]:in-data-[hand=left]:justify-self-start flex flex-none gap-1 rounded-full bg-k5-act p-[5px] max-[760px]:me-auto">
        {views.map((v) => {
          const active = v.key === viewName;
          return (
            <button
              key={v.key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (v.key === "today") onToday();
                onView(v.key);
              }}
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
