"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isValid, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { getStudentBookedClasses } from "@/services/bookClassApi";
import { BOOKED_CLASS_STATUS_STYLES } from "@/utils/bookClass";

const DATE_TYPES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "custom", label: "Custom" },
];
const STATUSES = [
  { value: "", label: "Select Status" },
  { value: "Booked", label: "Booked" },
  { value: "Completed", label: "Completed" },
  { value: "Reschedule Session", label: "Reschedule Session" },
  { value: "Missed by Student", label: "Missed by you" },
];
const COUNTS = [
  ["total", "Classes"],
  ["booked", "Classes Booked"],
  ["left", "Classes Left"],
  ["expired", "Classes Expired"],
  ["missedByYou", "Classes Missed by You"],
  ["rescheduled", "Classes Rescheduled"],
  ["completed", "Classes Completed"],
  ["missedByTeacher", "Classes Missed by Teacher"],
];
const DEFAULT_FILTER = { dateType: "today", startDate: "", endDate: "", classStatus: "" };

// <input type="date"> gives yyyy-MM-dd; the backend expects "MMM dd, yyyy".
function toBackendDate(value) {
  const date = parseISO(value);
  return value && isValid(date) ? format(date, "MMM dd, yyyy") : "";
}

/** Booked-classes history for one course — legacy bookedCalssCotentFun / bookClassFilterFormContent. */
export function BookedClasses({ course, onBack, onBook }) {
  const [draft, setDraft] = useState(DEFAULT_FILTER);
  const [filter, setFilter] = useState(DEFAULT_FILTER);

  const { data, isLoading } = useQuery({
    queryKey: ["booked-classes", course.subjectId, course.studentStandardId, filter],
    queryFn: () =>
      getStudentBookedClasses({
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
  const rows = data?.meetingDetails ?? [];
  const isCustom = draft.dateType === "custom";

  return (
    <div className="mx-auto w-full">
      <div className="flex items-center justify-between gap-2 px-1 pb-4">
        <h1 className="text-lg font-extrabold text-black sm:text-xl">Booked Classes — {course.name}</h1>
        <button type="button" onClick={onBack} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4">
        <select
          value={draft.dateType}
          onChange={(e) => setDraft({ ...draft, dateType: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
        >
          {DATE_TYPES.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={draft.startDate}
          disabled={!isCustom}
          onChange={(e) => setDraft({ ...draft, startDate: e.target.value, endDate: "" })}
          aria-label="Start date"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black disabled:bg-slate-100"
        />
        <input
          type="date"
          value={draft.endDate}
          min={draft.startDate || undefined}
          disabled={!isCustom}
          onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
          aria-label="End date"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black disabled:bg-slate-100"
        />
        <select
          value={draft.classStatus}
          onChange={(e) => setDraft({ ...draft, classStatus: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-black"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setDraft(DEFAULT_FILTER);
            setFilter(DEFAULT_FILTER);
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
        >
          Reset
        </button>
        <button type="button" onClick={() => setFilter(draft)} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white">
          Search
        </button>
        {course.subjectId !== 0 && (
          <button
            type="button"
            onClick={onBook}
            className={`ml-auto rounded-lg px-4 py-2 text-sm font-bold text-white ${course.weekLeftClass > 0 ? "bg-primary" : "bg-black"}`}
          >
            Book a Class ({course.weekLeftClass})
          </button>
        )}
      </div>

      {counts && (
        <div className="mt-3 flex flex-wrap gap-2">
          {COUNTS.map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs leading-tight">
                <div className="font-bold text-black">Total number of</div>
                <div className="text-black/70">{label}</div>
              </div>
              <div className="text-lg font-extrabold text-primary">{counts[key] ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-primary text-white">
            <tr>
              {["S. No.", "Class Timing | Time zone", "Course Name", "Teacher Name", "Booked Date", "Class Type", "Class Status"].map((h) => (
                <th key={h} className="px-3 py-2 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="py-6 text-center text-black/60">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center font-bold text-black">No records found</td></tr>
            ) : (
              rows.map((row, index) => {
                const status = BOOKED_CLASS_STATUS_STYLES[row.meetingResult];
                return (
                  <tr key={`${row.meetingJoinDate}-${row.startTime}-${index}`} className="border-b border-slate-100">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{row.meetingJoinDate} | {row.startTime} - {row.endTime} | {row.timezone}</td>
                    <td className="px-3 py-2">{row.subjectName}</td>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.bookedDate}</td>
                    <td className="px-3 py-2">{row.classTypeExtraOrComp}</td>
                    <td className="px-3 py-2">
                      {status ? (
                        <span className={`rounded px-2 py-0.5 font-bold ${status.className}`}>{status.label}</span>
                      ) : (
                        <span className="font-bold">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
