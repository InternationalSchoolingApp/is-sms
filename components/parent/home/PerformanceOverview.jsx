"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/parent/home/BarChart";
import { chartMonths, gradeFromPercentage } from "@/utils/parentHome";

const TABS = [
  { id: "attendance", label: "Attendance" },
  { id: "grades", label: "Grades" },
];

/**
 * "Performance Overview": the Attendance and Grades column charts for the selected child, January up to the
 * current month (legacy ApexCharts, rebuilt as small SVG charts). A month with no data is a grey 0 bar.
 */
export function PerformanceOverview({ details }) {
  const [tab, setTab] = useState("attendance");
  const attendance = useMemo(() => chartMonths(details?.attendanceOverview, (r) => r.attendancePercent), [details]);
  const grades = useMemo(() => chartMonths(details?.gradeOverview, (r) => parseFloat(r.averagePercentage)), [details]);

  return (
    <section className="mt-5">
      <h2 className="text-base font-extrabold text-black">Performance Overview</h2>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div role="tablist" aria-label="Performance charts" className="mb-4 inline-flex rounded-full bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`perf-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`perf-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${tab === t.id ? "bg-primary text-white" : "text-black hover:bg-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "attendance" ? (
          <div role="tabpanel" id="perf-panel-attendance" aria-labelledby="perf-tab-attendance">
            <BarChart
              data={attendance}
              ticks={4}
              barColor={(v) => (v === 0 ? "#e3e8e6" : "#1e8e3e")}
              yLabel={(v) => `${Math.round(v)}%`}
              tooltip={(d) => [`${d.value}%`, "Attendance", d.label]}
              ariaLabel="Attendance by month"
            />
          </div>
        ) : (
          <div role="tabpanel" id="perf-panel-grades" aria-labelledby="perf-tab-grades">
            <BarChart
              data={grades}
              ticks={5}
              barColor={(v) => (v === 0 ? "#e3e8e6" : "#1a73e8")}
              yLabel={(v) => gradeFromPercentage(v)}
              tooltip={(d) => [gradeFromPercentage(d.value), `${d.value}%`, d.label]}
              ariaLabel="Grades by month"
            />
          </div>
        )}
      </div>
    </section>
  );
}
