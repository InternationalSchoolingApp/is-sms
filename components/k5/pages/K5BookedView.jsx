"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isValid } from "date-fns";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { DatePicker } from "@/components/ui/date-picker";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useK5CourseColors } from "@/hooks/useK5CourseColors";
import { getStudentBookedClasses } from "@/services/bookClassApi";

const DATE_TYPES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Pick dates" },
];
const STATUSES = [
  { value: "", label: "All" },
  { value: "Booked", label: "Booked" },
  { value: "Completed", label: "Completed" },
  { value: "Reschedule Session", label: "Rescheduled" },
  { value: "Missed by Student", label: "Missed by you" },
];
// Count tiles. `status` = the backend status filter a tap applies (null = not a filter).
const TILES = [
  { key: "total", label: "Classes", status: "", color: "var(--k5-ac)" },
  { key: "booked", label: "Booked", status: "Booked", color: "#1f9d55" },
  { key: "left", label: "Left", status: null, color: "#2f80ed" },
  { key: "expired", label: "Expired", status: null, color: "#8a8fa3" },
  { key: "missedByYou", label: "Missed by you", status: "Missed by Student", color: "#e5243b" },
  { key: "rescheduled", label: "Rescheduled", status: "Reschedule Session", color: "#f08a24" },
  { key: "completed", label: "Completed", status: "Completed", color: "#7c4dff" },
  { key: "missedByTeacher", label: "Missed by teacher", status: null, color: "#d6336c" },
];
const STATUS_PILL = {
  "Reschedule Session": { label: "Rescheduled", bg: "#f08a24", fg: "#fff" },
  "Missed by Student": { label: "Missed by you", bg: "#e5243b", fg: "#fff" },
  "Missed by Teacher": { label: "Missed by teacher", bg: "#d6336c", fg: "#fff" },
  Completed: { label: "Completed", bg: "#7c4dff", fg: "#fff" },
  Cancelled: { label: "Cancelled", bg: "#6b7280", fg: "#fff" },
  Booked: { label: "Booked", bg: "#1f9d55", fg: "#fff" },
};
const COLUMNS = [
  { key: "no", label: "No.", sortable: false },
  { key: "date", label: "Date and time", sortable: true },
  { key: "course", label: "Course", sortable: true },
  { key: "teacher", label: "Teacher", sortable: true },
  { key: "booked", label: "Booked on", sortable: true },
  { key: "type", label: "Type", sortable: true },
  { key: "status", label: "Status", sortable: true },
];
const GRID = "56px minmax(190px,1.6fr) minmax(130px,1.1fr) minmax(130px,1.1fr) minmax(110px,1fr) minmax(90px,.8fr) minmax(130px,1fr)";
const DEFAULT_FILTER = { dateType: "today", startDate: null, endDate: null, classStatus: "" };
const SELECT =
  "min-h-12 w-full rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3 text-base font-bold text-k5-ink";

const toBackendDate = (date) => (date && isValid(date) ? format(date, "MMM dd, yyyy") : "");
const niceTime = (value) => String(value || "").replace(/^0/, "");
const initialsOf = (name) =>
  String(name || "?")
    .replace(/^(mr|ms|mrs|dr)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

// A class with no result yet (empty or "N/A"): coming up = "Booked" (kids should not see "N/A"); one that is over keeps "N/A".
function pillFor(row) {
  const known = STATUS_PILL[row.meetingResult];
  if (known) return known;
  // The backend sends the text "N/A" for a class that has not been held yet.
  if (row.meetingResult && row.meetingResult !== "N/A") return null;
  const day = Date.parse(row.meetingJoinDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return !Number.isNaN(day) && day >= today.getTime() ? STATUS_PILL.Booked : null;
}

function sortValue(row, key) {
  switch (key) {
    case "date": {
      const t = Date.parse(`${row.meetingJoinDate} ${row.startTime}`);
      return Number.isNaN(t) ? String(row.meetingJoinDate || "") : t;
    }
    case "course": return String(row.subjectName || "").toLowerCase();
    case "teacher": return String(row.name || "").toLowerCase();
    case "booked": {
      const t = Date.parse(row.bookedDate);
      return Number.isNaN(t) ? String(row.bookedDate || "") : t;
    }
    case "type": return String(row.classTypeExtraOrComp || "").toLowerCase();
    case "status": return String(row.meetingResult || "").toLowerCase();
    default: return 0;
  }
}

/** K–5 "Booked Class Details" — same data and filters as the legacy page, shown in the Playful layout. */
export function K5BookedView({ course, onBack, onBook }) {
  const colorFor = useK5CourseColors();
  const [draft, setDraft] = useState(DEFAULT_FILTER);
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [perPage, setPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "date", dir: "desc" });

  const dummy = useDummyStudent();
  const { data, isLoading } = useQuery({
    queryKey: ["booked-classes", course.subjectId, course.studentStandardId, filter, dummy.key],
    queryFn: () =>
      dummy.enabled
        ? dummy.student.bookedClasses(course.subjectId)
        : getStudentBookedClasses({
            subjectId: course.subjectId,
            studentStandardId: course.studentStandardId,
            dateType: filter.dateType,
            startDate: filter.dateType === "custom" ? toBackendDate(filter.startDate) : "",
            endDate: filter.dateType === "custom" ? toBackendDate(filter.endDate) : "",
            classStatus: filter.classStatus,
          }),
    staleTime: 0,
  });
  const counts = data?.subjectCountDatials;
  const rows = useMemo(() => data?.meetingDetails ?? [], [data]);
  const isCustom = draft.dateType === "custom";
  const dirty = JSON.stringify(filter) !== JSON.stringify(DEFAULT_FILTER) || JSON.stringify(draft) !== JSON.stringify(DEFAULT_FILTER);
  const teacherName = rows[0]?.name || course.teacherName;

  const sorted = useMemo(() => {
    const list = [...rows];
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      return x < y ? -dir : x > y ? dir : 0;
    });
    return list;
  }, [rows, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;
  const visible = sorted.slice(start, start + perPage);

  function apply(next) {
    setDraft(next);
    setFilter(next);
    setPage(1);
  }
  function reset() {
    apply(DEFAULT_FILTER);
  }
  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  }

  const canBook = course.subjectId !== 0;
  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - current) <= 1,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
        <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-ot" aria-hidden="true">
          <CalendarDays className="h-11 w-11 text-k5-ink" />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">My booked classes</h1>
          <p className="m-0 text-lg font-extrabold text-k5-mut">{course.name}</p>
          {teacherName && (
            <span className="mt-1 flex items-center gap-2.5 self-start rounded-full bg-k5-vt py-1 pl-1 pr-3.5">
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-k5-vi font-k5-display text-[15px] font-semibold text-white">{initialsOf(teacherName)}</span>
              <span className="flex flex-col leading-[1.15]">
                <span className="text-xs font-black text-[var(--k5-vX)]">Your teacher</span>
                <span className="font-k5-display text-[17px] font-semibold">{teacherName}</span>
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={onBack} className="flex min-h-[52px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-k5-line bg-k5-card px-[18px] font-k5-display text-[17px] font-semibold text-k5-ink shadow-[0_4px_0_var(--k5-line)]">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back
          </button>
          {canBook && (
            <button type="button" onClick={onBook} className="min-h-[52px] cursor-pointer whitespace-nowrap rounded-full border-none bg-k5-ac px-5 font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)]">
              Book a Class ({course.weekLeftClass ?? 0})
            </button>
          )}
        </div>
      </div>

      {counts && (
        <section aria-labelledby="k5-bd-hint" className="flex flex-col gap-2.5">
          <p id="k5-bd-hint" className="m-0 text-base font-extrabold text-k5-mut">Tap a box to see only those classes.</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5 max-[760px]:grid-cols-2">
            {TILES.map((tile) => {
              const tappable = tile.status !== null;
              const on = tappable && filter.classStatus === tile.status;
              return (
                <button
                  key={tile.key}
                  type="button"
                  disabled={!tappable}
                  aria-pressed={tappable ? on : undefined}
                  onClick={() => apply({ ...filter, classStatus: tile.status })}
                  style={{ borderColor: tile.color, boxShadow: `0 ${on ? 2 : 4}px 0 ${tile.color}`, transform: on ? "translateY(2px)" : undefined }}
                  className={`flex items-center gap-2.5 rounded-2xl border-[3px] bg-k5-card py-2 pl-3 pr-2.5 text-left text-k5-ink ${tappable ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span style={{ background: tile.color }} className="flex h-11 min-w-11 flex-none items-center justify-center rounded-full px-2 font-k5-display text-xl font-semibold text-white">
                    {counts[tile.key] ?? 0}
                  </span>
                  <span className="text-[15px] font-extrabold leading-tight">{tile.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className={`${K5_CARD} flex flex-wrap items-end gap-3 px-[18px] py-3.5`}>
        <label className="flex min-w-[150px] flex-[1_1_150px] flex-col gap-1 text-[13px] font-black text-k5-mut">
          When
          <select value={draft.dateType} onChange={(e) => apply({ ...draft, dateType: e.target.value, startDate: null, endDate: null })} className={SELECT}>
            {DATE_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>
        <div className="min-w-[150px] flex-[1_1_150px]">
          <DatePicker icon={CalendarDays} label="From" value={draft.startDate} disabled={!isCustom} onChange={(date) => setDraft({ ...draft, startDate: date ?? null, endDate: null })} height="h-12" />
        </div>
        <div className="min-w-[150px] flex-[1_1_150px]">
          <DatePicker icon={CalendarDays} label="To" value={draft.endDate} fromDate={draft.startDate ?? undefined} disabled={!isCustom} onChange={(date) => setDraft({ ...draft, endDate: date ?? null })} height="h-12" />
        </div>
        <label className="flex min-w-[150px] flex-[1_1_150px] flex-col gap-1 text-[13px] font-black text-k5-mut">
          Status
          <select value={draft.classStatus} onChange={(e) => apply({ ...draft, classStatus: e.target.value })} className={SELECT}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        {isCustom && (
          <button type="button" onClick={() => { setFilter(draft); setPage(1); }} className="min-h-12 cursor-pointer rounded-full border-none bg-k5-ac px-5 font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)]">
            Search
          </button>
        )}
        {dirty && (
          <button type="button" onClick={reset} className="min-h-12 cursor-pointer rounded-full border-none bg-[#E5243B] px-5 font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_#A81226]">
            Reset
          </button>
        )}
      </div>

      <div className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <label className="flex items-center gap-2 text-base font-extrabold">
            Show
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="min-h-[42px] rounded-xl border-[3px] border-k5-line bg-k5-card px-2.5 text-base font-black text-k5-ink"
            >
              {[5, 10, 25].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            classes
          </label>
          <span aria-live="polite" className="text-[15px] font-extrabold text-k5-mut">
            {sorted.length === 0 ? "No classes" : `Showing ${start + 1}–${Math.min(start + perPage, sorted.length)} of ${sorted.length}`}
          </span>
        </div>

        <div className="overflow-x-auto rounded-[18px] border-[3px] border-k5-line max-[760px]:overflow-visible max-[760px]:border-0">
          <div role="table" aria-label="My booked classes" className="min-w-[900px] text-[15px] font-extrabold max-[760px]:flex max-[760px]:min-w-0 max-[760px]:flex-col max-[760px]:gap-2.5">
            <div role="row" style={{ "--cols": GRID }} className="grid grid-cols-[var(--cols)] bg-k5-ac max-[760px]:hidden">
              {COLUMNS.map((c) => (
                <span key={c.key} role="columnheader" aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="flex px-1 py-1">
                  {c.sortable ? (
                    <button type="button" onClick={() => toggleSort(c.key)} className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-1.5 rounded-xl border-none bg-transparent px-2.5 text-left font-k5-display text-base font-semibold text-white">
                      {c.label}
                      {sort.key === c.key ? (sort.dir === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronDown className="h-4 w-4 opacity-40" />}
                    </button>
                  ) : (
                    <span className="flex min-h-12 items-center px-2.5 font-k5-display text-base font-semibold text-white">{c.label}</span>
                  )}
                </span>
              ))}
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-k5-mut">Loading…</div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <span className="font-k5-display text-xl font-semibold">No classes found</span>
                {dirty && (
                  <button type="button" onClick={reset} className="min-h-12 cursor-pointer rounded-full border-none bg-k5-ac px-5 font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)]">
                    Show all
                  </button>
                )}
              </div>
            ) : (
              visible.map((row, i) => {
                const pill = pillFor(row);
                const color = colorFor({ id: row.subjectId, name: row.subjectName });
                return (
                  <div key={`${row.meetingJoinDate}-${row.startTime}-${start + i}`} role="row" style={{ "--cols": GRID }} className={`grid grid-cols-[var(--cols)] items-center border-t-2 border-k5-line max-[760px]:grid-cols-2 max-[760px]:overflow-hidden max-[760px]:rounded-[18px] max-[760px]:border-[3px] max-[760px]:py-1.5 ${i % 2 ? "bg-k5-soft" : "bg-k5-card"}`}>
                    <span role="cell" className="px-3.5 py-2.5 max-[760px]:order-1 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:font-k5-display max-[760px]:text-lg max-[760px]:font-semibold">{start + i + 1}</span>
                    <span role="cell" data-l="Date and time" className="px-3.5 py-2.5 leading-snug max-[760px]:col-span-full max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:[overflow-wrap:anywhere] max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]">
                      <span className="block font-black">{row.meetingJoinDate}</span>
                      <span className="block text-[13px] text-k5-mut">{niceTime(row.startTime)} - {niceTime(row.endTime)} | {row.timezone}</span>
                    </span>
                    <span role="cell" data-l="Course" className="px-3.5 py-2.5 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:[overflow-wrap:anywhere] max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]">
                      <span aria-hidden="true" style={{ background: color || "var(--k5-ac)" }} className="mr-2 inline-block h-3 w-3 rounded-full align-[-1px]" />
                      {row.subjectName}
                    </span>
                    <span role="cell" data-l="Teacher" className="px-3.5 py-2.5 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:[overflow-wrap:anywhere] max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]">{row.name}</span>
                    <span role="cell" data-l="Booked on" className="px-3.5 py-2.5 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:[overflow-wrap:anywhere] max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]">{row.bookedDate}</span>
                    <span role="cell" data-l="Type" className="px-3.5 py-2.5 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:[overflow-wrap:anywhere] max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]">{row.classTypeExtraOrComp}</span>
                    <span role="cell" className="px-3.5 py-2.5 max-[760px]:order-1 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:text-end">
                      <span
                        style={{ background: pill?.bg || "var(--k5-soft)", color: pill?.fg || "var(--k5-ink)" }}
                        className="inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-black"
                      >
                        {pill?.label || row.meetingResult || "N/A"}
                      </span>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {pages > 1 && (
          <nav aria-label="Pages" className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="min-h-11 cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-40">
              Previous
            </button>
            {pageNumbers.map((n, idx) => (
              <span key={n} className="flex items-center gap-2">
                {idx > 0 && n - pageNumbers[idx - 1] > 1 && <span className="text-k5-mut">…</span>}
                <button
                  type="button"
                  aria-current={n === current ? "page" : undefined}
                  onClick={() => setPage(n)}
                  className={`h-11 min-w-11 cursor-pointer rounded-[14px] border-[3px] px-1.5 font-k5-display text-[17px] font-semibold ${n === current ? "border-k5-ac bg-k5-ac text-white" : "border-k5-line bg-k5-card text-k5-ink"}`}
                >
                  {n}
                </button>
              </span>
            ))}
            <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="min-h-11 cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-40">
              Next
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
