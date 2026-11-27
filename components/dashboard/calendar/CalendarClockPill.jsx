"use client";

import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";

function getTimeOfDay(hour) {
  if (hour >= 5 && hour <= 11) return "Morning";
  if (hour >= 12 && hour <= 16) return "Afternoon";
  if (hour >= 17 && hour <= 19) return "Evening";
  return "Night";
}

const TIME_OF_DAY_STYLE = {
  Morning: "bg-amber-100 text-amber-600",
  Afternoon: "bg-orange-100 text-orange-600",
  Evening: "bg-indigo-100 text-indigo-700",
  Night: "bg-blue-100 text-blue-800",
};

/**
 * Timezone + live clock + time-of-day badge (legacy's clock-pill: flag +
 * timezone label, ticking clock, Morning/Afternoon/Evening/Night badge).
 * No real country flag asset here — a globe icon stands in for it.
 */
export function CalendarClockPill({ timezone }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(now));
  const timeLabel = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).format(now);
  const timeOfDay = getTimeOfDay(hour);

  return (
    <div className="flex items-center gap-2 rounded-full bg-black/5 px-3 py-1.5">
      <Globe2 className="h-3.5 w-3.5 text-black/50" aria-hidden="true" />
      <span className="text-[11px] font-semibold text-black/70">{timezone}</span>
      <span className="text-[11px] font-bold text-black">{timeLabel}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TIME_OF_DAY_STYLE[timeOfDay]}`}>{timeOfDay}</span>
    </div>
  );
}
