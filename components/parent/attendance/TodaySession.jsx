"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useParentChildSchedule } from "@/hooks/parent/useParentHome";
import { dashboardNavHref } from "@/utils/dashboardNav";
import { clockInZone, scheduleBadge, wallTimeToDate } from "@/utils/parentHome";

const TONES = {
  live: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
  muted: "bg-slate-100 text-slate-600",
  warning: "bg-amber-50 text-amber-700",
};
const MAX_ITEMS = 5; // legacy shows the first five

/** "Today's Session": the child's classes and activities today in the child's timezone, with "View All" to Class Schedule. */
export function TodaySession() {
  const { school } = useParams();
  const { isLoading, failed, schedule, timeZone } = useParentChildSchedule();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  const scheduleHref = dashboardNavHref(school, "parent", "parent-class-schedule");

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 className="text-base font-bold text-black">Today&apos;s Session</h2>
        <Link href={scheduleHref} className="text-sm font-semibold text-primary no-underline">
          View All →
        </Link>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : failed ? (
          <p className="py-3 text-center text-sm text-black/60">We could not load today&apos;s sessions.</p>
        ) : schedule.length === 0 ? (
          <p className="py-3 text-center text-sm font-semibold text-black">No classes or activities today</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {schedule.slice(0, MAX_ITEMS).map((item) => {
              const start = wallTimeToDate(item.start, item.timezone);
              const end = wallTimeToDate(item.end, item.timezone);
              const badge = scheduleBadge(item, now);
              const icon = typeof item.icon === "string" && /^https?:\/\//i.test(item.icon) ? item.icon : null;
              return (
                <li key={item.id} className="min-w-0 rounded-[10px] border border-slate-200">
                  <Link href={scheduleHref} className="flex items-center gap-3 p-2 no-underline">
                    {icon ? (
                      <Image src={icon} alt="" width={40} height={40} unoptimized className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="h-10 w-10 shrink-0 rounded-lg bg-slate-200" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-black">{item.courseName || item.entityName}</span>
                      {start && end && (
                        <span className="block text-xs text-black/60">
                          {clockInZone(start, timeZone)} to {clockInZone(end, timeZone)}
                        </span>
                      )}
                    </span>
                    {badge && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${TONES[badge.tone]}`}>{badge.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
