"use client";

import { useEffect, useMemo, useState } from "react";
import { chartMonths, gradeFromPercentage } from "@/utils/parentHome";

const TABS = [
  { id: "att", label: "Attendance" },
  { id: "grades", label: "Grades" },
];

/**
 * "Performance Overview" (design board): the Attendance and Grades column charts for the selected child, January up to
 * the current month. A month with no data is a short grey bar with no label. Bars grow in once drawn.
 */
export function PerformanceOverview({ details }) {
  const [tab, setTab] = useState("att");
  const [grown, setGrown] = useState(false);
  const attendance = useMemo(() => chartMonths(details?.attendanceOverview, (r) => r.attendancePercent), [details]);
  const grades = useMemo(() => chartMonths(details?.gradeOverview, (r) => parseFloat(r.averagePercentage)), [details]);
  const data = tab === "att" ? attendance : grades;
  const isGrades = tab === "grades";

  // Two animation frames after a (re)draw, so the bars animate from zero (as the board does).
  useEffect(() => {
    let second;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setGrown(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      setGrown(false);
    };
  }, [tab, data]);

  return (
    <div className="duo">
      <section className="tile" aria-labelledby="pd-perf" style={{ animationDelay: ".16s" }}>
        <div className="ph">
          <h2 id="pd-perf">Performance Overview</h2>
          <div className="tabs" role="tablist" aria-label="Performance">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className={`chart ${grown ? "on" : ""}`} role="img" aria-label={isGrades ? "Grades by month" : "Attendance by month"}>
          <div className="yax" aria-hidden="true">
            {[100, 75, 50, 25, 0].map((v, i) => (
              <span key={v} style={{ top: `${i * 25}%` }}>
                <em>{isGrades ? gradeFromPercentage(v) : `${v}%`}</em>
              </span>
            ))}
          </div>
          <div className="bars">
            {data.map((d) => (
              <div key={d.key} className={`bar${isGrades ? " g" : d.value >= 100 ? " hi" : ""}`} title={`${d.label}: ${d.value}%`}>
                <b style={{ bottom: `calc(${d.value}% + 6px)` }}>{d.value ? (isGrades ? gradeFromPercentage(d.value) : `${d.value}%`) : ""}</b>
                <i style={{ height: grown ? `${Math.max(d.value, 4)}%` : 0 }} />
                <small>{d.label}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
