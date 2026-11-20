"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { format, isValid } from "date-fns";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Search } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { getStudentBookedClasses } from "@/services/bookClassApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useLabelTranslator } from "@/i18n/labels";
import { BOOKED_CLASS_STATUS_STYLES, bookedClassDateRange } from "@/utils/bookClass";
import { MobileTableCard } from "@/components/student/MobileTableCard";
import { TableFooter } from "@/components/student/TableFooter";
import { K5BookedView } from "@/components/k5/pages/K5BookedView";

// `label` is the bookClass.booked.* message key (translated where rendered).
const DATE_TYPES = [
  { value: "today", label: "dateToday" },
  { value: "yesterday", label: "dateYesterday" },
  { value: "week", label: "dateWeek" },
  { value: "month", label: "dateMonth" },
  { value: "custom", label: "dateCustom" },
];
const STATUSES = [
  { value: "", label: "selectStatus" },
  { value: "Booked", label: "statusBooked" },
  { value: "Completed", label: "statusCompleted" },
  { value: "Reschedule Session", label: "statusReschedule" },
  { value: "Missed by Student", label: "statusMissedByYou" },
];
// [count field, bookClass.booked.counts.* message key]
const COUNTS = [
  ["total", "total"],
  ["booked", "booked"],
  ["left", "left"],
  ["expired", "expired"],
  ["missedByYou", "missedByYou"],
  ["rescheduled", "rescheduled"],
  ["completed", "completed"],
  ["missedByTeacher", "missedByTeacher"],
];
// Class names that change in the K-5 look; everything else is shared.
const LOOK = {
  legacy: {
    title: "text-lg font-extrabold text-black sm:text-xl",
    back: "flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white",
    filters: "flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4",
    select: "rounded-lg border border-slate-300 px-3 py-2 text-sm text-black",
    reset: "rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white",
    search: "rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white",
    book: "ml-auto rounded-lg px-4 py-2 text-sm font-bold text-white",
    bookOn: "bg-primary",
    bookOff: "bg-black",
    count: "flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2",
    countNum: "text-lg font-extrabold text-primary",
    tableWrap: "mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white",
    thead: "bg-primary text-white",
  },
  k5: {
    title: "m-0 font-k5-display text-3xl font-semibold leading-tight",
    back: "flex min-h-12 cursor-pointer items-center gap-1 rounded-full border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-lg font-semibold text-k5-ink",
    filters: "flex flex-wrap items-end gap-2.5 rounded-[26px] border-[3px] border-k5-line bg-k5-card p-4 shadow-k5-chunky",
    select: "min-h-12 rounded-full border-[3px] border-k5-line bg-k5-card px-4 text-base font-bold text-k5-ink",
    reset: "min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-5 text-base font-black text-k5-ink",
    search: "min-h-12 cursor-pointer rounded-full border-none bg-k5-ac px-5 text-base font-black text-white shadow-[0_4px_0_var(--k5-acd)]",
    book: "ml-auto min-h-12 cursor-pointer rounded-full border-none px-5 text-base font-black text-white",
    bookOn: "bg-k5-grn shadow-[0_4px_0_var(--k5-grnD)]",
    bookOff: "bg-k5-mut",
    count: "flex items-center gap-2 rounded-[18px] border-[3px] border-k5-line bg-k5-card px-3 py-2",
    countNum: "font-k5-display text-2xl font-semibold text-k5-acx",
    tableWrap: "mt-3 overflow-x-auto rounded-[26px] border-[3px] border-k5-line bg-k5-card shadow-k5-chunky",
    thead: "bg-k5-ac text-white",
  },
};

// The table's columns (legacy DataTable): header, how a row sorts and what the search looks at.
// `id` is the bookClass.booked.columns.* message key of the header.
const PAGE_SIZE = 10;
const COLUMNS = [
  { id: "sNo", header: "S. No." },
  { id: "timing", header: "Class Timing | Time zone", value: (r) => `${r.meetingJoinDate} | ${r.startTime} - ${r.endTime} | ${r.timezone}`, sort: (r) => Date.parse(`${r.meetingJoinDate} ${r.startTime}`) },
  { id: "courseName", header: "Course Name", value: (r) => r.subjectName },
  { id: "teacherName", header: "Teacher Name", value: (r) => r.name },
  { id: "bookedDate", header: "Booked Date", value: (r) => r.bookedDate, sort: (r) => Date.parse(r.bookedDate) },
  { id: "classType", header: "Class Type", value: (r) => r.classTypeExtraOrComp },
  { id: "classStatus", header: "Class Status", value: (r) => BOOKED_CLASS_STATUS_STYLES[r.meetingResult]?.label || "N/A" },
];

function compareRows(a, b, column) {
  const keyA = column.sort ? column.sort(a) : column.value(a);
  const keyB = column.sort ? column.sort(b) : column.value(b);
  if (typeof keyA === "number" && typeof keyB === "number" && !Number.isNaN(keyA) && !Number.isNaN(keyB)) return keyA - keyB;
  return String(column.value(a) ?? "").localeCompare(String(column.value(b) ?? ""), undefined, { numeric: true, sensitivity: "base" });
}

const DEFAULT_FILTER = { dateType: "week", startDate: null, endDate: null, classStatus: "" };

// The DatePicker gives a Date; the backend expects "MMM dd, yyyy".
function toBackendDate(date) {
  return date && isValid(date) ? format(date, "MMM dd, yyyy") : "";
}

/** Booked-classes history for one course — legacy bookedCalssCotentFun / bookClassFilterFormContent. */
export function BookedClasses(props) {
  const { isK5 } = useDashboardContext();
  return isK5 ? <K5BookedView {...props} /> : <LegacyBookedClasses {...props} />;
}

function LegacyBookedClasses({ course, onBack, onBook }) {
  const isK5 = false;
  const look = LOOK.legacy;
  const t = useTranslations("bookClass.booked");
  const tb = useTranslations("bookClass");
  const tc = useTranslations("common");
  const tl = useLabelTranslator("bookClass.labels");
  const [draft, setDraft] = useState(DEFAULT_FILTER);
  const [filter, setFilter] = useState(DEFAULT_FILTER);

  const dummy = useDummyStudent();
  const { data, isLoading } = useQuery({
    queryKey: ["booked-classes", course.subjectId, course.studentStandardId, filter, dummy.key],
    // Dummy mode: legacy getDummyStudentBookedClassesDetailsResponse (the filters don't narrow it, as in legacy).
    queryFn: () =>
      dummy.enabled
        ? dummy.student.bookedClasses(course.subjectId)
        : (() => {
            const [from, to] = bookedClassDateRange(filter.dateType, filter.startDate, filter.endDate);
            return getStudentBookedClasses({
              subjectId: course.subjectId,
              studentStandardId: course.studentStandardId,
              dateType: filter.dateType,
              startDate: toBackendDate(from),
              endDate: toBackendDate(to),
              classStatus: filter.classStatus,
            });
          })(),
    staleTime: 0,
  });
  const counts = data?.subjectCountDatials;
  const allRows = useMemo(() => data?.meetingDetails ?? [], [data]);
  const isCustom = draft.dateType === "custom";
  const [shownFrom, shownTo] = bookedClassDateRange(draft.dateType, draft.startDate, draft.endDate);

  // Legacy DataTable: search over the shown text, click a header to sort, 10 rows a page.
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ column: -1, descending: false });
  const [page, setPage] = useState(0);
  const matching = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const found = needle ? allRows.filter((row) => COLUMNS.slice(1).some((c) => String(c.value(row) ?? "").toLowerCase().includes(needle))) : allRows;
    if (sort.column < 1) return found;
    const column = COLUMNS[sort.column];
    return [...found].sort((a, b) => (sort.descending ? -1 : 1) * compareRows(a, b, column));
  }, [allRows, search, sort]);
  const rows = matching.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const offset = page * PAGE_SIZE;
  const sortBy = (column) => {
    setSort((old) => (old.column === column ? { column, descending: !old.descending } : { column, descending: false }));
    setPage(0);
  };

  return (
    <div className="mx-auto w-full">
      <div className="flex items-center justify-between gap-2 px-1 pb-4">
        <h1 className={look.title}>{t(isK5 ? "titleK5" : "title", { course: tl(course.name) ?? "" })}</h1>
        <button type="button" onClick={onBack} className={look.back}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {tc("actions.back")}
        </button>
      </div>

      <div className={look.filters}>
        <select
          value={draft.dateType}
          onChange={(e) => setDraft({ ...draft, dateType: e.target.value })}
          className={look.select}
        >
          {DATE_TYPES.map((d) => (
            <option key={d.value} value={d.value}>{t(d.label)}</option>
          ))}
        </select>
        <div className="w-full sm:w-44">
          <DatePicker
            icon={CalendarDays}
            label={tc("dates.startDate")}
            value={shownFrom}
            disabled={!isCustom}
            onChange={(date) => setDraft({ ...draft, startDate: date ?? null, endDate: null })}
            height="h-10"
          />
        </div>
        <div className="w-full sm:w-44">
          <DatePicker
            icon={CalendarDays}
            label={tc("dates.endDate")}
            value={shownTo}
            fromDate={draft.startDate ?? undefined}
            disabled={!isCustom}
            onChange={(date) => setDraft({ ...draft, endDate: date ?? null })}
            height="h-10"
          />
        </div>
        <select
          value={draft.classStatus}
          onChange={(e) => setDraft({ ...draft, classStatus: e.target.value })}
          className={look.select}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{t(s.label)}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setDraft(DEFAULT_FILTER);
            setFilter(DEFAULT_FILTER);
            setPage(0);
          }}
          className={look.reset}
        >
          {tc("actions.reset")}
        </button>
        <button type="button" onClick={() => {
            setFilter(draft);
            setPage(0);
          }}
          className={look.search}>
          {tc("actions.search")}
        </button>
        <button
          type="button"
          onClick={onBook}
          className={`${look.book} ${course.weekLeftClass > 0 ? look.bookOn : look.bookOff}`}
        >
          {tb("bookCount", { count: course.weekLeftClass ?? "" })}
        </button>
      </div>

      {counts && (
        <div className="mt-3 flex flex-wrap gap-2">
          {COUNTS.map(([key, label]) => (
            <div key={key} className={look.count}>
              <div className="text-xs leading-tight">
                <div className="font-bold text-black">{t("totalNumberOf")}</div>
                <div className="text-black/70">{t(`counts.${label}`)}</div>
              </div>
              <div className={look.countNum}>{counts[key] ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <label className="relative block w-full max-w-[260px]">
          <span className="sr-only">{t("searchLabel")}</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm text-black"
          />
        </label>
      </div>

      {/* Mobile: one card per booked class (column title beside each value) instead of a 900px table. */}
      <div className="mt-3 md:hidden">
        {isLoading || rows.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white py-6 text-center text-sm font-bold text-black/60">{isLoading ? tc("status.loading") : tc("status.noRecords")}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row, index) => {
              const status = BOOKED_CLASS_STATUS_STYLES[row.meetingResult];
              return (
                <li key={`${row.meetingJoinDate}-${row.startTime}-${index}`}>
                  <MobileTableCard
                    labelClassName={look.thead}
                    rows={[
                      { label: t("columns.sNo"), value: offset + index + 1 },
                      { label: t("columns.timing"), value: `${row.meetingJoinDate} | ${row.startTime} - ${row.endTime} | ${row.timezone}` },
                      { label: t("columns.courseName"), value: row.subjectName },
                      { label: t("columns.teacherName"), value: row.name },
                      { label: t("columns.bookedDate"), value: row.bookedDate },
                      { label: t("columns.classType"), value: tl(row.classTypeExtraOrComp) },
                      {
                        label: t("columns.classStatus"),
                        value: status ? <span className={`rounded px-2 py-0.5 font-bold ${status.className}`}>{tl(status.label)}</span> : <span className="font-bold">{tc("status.na")}</span>,
                      },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={`${look.tableWrap} hidden md:block`}>
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className={look.thead}>
            <tr>
              {COLUMNS.map((column, index) => (
                <th key={column.id} aria-sort={sort.column === index ? (sort.descending ? "descending" : "ascending") : undefined} className="px-3 py-2 font-normal">
                  {index === 0 ? (
                    t(`columns.${column.id}`)
                  ) : (
                    <button type="button" onClick={() => sortBy(index)} className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 font-normal text-inherit">
                      {t(`columns.${column.id}`)}
                      {sort.column === index && (sort.descending ? <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />)}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="py-6 text-center text-black/60">{tc("status.loading")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center font-bold text-black">{tc("status.noRecords")}</td></tr>
            ) : (
              rows.map((row, index) => {
                const status = BOOKED_CLASS_STATUS_STYLES[row.meetingResult];
                return (
                  <tr key={`${row.meetingJoinDate}-${row.startTime}-${index}`} className="border-b border-slate-100">
                    <td className="px-3 py-2">{offset + index + 1}</td>
                    <td className="px-3 py-2">{row.meetingJoinDate} | {row.startTime} - {row.endTime} | {row.timezone}</td>
                    <td className="px-3 py-2">{row.subjectName}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.bookedDate}</td>
                    <td className="px-3 py-2">{tl(row.classTypeExtraOrComp)}</td>
                    <td className="px-3 py-2">
                      {status ? (
                        <span className={`rounded px-2 py-0.5 font-bold ${status.className}`}>{tl(status.label)}</span>
                      ) : (
                        <span className="font-bold">{tc("status.na")}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && matching.length > 0 && <TableFooter page={page} pageSize={PAGE_SIZE} total={matching.length} onPageChange={setPage} />}
    </div>
  );
}
