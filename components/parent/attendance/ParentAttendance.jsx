"use client";

import { CalendarCheck, Clock, PieChart, Presentation, TrendingDown, TrendingUp } from "lucide-react";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { MonthlyChart, SummaryChart } from "@/components/parent/attendance/AttendanceCharts";
import { TodaySession } from "@/components/parent/attendance/TodaySession";
import { useParentAttendance } from "@/hooks/parent/useParentAttendance";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { todayYmd } from "@/utils/attendanceDates";

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

/**
 * Parent "Attendance" (pageLink parent-attendance), legacy attendaceByStudentId.js: the selected child's summary
 * cards, the year's monthly attendance chart, this month's Present / Late / Absent breakdown and today's session.
 * The child tabs sit above (parent/layout.jsx); switching child reloads everything. "Today" is the child's today.
 */
export function ParentAttendance() {
  return (
    <ParentChildRequired>
      <SelectedChildAttendance />
    </ParentChildRequired>
  );
}

function SelectedChildAttendance() {
  const { selectedChild } = useSelectedChild();
  const { isLoading, sessionOut, summary, months, timeZone, retry } = useParentAttendance();
  const today = todayYmd(timeZone);
  const year = Number(today.slice(0, 4));
  const monthName = new Date(`${today.slice(0, 7)}-15T12:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const childName = String(selectedChild?.studentName ?? "").trim();

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex items-center gap-2 px-1 pb-4">
        <CalendarCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-extrabold text-black sm:text-xl">Attendance{childName ? ` - ${childName}` : ""}</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      ) : !summary ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-black/70">
            {sessionOut ? "Your session has expired. Please log in again." : "Attendance details not found"}
          </p>
          {!sessionOut && (
            <button type="button" onClick={retry} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Try again
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Classes Today" icon={Presentation} iconClass="bg-indigo-50 text-indigo-800">
              <span className="text-2xl font-bold text-black">{summary.classesToday ?? 0}</span>
            </StatCard>
            <StatCard label={`Attendance (${monthName} ${year})`} icon={PieChart} iconClass="bg-green-50 text-green-700">
              <span className="text-2xl font-bold text-black">{summary.attendancePercentThisMonth ?? 0}%</span>
              <Delta value={summary.attendanceDeltaFromLastMonth} unit="%" goodWhenUp />
            </StatCard>
            <StatCard label={`Late (${monthName} ${year})`} icon={Clock} iconClass="bg-amber-50 text-amber-700">
              <span className="text-2xl font-bold text-black">{summary.latePercentThisMonth ?? 0}%</span>
              <Delta value={summary.lateDeltaFromLastMonth} unit=" classes" goodWhenUp={false} />
            </StatCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
              <h2 className="font-semibold text-black">Performance Overview ({year})</h2>
              <MonthlyChart months={months} year={year} />
            </section>
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-black">Monthly Summary ({monthName})</h2>
              <SummaryChart summary={summary} />
            </section>
          </div>
        </div>
      )}

      <TodaySession />
    </div>
  );
}
