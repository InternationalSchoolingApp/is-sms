"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { DatePicker } from "@/components/ui/date-picker";
import { useAttendanceCustomRangeDays } from "@/hooks/useAttendanceCustomRangeDays";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentAttendanceDetails } from "@/hooks/useStudentAttendanceDetails";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { getBrowserTimezone } from "@/utils/calendarEvents";
import {
  DATE_FILTERS,
  STATUS_OPTIONS,
  apiStatus,
  customBounds,
  pickerDateToYmd,
  rangeForFilter,
  resolveTimeZone,
  todayYmd,
  toDisplayRow,
  validateCustomRange,
  ymdToPickerDate,
} from "@/utils/attendanceDates";
import { isSessionExpiredError } from "@/utils/sessionState";

export const AC = { present: "#13803F", late: "#E8A200", absent: "#E5243B", missS: "#B81A2E", missT: "#E0457B" };
export const ATB = { present: "#E4F4EA", late: "#FFF3D1", absent: "#FDE6E8", missS: "#FBE1E4", missT: "#FDEBF2" };
// What a student sees: only Present / Late / Absent. Other roles (parent, staff) also see why a class was missed.
export const LABEL = { present: "Present", late: "Late", absent: "Absent" };
const DETAILED_LABEL = { ...LABEL, missS: "Missed by Student", missT: "Missed by Teacher" };

// The table's min-width must be the sum of these minimums (75+150+190+100+110+160+130 = 915px): a smaller one lets
// the columns overflow the rows, and scrolling sideways then shows an empty strip past the header / row colours.
const GRID = "75px minmax(150px,1.1fr) minmax(190px,1.4fr) minmax(100px,0.8fr) minmax(110px,0.8fr) minmax(160px,1.1fr) minmax(130px,0.9fr)";
const COLUMNS = ["S. No.", "Date", "Class", "Start Time", "End Time", "Joined", "Status"];
const CELL =
  "px-3.5 py-2.5 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]";
const SELECT =
  "w-full min-h-[50px] cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3 text-base font-extrabold text-k5-ink disabled:cursor-default disabled:bg-k5-soft";
const FIELD_LABEL = "flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-black text-k5-mut max-[760px]:basis-full";
const PAGE_BUTTON = "min-h-11 cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-45";

// The row's chip: a late arrival is "Late". An absent row is "Absent" for a student; other roles see the backend's
// own reason (Missed by Student / Teacher). `reason` always keeps that reason for the Joined note.
function rowKind(row, isStudent) {
  if (row.status === "ABSENT") {
    const text = row.absentLabel || "";
    const reason = /teacher/i.test(text) ? "missT" : /student/i.test(text) ? "missS" : "absent";
    if (isStudent) return { key: "absent", label: LABEL.absent, reason };
    return { key: reason, label: text || DETAILED_LABEL[reason], reason };
  }
  return row.late ? { key: "late", label: LABEL.late, reason: "late" } : { key: "present", label: LABEL.present, reason: "present" };
}

function joinedNote(row, kind) {
  if (kind.reason === "present") return { text: "On time", color: "#13803F" };
  if (kind.reason === "late") return { text: `${row.lateByMinutes} min late`, color: "#8A5A00" };
  if (kind.reason === "missT") return { text: "Teacher could not come", color: "#B52A5C" };
  return { text: "Did not join", color: "#B81A2E" };
}

function Time({ part, empty = "—" }) {
  if (part.time == null) return <>{empty}</>;
  return (
    <>
      {part.time}
      {part.shiftedDate && <span className="block text-[12px] font-extrabold text-k5-mut">{part.shiftedDate}</span>}
    </>
  );
}

/**
 * Attendance Details of My Attendance: date filter (Today / Yesterday / Week / Month / Custom), From / To, status,
 * the table and its pages - all from the backend (student-attendance-details). Times arrive as UTC and are shown
 * in the student's timezone; the class date is a plain date. The Custom range reaches back as far as the
 * backend setting ATTENDANCE_CUSTOM_RANGE_DAYS allows (and never into the future). `status` is shared with the
 * donut / legend above ("" = all).
 */
export function K5AttendanceDetails({ status, onStatusChange }) {
  const { context } = useDashboardContext();
  const isStudent = (context?.role || "student") === "student";
  const labels = isStudent ? LABEL : DETAILED_LABEL;
  const userId = context?.userId;
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId });
  // The student's configured timezone when it is valid, else Asia/Singapore (a valid one is never overwritten).
  const timeZone = resolveTimeZone(dummy.enabled ? getBrowserTimezone() : dashboardData.userTimezone);
  const today = todayYmd(timeZone);

  const [dateFilter, setDateFilter] = useState("MONTH");
  const [customFrom, setCustomFrom] = useState(null);
  const [allChosen, setAllChosen] = useState(false);
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const custom = useAttendanceCustomRangeDays({ userId });

  const isCustom = dateFilter === "CUSTOM";
  const preset = rangeForFilter(dateFilter, today);
  const from = isCustom ? customFrom || today : preset.from;
  const to = isCustom ? today : preset.to;
  const customError = isCustom ? (custom.days ? validateCustomRange(from, to, today, custom.days) : "The custom range is not available right now.") : null;
  const bounds = custom.days ? customBounds(today, custom.days) : null;

  // Any filter change starts again from page 1 (the page belongs to the filters it was chosen under).
  const filtersKey = [dateFilter, from, to, status].join("|");
  const page = pageState.key === filtersKey ? pageState.page : 1;

  const query = useStudentAttendanceDetails({ userId, dateFilter, fromDate: from, toDate: to, status: apiStatus(status), page, enabled: !customError });
  const details = query.data;
  const rows = (details?.rows ?? []).map((row) => toDisplayRow(row, timeZone));
  const totalCount = Number(details?.totalCount) || 0;
  const pageSize = Number(details?.pageSize) || 10;
  const pages = Math.max(1, Math.ceil(totalCount / pageSize));
  const first = (page - 1) * pageSize;
  const sessionError = isSessionExpiredError(query.error);

  function changeDateFilter(next) {
    if (next === "CUSTOM") {
      // Start from the range that was on screen, kept inside what Custom allows.
      const min = bounds?.min;
      setCustomFrom(min && from < min ? min : from);
    }
    setDateFilter(next);
  }

  function changeStatus(value) {
    setAllChosen(value === "all");
    onStatusChange(value === "all" ? "" : value);
  }

  return (
    <section aria-labelledby="k5-at-det" className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-[18px]`}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="k5-at-det" className="m-0 font-k5-display text-2xl font-semibold">Attendance Details</h2>
          <span className="text-[15px] font-extrabold text-k5-mut">Tap a colour in the chart to see only those classes.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {status && (
            <span className="flex items-center gap-2 rounded-full py-1.5 pe-2 ps-3.5 text-[15px] font-black text-k5-ink" style={{ background: ATB[status] }}>
              {labels[status] || LABEL[status]}
              <button type="button" onClick={() => onStatusChange("")} aria-label="Show all" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-k5-card">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true" style={{ stroke: "var(--k5-ink)" }}><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </span>
          )}
          <span aria-live="polite" className="text-[15px] font-extrabold text-k5-mut">
            {totalCount ? `Showing ${first + 1} to ${Math.min(totalCount, first + rows.length)} of ${totalCount} entries` : query.isLoading ? "Loading…" : "Showing 0 entries"}
          </span>
        </div>
      </div>

      <div className="flex flex-nowrap items-end gap-3 rounded-[20px] bg-k5-soft px-3.5 py-3 max-[760px]:flex-wrap">
        <label className={FIELD_LABEL}>
          Date
          <select value={dateFilter} onChange={(e) => changeDateFilter(e.target.value)} className={SELECT}>
            {DATE_FILTERS.map((f) => (
              <option key={f.value} value={f.value} disabled={f.value === "CUSTOM" && !custom.isLoading && !custom.days}>
                {f.label}
                {f.value === "CUSTOM" && !custom.isLoading && !custom.days ? " (not available)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className={`${FIELD_LABEL} max-[760px]:basis-[45%]`}>
          From
          <DatePicker
            icon={CalendarDays}
            value={ymdToPickerDate(from)}
            disabled={!isCustom}
            height="h-[50px]"
            fromDate={ymdToPickerDate(bounds?.min || from)}
            toDate={ymdToPickerDate(today)}
            onChange={(date) => {
              const next = pickerDateToYmd(date);
              if (next) setCustomFrom(next);
            }}
          />
        </div>
        <div className={`${FIELD_LABEL} max-[760px]:basis-[45%]`}>
          To
          {/* To is always today: when Custom is on the picker opens, but today is the only day that can be chosen. */}
          <DatePicker icon={CalendarDays} value={ymdToPickerDate(to)} disabled={!isCustom} height="h-[50px]" fromDate={ymdToPickerDate(today)} toDate={ymdToPickerDate(today)} onChange={() => {}} />
        </div>
        <label className={FIELD_LABEL}>
          Status
          <select value={status || (allChosen ? "all" : "")} onChange={(e) => changeStatus(e.target.value)} className={SELECT}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>
      {isCustom && (
        <p className="m-0 -mt-1 text-sm font-extrabold text-k5-mut">
          {customError || `You can look back ${custom.days} days. To is today.`}
        </p>
      )}

      {query.isError && !sessionError ? (
        <div role="alert" className="flex flex-col items-center gap-2.5 rounded-[18px] border-[3px] border-k5-line px-4 py-6 text-center">
          <p className="m-0 font-k5-display text-lg font-semibold text-[#C81E35]">{query.error?.message || "The attendance details could not be loaded."}</p>
          <button type="button" onClick={() => query.refetch()} className={PAGE_BUTTON}>Try again</button>
        </div>
      ) : (
        <div className={`overflow-x-auto rounded-[18px] border-[3px] border-k5-line max-[760px]:overflow-visible max-[760px]:border-0 ${query.isFetching && details ? "opacity-70" : ""}`}>
          <div role="table" aria-label="Attendance Details" aria-busy={query.isFetching} className="min-w-[915px] text-[15px] font-extrabold max-[760px]:flex max-[760px]:min-w-0 max-[760px]:flex-col max-[760px]:gap-2.5">
            <div role="row" style={{ "--cols": GRID }} className="grid grid-cols-[var(--cols)] bg-k5-ac font-k5-display text-base font-semibold text-white max-[760px]:hidden">
              {COLUMNS.map((c) => (
                <span key={c} role="columnheader" className="p-3.5">{c}</span>
              ))}
            </div>
            {rows.map((r, i) => {
              const kind = rowKind(r, isStudent);
              const note = joinedNote(r, kind);
              return (
                <div
                  key={`${r.classDate}-${r.raw.startTime}-${i}`}
                  role="row"
                  style={{ "--cols": GRID }}
                  className={`grid grid-cols-[var(--cols)] items-center border-t-2 border-k5-line max-[760px]:grid-cols-2 max-[760px]:rounded-[18px] max-[760px]:border-[3px] max-[760px]:py-1.5 ${i % 2 ? "bg-k5-soft" : "bg-k5-card"}`}
                >
                  <span role="cell" className="px-3.5 py-2.5 max-[760px]:order-1 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:font-k5-display max-[760px]:text-lg max-[760px]:font-semibold">{first + i + 1}</span>
                  <span role="cell" data-l="Date" className={`${CELL} max-[760px]:col-span-full`}>{r.classDateLabel}</span>
                  <span role="cell" data-l="Class" className={`${CELL} max-[760px]:col-span-full`}>{r.className}</span>
                  <span role="cell" data-l="Start Time" className={CELL}><Time part={r.start} /></span>
                  <span role="cell" data-l="End Time" className={CELL}><Time part={r.end} /></span>
                  <span role="cell" data-l="Joined" className={`${CELL} leading-tight`}>
                    <span className="block"><Time part={r.joined} /></span>
                    <span className="block text-[13px]" style={{ color: note.color }}>{note.text}</span>
                  </span>
                  <span role="cell" data-l="Status" className={CELL}>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pe-3 ps-1 text-sm font-black text-k5-ink" style={{ background: ATB[kind.key] }}>
                      <span aria-hidden="true" className="h-5 w-5 flex-none rounded-full" style={{ background: AC[kind.key] }} />
                      {kind.label}
                    </span>
                  </span>
                </div>
              );
            })}
            {!rows.length && (
              <div className="px-4 py-7 text-center font-k5-display text-[19px] font-semibold text-k5-mut">
                {query.isLoading || (query.isFetching && !details) ? "Loading…" : customError || "No classes here."}
              </div>
            )}
          </div>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-end gap-2.5">
          <button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPageState({ key: filtersKey, page: page - 1 })} className={PAGE_BUTTON}>
            Previous
          </button>
          <span className="text-[15px] font-black">{page} / {pages}</span>
          <button type="button" disabled={page >= pages || query.isFetching} onClick={() => setPageState({ key: filtersKey, page: page + 1 })} className={PAGE_BUTTON}>
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
