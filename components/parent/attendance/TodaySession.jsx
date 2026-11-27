"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useParentChildSchedule } from "@/hooks/parent/useParentHome";
import { dashboardNavHref } from "@/utils/dashboardNav";
import { clockInZone, scheduleBadge, wallTimeToDate } from "@/utils/parentHome";
import "@/components/parent/attendance/attendance.css";

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
    <div className="pv-card" style={{ marginTop: 16 }}>
      <div className="at-hd">
        <div>
          <h3>Today&apos;s Session</h3>
          <p className="sub">Classes and activities planned for today.</p>
        </div>
        <Link href={scheduleHref} className="fbtn o">
          View All
        </Link>
      </div>
      {isLoading ? (
        <ul className="at-ses" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <li key={i}>
              <div className="at-skel" />
            </li>
          ))}
        </ul>
      ) : failed ? (
        <p className="pv-empty">We could not load today&apos;s sessions.</p>
      ) : schedule.length === 0 ? (
        <p className="pv-empty">No classes or activities today</p>
      ) : (
        <ul className="at-ses">
          {schedule.slice(0, MAX_ITEMS).map((item) => {
            const start = wallTimeToDate(item.start, item.timezone);
            const end = wallTimeToDate(item.end, item.timezone);
            const badge = scheduleBadge(item, now);
            const icon = typeof item.icon === "string" && /^https?:\/\//i.test(item.icon) ? item.icon : null;
            return (
              <li key={item.id}>
                <Link href={scheduleHref}>
                  {icon ? (
                    <Image src={icon} alt="" width={44} height={44} unoptimized className="ic" />
                  ) : (
                    <span className="ic" aria-hidden="true" />
                  )}
                  <span className="tx">
                    <b>{item.courseName || item.entityName}</b>
                    {start && end && (
                      <span>
                        {clockInZone(start, timeZone)} to {clockInZone(end, timeZone)}
                      </span>
                    )}
                  </span>
                  {badge && <span className={`at-badge ${badge.tone}`}>{badge.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
