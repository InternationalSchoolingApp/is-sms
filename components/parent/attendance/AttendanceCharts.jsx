"use client";

import dynamic from "next/dynamic";

// ApexCharts touches `window` on import, so it only loads in the browser.
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PRESENT = "#16a34a";
const NO_CLASSES = "#e3e8e6";
// Present / Late / Absent. Early Leave stays hidden, as in the legacy widget (product decision). Every slice is
// also labelled with its name and count, so colour is never the only signal.
const SUMMARY = [
  { key: "classesAttended", label: "Present", color: PRESENT },
  { key: "late", label: "Late", color: "#d97706" },
  { key: "absent", label: "Absent", color: "#e11d48" },
];

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Attendance % per month of `year` (legacy "Performance Overview" bars). A month with no class held is grey, not 0%. */
export function MonthlyChart({ months, year }) {
  const byLabel = Object.fromEntries(
    months.filter((m) => String(m?.monthKey ?? "").startsWith(String(year))).map((m) => [m.monthLabel, m]),
  );
  const values = MONTHS.map((label) => {
    const month = byLabel[label];
    return month && month.totalClassesHeld > 0 ? Number(month.attendancePercent) || 0 : null;
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
          <div style="font-size:18px;font-weight:700;color:#111">${esc(value)}%</div>
          <div style="font-size:12px;color:#444">${esc(month.attendedClasses ?? 0)} of ${esc(month.totalClassesHeld)} classes attended</div>
          <div style="font-size:12px;color:#666">${MONTHS[dataPointIndex]} ${esc(year)}</div>
        </div>`;
      },
    },
  };

  return <Chart type="bar" height={320} options={options} series={[{ name: "Attendance", data: values }]} />;
}

/** This month's Present / Late / Absent breakdown (legacy "Monthly Summary" radial chart plus a legend list). */
export function SummaryChart({ summary }) {
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
        barLabels: { enabled: true, useSeriesColors: false, offsetX: -8, fontSize: "14px", formatter: (name, opts) => `${name}: ${counts[opts.seriesIndex]}` },
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
