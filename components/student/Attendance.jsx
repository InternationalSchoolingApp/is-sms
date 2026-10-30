"use client";

import dynamic from "next/dynamic";
import { CalendarCheck, Clock, PieChart, Presentation, TrendingDown, TrendingUp } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentAttendance } from "@/hooks/useStudentAttendance";

// ApexCharts touches `window` on import, so it only loads in the browser.
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRESENT = "#16a34a";
const NO_CLASSES = "#e3e8e6";
// Present / Late / Absent — validated together (dataviz validator, light surface). Late and Present sit in
// the CVD floor band, so every slice is also labelled with its name and count.
const SUMMARY = [
  { key: "classesAttended", label: "Present", color: PRESENT },
  { key: "late", label: "Late", color: "#d97706" },
  // Early Leave stays hidden, as in the legacy widget (product decision).
  { key: "absent", label: "Absent", color: "#e11d48" },
];

function StatCard({ label, icon: Icon, iconClass, children }) {
  return (
    <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs text-black/60">{label}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">{children}</div>
      </div>
      <span className={`rounded-lg p-2 ${iconClass}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </div>
  );
}

// A change vs last month: `goodWhenUp` decides whether a rise is shown as good (green) or bad (red).
function Delta({ value, unit, goodWhenUp }) {
  const delta = Number(value) || 0;
  const good = goodWhenUp ? delta > 0 : delta < 0;
  const Arrow = delta < 0 ? TrendingDown : TrendingUp;
  const tone = delta === 0 ? "text-black/60" : good ? "text-green-700" : "text-red-700";
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${tone}`}>
      {delta !== 0 && <Arrow className="h-4 w-4" aria-hidden="true" />}
      {delta > 0 ? "+" : ""}
      {delta}
      {unit} vs last month
    </span>
  );
}

function MonthlyChart({ months }) {
  const year = new Date().getFullYear();
  const byLabel = Object.fromEntries(
    months.filter((m) => m.monthKey?.startsWith(String(year))).map((m) => [m.monthLabel, m])
  );
  // A month with no class held has no attendance to show (grey, no tooltip), not 0%.
  const values = MONTHS.map((label) => {
    const month = byLabel[label];
    return month && month.totalClassesHeld > 0 ? month.attendancePercent : null;
  });

  const options = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { columnWidth: "45%", borderRadius: 4, borderRadiusApplication: "end", distributed: true } },
    colors: values.map((v) => (v === null ? NO_CLASSES : PRESENT)),
    legend: { show: false },
    dataLabels: { enabled: false },
    xaxis: { categories: MONTHS, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: (v) => `${v}%` } },
    grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
    states: { hover: { filter: { type: "darken", value: 0.9 } } },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const value = values[dataPointIndex];
        if (value === null) return "";
        const month = byLabel[MONTHS[dataPointIndex]];
        return `<div style="padding:8px 12px;text-align:center;min-width:140px">
          <div style="font-size:18px;font-weight:700;color:#111">${value}%</div>
          <div style="font-size:12px;color:#444">${month.attendedClasses} of ${month.totalClassesHeld} classes attended</div>
          <div style="font-size:12px;color:#666">${MONTHS[dataPointIndex]} ${year}</div>
        </div>`;
      },
    },
  };

  return <Chart type="bar" height={320} options={options} series={[{ name: "Attendance", data: values }]} />;
}

function SummaryChart({ summary }) {
  const held = Number(summary.totalClassesHeldThisMonth) || 0;
  const counts = SUMMARY.map((s) => Number(summary[s.key]) || 0);
  const percents = counts.map((count) => (held > 0 ? Number(((count / held) * 100).toFixed(1)) : 0));

  const options = {
    chart: { type: "radialBar", fontFamily: "inherit" },
    plotOptions: {
      radialBar: {
        startAngle: 0,
        endAngle: 270,
        hollow: { margin: 5, size: "30%", background: "transparent" },
        dataLabels: { name: { show: false }, value: { show: false } },
        barLabels: {
          enabled: true,
          useSeriesColors: false,
          offsetX: -8,
          fontSize: "14px",
          formatter: (name, opts) => `${name}: ${counts[opts.seriesIndex]}`,
        },
      },
    },
    colors: SUMMARY.map((s) => s.color),
    labels: SUMMARY.map((s) => s.label),
    tooltip: { enabled: false },
  };

  return (
    <>
      <Chart type="radialBar" height={320} options={options} series={percents} />
      <ul className="mt-2 space-y-1 text-sm text-black">
        {SUMMARY.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
            <span className="flex-1">{s.label}</span>
            <span className="font-semibold">{counts[i]}</span>
            <span className="w-14 text-right text-black/60">{percents[i]}%</span>
          </li>
        ))}
        <li className="flex justify-between border-t border-slate-200 pt-1 text-black/60">
          <span>Classes held this month</span>
          <span className="font-semibold text-black">{held}</span>
        </li>
      </ul>
    </>
  );
}

/**
 * My Attendance (sidebar pageLink `student-attendance-overview`) — legacy
 * studentAttendance.js / studentAttendanceContent.js: this month's summary
 * cards, the current year's monthly attendance chart and this month's
 * Present / Late / Absent breakdown.
 */
export function Attendance() {
  const { context } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const { isLoading, sessionOut, summary, months } = useStudentAttendance({ schoolUUID, userId });
  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long" });

  return (
    <div className="mx-auto w-full">
      <div className="flex items-center gap-2 px-1 pb-4">
        <CalendarCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-extrabold text-black sm:text-xl">My Attendance</h1>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-black/50">Loading…</div>
      ) : !summary ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-black/60">
          {sessionOut ? "Your session has expired. Please log in again." : "Attendance details not found"}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Classes Today" icon={Presentation} iconClass="bg-indigo-50 text-indigo-800">
              <span className="text-2xl font-bold text-black">{summary.classesToday ?? 0}</span>
            </StatCard>
            <StatCard label={`Attendance (${monthName} ${now.getFullYear()})`} icon={PieChart} iconClass="bg-green-50 text-green-700">
              <span className="text-2xl font-bold text-black">{summary.attendancePercentThisMonth ?? 0}%</span>
              <Delta value={summary.attendanceDeltaFromLastMonth} unit="%" goodWhenUp />
            </StatCard>
            <StatCard label={`Late (${monthName} ${now.getFullYear()})`} icon={Clock} iconClass="bg-amber-50 text-amber-700">
              <span className="text-2xl font-bold text-black">{summary.latePercentThisMonth ?? 0}%</span>
              <Delta value={summary.lateDeltaFromLastMonth} unit=" classes" goodWhenUp={false} />
            </StatCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
              <h2 className="font-semibold text-black">Attendance by month ({now.getFullYear()})</h2>
              <MonthlyChart months={months} />
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-black">Monthly Summary ({monthName})</h2>
              <SummaryChart summary={summary} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
