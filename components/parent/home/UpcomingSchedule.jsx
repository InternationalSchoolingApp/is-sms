"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useParentChildSchedule } from "@/hooks/parent/useParentHome";
import { dashboardNavHref } from "@/utils/dashboardNav";
import { clockInZone, scheduleBadge, wallTimeToDate } from "@/utils/parentHome";

const ARROW = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

const TICK = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12 5 5 9-10" />
  </svg>
);

const BOOK = <path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z M12 6v13.5" />;

/**
 * "{Child}'s Classes & Activities Today" (design board timeline): the selected child's schedule for today, times in the
 * child's timezone, each row Completed / Live now / Upcoming (or the class's own status once it has ended), kept current.
 * Opens Class Schedule.
 */
export function UpcomingSchedule({ withClass = true, childName = "" }) {
  const { school } = useParams();
  const { isLoading, schedule, timeZone } = useParentChildSchedule();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  const scheduleHref = dashboardNavHref(school, "parent", "parent-class-schedule");

  return (
    <section className="tile" aria-labelledby="pd-ev" style={{ animationDelay: ".08s" }}>
      <div className="ev-h">
        <h2 id="pd-ev">
          {childName ? `${childName}'s ` : ""}
          {withClass ? "Classes & Activities Today" : "Activities Today"}
        </h2>
      </div>
      <Link className="go" href={scheduleHref} aria-label="View all classes and activities">
        {ARROW}
      </Link>
      <div className="tl2" aria-busy={isLoading}>
        {isLoading ? (
          [0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--soft)]" />)
        ) : schedule.length === 0 ? (
          <p className="empty">No classes or activities today</p>
        ) : (
          schedule.map((item) => {
            const start = wallTimeToDate(item.start, item.timezone);
            const end = wallTimeToDate(item.end, item.timezone);
            const badge = scheduleBadge(item, now);
            const state = badge?.tone === "live" ? "live" : badge?.tone === "warning" ? "next" : "done";
            const icon = typeof item.icon === "string" && /^https?:\/\//i.test(item.icon) ? item.icon : null;
            return (
              <div key={item.id} className={`tr ${state}`}>
                <div className="tr-time">
                  <b>{start ? clockInZone(start, timeZone) : ""}</b>
                  {end ? clockInZone(end, timeZone) : ""}
                </div>
                <div className="tr-line" aria-hidden="true">
                  <i>
                    {state === "done" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    )}
                  </i>
                </div>
                <Link href={scheduleHref} className="cls2 no-underline">
                  <span className="cls2-ic" aria-hidden="true">
                    {icon ? (
                      <Image src={icon} alt="" width={26} height={26} unoptimized className="h-[26px] w-[26px] rounded-md object-cover" />
                    ) : (
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        {BOOK}
                      </svg>
                    )}
                  </span>
                  <div className="cls2-t">
                    <b>{item.courseName || item.entityName}</b>
                    {badge && (
                      <span className={`chip2 ${state === "live" ? "live" : state === "next" ? "next" : ""}`} style={badge.tone === "danger" ? { background: "var(--redT)", color: "var(--red)" } : undefined}>
                        {state === "live" ? <i /> : state === "done" && badge.tone !== "danger" ? TICK : null}
                        {state === "live" ? "Live now" : badge.label}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
