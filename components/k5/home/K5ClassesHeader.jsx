"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { K5_CARD } from "@/components/k5/home/k5Bits";

/*
 * Playful.dc.html "My Classes and Activities" page header: the card on top with the calendar-play picture, the page title and the
 * student's clock (with seconds, in their timezone). It replaces the old toolbar (clock + weather + previous / next + view switch):
 * the weather and greeting moved to My Dashboard, and the view switch and arrows moved into the plan card (planChrome.jsx).
 */
const zoneLabel = (timezone) => `${String(timezone).split("/").pop().replace(/_/g, " ")} time`;

function useSecondClock(timezone, initial) {
  const [tick, setTick] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setTick(toZonedTime(new Date(), timezone)), 1000);
    return () => clearInterval(id);
  }, [timezone]);
  return tick;
}

export function K5ClassesHeader({ now, timezone }) {
  const clock = useSecondClock(timezone, now);
  return (
    <div className={`${K5_CARD} flex flex-wrap items-center gap-3 px-4 pb-3 pt-3.5`}>
      <h1 className="m-0 flex min-w-0 flex-[1_1_auto] items-center gap-3 font-k5-display text-[26px] font-semibold leading-[1.15] text-k5-ink">
        <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-k5-act">
          <svg width="32" height="32" viewBox="0 0 36 36" className="block">
            <rect x="3" y="6" width="27" height="25" rx="6" fill="#EEF4FF" stroke="#BCD0F7" />
            <path d="M3 13v-1a6 6 0 0 1 6-6h15a6 6 0 0 1 6 6v1z" fill="#4C8CF5" />
            <rect x="9" y="2.5" width="3.4" height="7" rx="1.7" fill="#FFFFFF" stroke="#9DB7EE" />
            <rect x="20.6" y="2.5" width="3.4" height="7" rx="1.7" fill="#FFFFFF" stroke="#9DB7EE" />
            <g fill="#A9C4F7">
              <rect x="7" y="16" width="5" height="4" rx="1.3" />
              <rect x="14" y="16" width="5" height="4" rx="1.3" />
              <rect x="21" y="16" width="5" height="4" rx="1.3" />
              <rect x="7" y="22.5" width="5" height="4" rx="1.3" />
              <rect x="14" y="22.5" width="5" height="4" rx="1.3" />
            </g>
            <circle cx="27" cy="27" r="7.5" fill="#2FB866" stroke="#FFFFFF" strokeWidth="1.6" />
            <path d="M25.2 23.6v6.8l5.4-3.4z" fill="#FFFFFF" />
          </svg>
        </span>
        <span>My Classes and Activities</span>
      </h1>
      <div className="order-last ms-auto flex flex-none items-center gap-2 rounded-full bg-k5-yt py-1.5 pl-2.5 pr-3.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B3FD4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.2 2" />
        </svg>
        <div className="flex flex-none flex-col items-start whitespace-nowrap text-start">
          <span className="font-k5-display text-lg font-bold leading-none tabular-nums text-k5-ink">{format(clock, "h:mm:ss a")}</span>
          <span className="text-xs font-extrabold text-k5-ink">{zoneLabel(timezone)}</span>
        </div>
      </div>
    </div>
  );
}
