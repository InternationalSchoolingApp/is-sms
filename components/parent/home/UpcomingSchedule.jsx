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

/**
 * "Upcoming Classes & Activities": the selected child's schedule for today, times in the child's timezone, each
 * with a Live / Upcoming / status badge that keeps itself current. Opens Class Schedule.
 */
export function UpcomingSchedule({ withClass = true }) {
  const { school } = useParams();
  const { isLoading, schedule, timeZone } = useParentChildSchedule();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  const scheduleHref = dashboardNavHref(school, "parent", "parent-class-schedule");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-extrabold text-black">
        {withClass ? "Upcoming Classes & Activities" : "Upcoming Activities"}
      </h2>
      <div className="max-h-[250px] overflow-y-auto px-5 py-3">
        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : schedule.length === 0 ? (
          <p className="py-6 text-center text-sm text-black/60">No classes or activities today</p>
        ) : (
          <ul className="space-y-2">
            {schedule.map((item) => {
              const start = wallTimeToDate(item.start, item.timezone);
              const end = wallTimeToDate(item.end, item.timezone);
              const badge = scheduleBadge(item, now);
              const icon = typeof item.icon === "string" && /^https?:\/\//i.test(item.icon) ? item.icon : null;
              return (
                <li key={item.id}>
                  <Link href={scheduleHref} className="flex items-center gap-3 rounded-lg px-1 py-1.5 no-underline hover:bg-slate-50">
                    {icon ? (
                      <Image src={icon} alt="" width={40} height={40} unoptimized className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="h-10 w-10 shrink-0 rounded-lg bg-slate-200" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-black">{item.courseName || item.entityName}</span>
                      {start && end && <span className="block text-xs text-black/60">{clockInZone(start, timeZone)} to {clockInZone(end, timeZone)}</span>}
                    </span>
                    {badge && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONES[badge.tone]}`}>{badge.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-slate-100 px-5 py-2.5 text-right">
        <Link href={scheduleHref} className="text-xs font-bold text-primary no-underline">View All →</Link>
      </div>
    </section>
  );
}
