"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLabelTranslator } from "@/i18n/labels";
import { useLocaleTag } from "@/i18n/dateLocale";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { DatePicker } from "@/components/ui/date-picker";
import { useAttendanceCustomRangeDays } from "@/hooks/useAttendanceCustomRangeDays";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentAttendanceDetails } from "@/hooks/useStudentAttendanceDetails";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { DUMMY_STUDENT_TIMEZONE } from "@/utils/calendarEvents";
import {
  DATE_FILTERS,
  STATUS_OPTIONS,
  apiStatus,
  customBounds,
  localDateInZone,
  parseYmd,
  pickerDateToYmd,
  rangeForFilter,
  resolveTimeZone,
  todayYmd,
  toDisplayRow,
  validateCustomRange,
  ymdToPickerDate,
} from "@/utils/attendanceDates";
import { isSessionExpiredError } from "@/utils/sessionState";
import { K5Loading, K5RowsSkeleton, K5Sk } from "@/components/k5/K5Skeletons";

export const AC = { present: "#13803F", late: "#E8A200", absent: "#E5243B", missS: "#B81A2E", missT: "#E0457B" };
export const ATB = { present: "#E4F4EA", late: "#FFF3D1", absent: "#FDE6E8", missS: "#FBE1E4", missT: "#FDEBF2" };
// What a student sees: only Present / Late / Absent. Other roles (parent, staff) also see why a class was missed.
export const LABEL = { present: "Present", late: "Late", absent: "Absent" };
const DETAILED_LABEL = { ...LABEL, missS: "Missed by Student", missT: "Missed by Teacher" };

// The table's min-width must be the sum of these minimums (75+150+190+100+110+160+130 = 915px): a smaller one lets
// the columns overflow the rows, and scrolling sideways then shows an empty strip past the header / row colours.
const GRID = "75px minmax(150px,1.1fr) minmax(190px,1.4fr) minmax(100px,0.8fr) minmax(110px,0.8fr) minmax(160px,1.1fr) minmax(130px,0.9fr)";
// Message keys (k5Attendance.details.columns.*) of the table's columns, in order.
const COLUMNS = ["srNo", "date", "class", "startTime", "endTime", "joined", "status"];
// Messages (k5Attendance.details.errors.*) for the English texts validateCustomRange returns.
const CUSTOM_ERRORS = { "Please choose a valid date.": "invalidDate", "The To date is always today.": "toIsToday", "Future dates cannot be selected.": "noFuture" };
const CELL =
  "px-3.5 py-2.5 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]";
const SELECT =
  "w-full min-h-[50px] cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3 text-base font-extrabold text-k5-ink disabled:cursor-default disabled:bg-k5-soft";
// Each filter keeps room for a whole date ("Nov 30, 2026"); when the row is narrow they wrap two (or one) per line.
const FIELD_LABEL = "flex min-w-[190px] flex-[1_1_190px] flex-col gap-1 text-[13px] font-black text-k5-mut max-[460px]:min-w-full";
const PAGE_BUTTON = "min-h-11 cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-45";

// The row's chip: a late arrival is "Late". An absent row is "Absent" for a student; other roles see the backend's
// own reason (Missed by Student / Teacher). `reason` always keeps that reason for the Joined note.
function rowKind(row, isStudent) {
  if (row.status === "ABSENT") {
    const text = row.absentLabel || "";
    const reason = /teacher/i.test(text) ? "missT" : /student/i.test(text) ? "missS" : "absent";
    if (isStudent) return { key: "absent", label: LABEL.absent, reason };
    return { key: reason, label: text || DETAILED_LABEL[reason], reason, backendLabel: text };
  }
  return row.late ? { key: "late", label: LABEL.late, reason: "late" } : { key: "present", label: LABEL.present, reason: "present" };
}

// `text` is a message key (k5Attendance.details.joined.*); `minutes` fills the late one.
function joinedNote(row, kind) {
  if (kind.reason === "present") return { text: "onTime", color: "#13803F" };
  if (kind.reason === "late") return { text: "minLate", minutes: row.lateByMinutes, color: "#8A5A00" };
  if (kind.reason === "missT") return { text: "teacherAbsent", color: "#B52A5C" };
  return { text: "didNotJoin", color: "#B81A2E" };
}

const NARROW_SPACES = /[  ]/g;

// The row's date and times in the dashboard language: the same Intl options as utils/attendanceDates.js
// (formatClassDate / formatTimeInZone), only with the language's tag instead of "en-US".
function classDateIn(ymd, tag) {
  const p = parseYmd(ymd);
  if (!p) return "";
  return new Intl.DateTimeFormat(tag, { timeZone: "UTC", weekday: "short", month: "short", day: "2-digit", year: "numeric" })
    .format(new Date(Date.UTC(p.y, p.m - 1, p.d, 12)))
    .replace(NARROW_SPACES, " ");
}

function localizePart(part, value, timeZone, tag) {
  if (part.time == null) return part;
  const time = new Intl.DateTimeFormat(tag, { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value)).replace(NARROW_SPACES, " ");
  return { time, shiftedDate: part.shiftedDate ? classDateIn(localDateInZone(value, timeZone), tag) : null };
}

function localizeRow(row, timeZone, tag) {
  return {
    ...row,
    classDateLabel: classDateIn(row.classDate, tag),
    start: localizePart(row.start, row.raw.startTime, timeZone, tag),
    end: localizePart(row.end, row.raw.endTime, timeZone, tag),
    joined: localizePart(row.joined, row.raw.joinedTime, timeZone, tag),
  };
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
  const { context, isHigh } = useDashboardContext();
  const isStudent = (context?.role || "student") === "student";
  const t = useTranslations("k5Attendance");
  const tc = useTranslations("common");
  const tl = useLabelTranslator("k5Attendance.absentLabels");
  const tag = useLocaleTag();
  const userId = context?.userId;
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId });
  // The student's configured timezone when it is valid, else Asia/Singapore (a valid one is never overwritten).
  const timeZone = resolveTimeZone(dummy.enabled ? DUMMY_STUDENT_TIMEZONE : dashboardData.userTimezone);
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
  const customError = isCustom ? (custom.days ? validateCustomRange(from, to, today, custom.days) : t("details.errors.unavailable")) : null;
  const bounds = custom.days ? customBounds(today, custom.days) : null;

  // Any filter change starts again from page 1 (the page belongs to the filters it was chosen under).
  const filtersKey = [dateFilter, from, to, status].join("|");
  const page = pageState.key === filtersKey ? pageState.page : 1;

  const query = useStudentAttendanceDetails({ userId, dateFilter, fromDate: from, toDate: to, status: apiStatus(status), page, enabled: !customError });
  const details = query.data;
  const rows = (details?.rows ?? []).map((row) => localizeRow(toDisplayRow(row, timeZone), timeZone, tag));
  const totalCount = Number(details?.totalCount) || 0;
  const pageSize = Number(details?.pageSize) || 10;
  const pages = Math.max(1, Math.ceil(totalCount / pageSize));
  const first = (page - 1) * pageSize;
  const sessionError = isSessionExpiredError(query.error);

  // The Custom range's message on screen: validateCustomRange answers in English, so its texts are looked up here.
  function customErrorText(message) {
    if (!message) return message;
    if (CUSTOM_ERRORS[message]) return t(`details.errors.${CUSTOM_ERRORS[message]}`);
    const lookBack = /^You can look back only (\d+) days\.$/.exec(message);
    return lookBack ? t("details.errors.lookBackOnly", { days: Number(lookBack[1]) }) : message;
  }

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
          <h2 id="k5-at-det" className="m-0 font-k5-display text-2xl font-semibold">{t("details.title")}</h2>
          <span className="text-[15px] font-extrabold text-k5-mut">{t("details.hint")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {status && (
            <span className="flex items-center gap-2 rounded-full py-1.5 pe-2 ps-3.5 text-[15px] font-black text-k5-ink" style={{ background: ATB[status] }}>
              {t(`status.${status}`)}
              <button type="button" onClick={() => onStatusChange("")} aria-label={t("details.showAll")} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-k5-card">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true" style={{ stroke: "var(--k5-ink)" }}><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </span>
          )}
          <span aria-live="polite" className="text-[15px] font-extrabold text-k5-mut">
            {totalCount ? tc("table.showingEntries", { from: first + 1, to: Math.min(totalCount, first + rows.length), total: totalCount }) : query.isLoading ? <K5Sk className="inline-block h-4 w-40 align-middle" /> : t("details.showingNone")}
          </span>
        </div>
      </div>

      <div className="k5h-r10 flex flex-wrap items-end gap-3 rounded-[20px] bg-k5-soft px-3.5 py-3">
        <label className={FIELD_LABEL}>
          {tc("table.date")}
          <select value={dateFilter} onChange={(e) => changeDateFilter(e.target.value)} className={SELECT}>
            {DATE_FILTERS.map((f) => (
              <option key={f.value} value={f.value} disabled={f.value === "CUSTOM" && !custom.isLoading && !custom.days}>
                {f.value === "CUSTOM" && !custom.isLoading && !custom.days
                  ? t("details.notAvailable", { label: t(`details.dateFilters.${f.value.toLowerCase()}`) })
                  : t(`details.dateFilters.${f.value.toLowerCase()}`)}
              </option>
            ))}
          </select>
        </label>
        <div className={`${FIELD_LABEL} k5h-at-date`}>
          {tc("dates.from")}
          <DatePicker
            icon={CalendarDays}
            value={ymdToPickerDate(from)}
            disabled={!isCustom}
            height={isHigh ? "h-[43px]" : "h-[50px]"}
            fromDate={ymdToPickerDate(bounds?.min || from)}
            toDate={ymdToPickerDate(today)}
            onChange={(date) => {
              const next = pickerDateToYmd(date);
              if (next) setCustomFrom(next);
            }}
          />
        </div>
        <div className={`${FIELD_LABEL} k5h-at-date`}>
          {tc("dates.to")}
          {/* To is always today: when Custom is on the picker opens, but today is the only day that can be chosen. */}
          <DatePicker icon={CalendarDays} value={ymdToPickerDate(to)} disabled={!isCustom} height={isHigh ? "h-[43px]" : "h-[50px]"} fromDate={ymdToPickerDate(today)} toDate={ymdToPickerDate(today)} onChange={() => {}} />
        </div>
        <label className={FIELD_LABEL}>
          {tc("table.status")}
          <select value={status || (allChosen ? "all" : "")} onChange={(e) => changeStatus(e.target.value)} className={SELECT}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>{t(`details.statusOptions.${s.key || "select"}`)}</option>
            ))}
          </select>
        </label>
      </div>
      {isCustom && (
        <p className="m-0 -mt-1 text-sm font-extrabold text-k5-mut">
          {customErrorText(customError) || t("details.lookBack", { days: custom.days })}
        </p>
      )}

      {query.isError && !sessionError ? (
        <div role="alert" className="flex flex-col items-center gap-2.5 rounded-[18px] border-[3px] border-k5-line px-4 py-6 text-center">
          <p className="m-0 font-k5-display text-lg font-semibold text-[#C81E35]">{query.error?.message || t("details.loadError")}</p>
          <button type="button" onClick={() => query.refetch()} className={PAGE_BUTTON}>{tc("actions.tryAgain")}</button>
        </div>
      ) : (
        <div className={`overflow-x-auto rounded-[18px] border-[3px] border-k5-line max-[760px]:overflow-visible max-[760px]:border-0 ${query.isFetching && details ? "opacity-70" : ""}`}>
          <div role="table" aria-label={t("details.title")} aria-busy={query.isFetching} className="min-w-[915px] text-[15px] font-extrabold max-[760px]:flex max-[760px]:min-w-0 max-[760px]:flex-col max-[760px]:gap-2.5">
            <div role="row" style={{ "--cols": GRID }} className="grid grid-cols-[var(--cols)] bg-k5-ac font-k5-display text-base font-semibold text-white max-[760px]:hidden">
              {COLUMNS.map((c) => (
                <span key={c} role="columnheader" className="p-3.5">{t(`details.columns.${c}`)}</span>
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
                  <span role="cell" data-l={t("details.columns.date")} className={`${CELL} max-[760px]:col-span-full`}>{r.classDateLabel}</span>
                  <span role="cell" data-l={t("details.columns.class")} className={`${CELL} max-[760px]:col-span-full`}>{r.className}</span>
                  <span role="cell" data-l={t("details.columns.startTime")} className={CELL}><Time part={r.start} /></span>
                  <span role="cell" data-l={t("details.columns.endTime")} className={CELL}><Time part={r.end} /></span>
                  <span role="cell" data-l={t("details.columns.joined")} className={`${CELL} leading-tight`}>
                    <span className="block"><Time part={r.joined} /></span>
                    <span className="block text-[13px]" style={{ color: note.color }}>{t(`details.joinedNotes.${note.text}`, { minutes: note.minutes ?? 0 })}</span>
                  </span>
                  <span role="cell" data-l={t("details.columns.status")} className={CELL}>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pe-3 ps-1 text-sm font-black text-k5-ink" style={{ background: ATB[kind.key] }}>
                      <span aria-hidden="true" className="h-5 w-5 flex-none rounded-full" style={{ background: AC[kind.key] }} />
                      {kind.backendLabel ? tl(kind.backendLabel) : t(`status.${kind.key}`)}
                    </span>
                  </span>
                </div>
              );
            })}
            {!rows.length &&
              (query.isLoading || (query.isFetching && !details) ? (
                <K5Loading label={t("details.loading")} className="">
                  <K5RowsSkeleton rows={5} cols={6} />
                </K5Loading>
              ) : (
                <div className="px-4 py-7 text-center font-k5-display text-[19px] font-semibold text-k5-mut">{customErrorText(customError) || t("details.empty")}</div>
              ))}
          </div>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label={t("details.pages")} className="flex items-center justify-end gap-2.5">
          <button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPageState({ key: filtersKey, page: page - 1 })} className={PAGE_BUTTON}>
            {tc("actions.previous")}
          </button>
          <span className="text-[15px] font-black">{page} / {pages}</span>
          <button type="button" disabled={page >= pages || query.isFetching} onClick={() => setPageState({ key: filtersKey, page: page + 1 })} className={PAGE_BUTTON}>
            {tc("actions.next")}
          </button>
        </nav>
      )}
    </section>
  );
}
