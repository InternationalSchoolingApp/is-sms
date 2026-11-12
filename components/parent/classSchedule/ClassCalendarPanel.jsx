"use client";

import { CalendarDays, Globe } from "lucide-react";
import { ParentMobileTableCard } from "@/components/parent/common/ParentMobileTableCard";
import { DatePicker } from "@/components/ui/date-picker";
import { VIEWS, attendanceLabel, eventStatus, timeRange } from "@/components/parent/classSchedule/scheduleRows";
import { pickerDateToYmd, ymdToPickerDate } from "@/utils/attendanceDates";

const TONES = {
  live: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
  muted: "bg-slate-100 text-slate-600",
  warning: "bg-amber-50 text-amber-700",
};
const HEADERS = ["S.No", "Course Name", "Time | Duration", "Teacher | Host", "Type", "Status", "Classes Attendance"];
const CATEGORIES = [
  { key: "ALL", label: "All", count: "all", tab: "border-slate-400 bg-slate-50 text-black" },
  { key: "CLASS", label: "Classes", count: "classes", tab: "border-primary bg-primary/10 text-primary" },
  { key: "ACTIVITY", label: "Activity", count: "activities", tab: "border-slate-500 bg-slate-100 text-slate-700" },
];

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[status.tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status.tone === "live" ? "animate-pulse" : ""}`} aria-hidden="true" />
      {status.label}
    </span>
  );
}

function TypeBadge({ category }) {
  return category === "CLASS" ? (
    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Class</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">Activity</span>
  );
}

/**
 * The shared body of the parent Class Schedule and Class Summary pages (legacy: the same toolbar and day-by-day
 * table on both). Presentational: the page owns the view, the custom range, the data and the clock.
 *  - days: groupByDay result; counts: countByCategory of the shown range (before the category filter)
 *  - custom: { from, to, onFrom, onTo, onSearch, error, bounds {min, max} } (ymd strings)
 *  - state: { isLoading, sessionOut, failed, retry, idle } — idle = a custom range not applied yet
 *  - onViewSummary(event): when given, a "View Summary" column is added
 */
export function ClassCalendarPanel({
  title,
  timeZone,
  clock,
  view,
  onView,
  category,
  onCategory,
  counts,
  days,
  now,
  custom,
  state,
  emptyDay = "No Class / Activity",
  onViewSummary,
}) {
  const headers = onViewSummary ? [...HEADERS, "View Summary"] : HEADERS;
  const message = state.isLoading
    ? "Loading…"
    : state.sessionOut
      ? "Your session has expired. Please log in again."
      : state.failed
        ? "Unable to load the schedule."
        : state.idle
          ? "Select a start date and an end date, then press Search."
          : null;

  const cells = (event, serial) => {
    const summaryCell =
      event.attended && event.meetingId ? (
        <button
          key="view"
          type="button"
          onClick={() => onViewSummary(event)}
          className="rounded-lg border border-primary bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
        >
          View
        </button>
      ) : (
        "N/A"
      );
    const attendance = attendanceLabel(event);
    return [
      serial,
      event.courseName,
      timeRange(event, timeZone),
      event.teacher,
      <TypeBadge key="type" category={event.category} />,
      <StatusBadge key="status" status={eventStatus(event, now)} />,
      <span key="attendance" className={attendance === "N/A" ? "text-black" : "text-primary"}>
        {attendance}
      </span>,
      ...(onViewSummary ? [summaryCell] : []),
    ];
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-full border border-slate-200" role="group" aria-label="Date range">
          {VIEWS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onView(item.key)}
              aria-pressed={view === item.key}
              className={`px-4 py-1.5 text-sm font-semibold ${view === item.key ? "bg-primary text-white" : "bg-white text-black hover:bg-slate-50"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center text-sm text-black">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Globe className="h-4 w-4 text-slate-500" aria-hidden="true" />
            {timeZone}
          </span>
          {clock && <span className="font-semibold text-primary">{clock}</span>}
        </div>

        <div className="flex gap-2" role="group" aria-label="Show">
          {CATEGORIES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onCategory(item.key)}
              aria-pressed={category === item.key}
              className={`min-w-[72px] rounded-md border px-3 py-1 text-center ${item.tab} ${category === item.key ? "ring-2 ring-primary/40" : "opacity-80"}`}
            >
              <span className="block text-base font-bold leading-tight">{counts[item.count]}</span>
              <span className="block text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <hr className="my-4 border-slate-200" />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-slate-200 p-3">
        <h2 className="text-lg font-bold text-black sm:text-xl">{title}</h2>
        {view === "custom" && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40">
              <DatePicker
                icon={CalendarDays}
                label="Start date"
                height="h-11"
                value={ymdToPickerDate(custom.from)}
                fromDate={ymdToPickerDate(custom.bounds.min)}
                toDate={ymdToPickerDate(custom.bounds.max)}
                onChange={(date) => custom.onFrom(pickerDateToYmd(date) ?? "")}
              />
            </div>
            <div className="w-40">
              <DatePicker
                icon={CalendarDays}
                label="End date"
                height="h-11"
                value={ymdToPickerDate(custom.to)}
                fromDate={ymdToPickerDate(custom.bounds.min)}
                toDate={ymdToPickerDate(custom.bounds.max)}
                onChange={(date) => custom.onTo(pickerDateToYmd(date) ?? "")}
              />
            </div>
            <button type="button" onClick={custom.onSearch} className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:opacity-90">
              Search
            </button>
          </div>
        )}
      </div>
      {view === "custom" && custom.error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {custom.error}
        </p>
      )}

      {message ? (
        <div className="border border-t-0 border-slate-200 py-8 text-center text-sm text-black/60">
          <p>{message}</p>
          {state.failed && !state.isLoading && (
            <button type="button" onClick={state.retry} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              Try again
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Phones: a heading per day, one card per class (column title beside each value). */}
          <div className="space-y-3 md:hidden">
            {days.map((day) => (
              <section key={day.ymd} className="pt-3">
                <h3 className="rounded bg-slate-100 py-1 text-center text-sm font-bold text-black">{day.heading}</h3>
                {day.rows.length === 0 ? (
                  <p className="py-3 text-center text-sm text-black/50">{emptyDay}</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {day.rows.map((event, index) => (
                      <li key={event.key}>
                        <ParentMobileTableCard rows={cells(event, index + 1).map((value, column) => ({ label: headers[column], value }))} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[800px] border border-slate-200 text-left text-xs text-black">
              <thead className="bg-primary text-white">
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="px-3 py-3 font-normal">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <DayRows key={day.ymd} day={day} columns={headers.length} cells={cells} emptyDay={emptyDay} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function DayRows({ day, columns, cells, emptyDay }) {
  return (
    <>
      <tr>
        <td colSpan={columns} className="bg-slate-100 py-1.5 text-center text-sm font-bold">
          {day.heading}
        </td>
      </tr>
      {day.rows.length === 0 ? (
        <tr>
          <td colSpan={columns} className="py-2 text-center text-black/50">
            {emptyDay}
          </td>
        </tr>
      ) : (
        day.rows.map((event, index) => (
          <tr key={event.key} className="border-b border-slate-200">
            {cells(event, index + 1).map((value, column) => (
              <td key={column} className="px-3 py-2 align-middle">
                {value}
              </td>
            ))}
          </tr>
        ))
      )}
    </>
  );
}
