"use client";

import { useState } from "react";
import { CalendarDays, Eye } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ParentMobileTableCard } from "@/components/parent/common/ParentMobileTableCard";
import { ParentTableFooter } from "@/components/parent/common/ParentTableFooter";
import { ParentProgressReportView } from "@/components/parent/progress/ParentProgressReportView";
import { useParentProgressReports } from "@/hooks/parent/useParentProgressReports";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { addDaysYmd, monthStartYmd, pickerDateToYmd, resolveTimeZone, todayYmd, weekStartYmd } from "@/utils/attendanceDates";
import { dateRange, monthEndYmd, normalizeUrl, reportType } from "@/components/parent/progress/reportPayload";

const PAGE_SIZE = 10;
const HEADERS = ["S. No.", "Report Type", "Report Frequency", "Report Published Date", "View"];

/**
 * Parent > Progress — legacy parentProgressContent.js / parentProgress.js: the selected child's "Progress Report"
 * table (S. No., Report Type, Report Frequency, Report Published Date, View) with the Monthly / Weekly / Custom
 * filter. View swaps the table for the gradebook report with a Back button, as legacy swaps the page content.
 * "This month" and "this week" are the child's, in the child's timezone (Asia/Singapore when none is set).
 */
export function ParentProgressReports() {
  const { selectedChild } = useSelectedChild();
  return (
    <ParentChildRequired>
      {/* Keyed by child: another child starts with no filter, page 1 and no open report. */}
      <ProgressForChild key={selectedChild?.userId} />
    </ParentChildRequired>
  );
}

function ProgressForChild() {
  const { selectedChild } = useSelectedChild();
  const timeZone = resolveTimeZone(selectedChild?.studentTimezone);
  const [mode, setMode] = useState(null); // null | "month" | "week" | "custom"
  const [range, setRange] = useState(null); // the applied { startDate, endDate }
  const [customStart, setCustomStart] = useState(undefined);
  const [customEnd, setCustomEnd] = useState(undefined);
  const [customError, setCustomError] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null); // { url, range }
  const { isLoading, failed, sessionOut, reports, retry } = useParentProgressReports(range);

  const apply = (next, nextMode) => {
    setMode(nextMode);
    setRange(next);
    setPage(0);
  };
  const pickPreset = (nextMode) => {
    setCustomError("");
    const today = todayYmd(timeZone);
    if (nextMode === "month") apply({ startDate: monthStartYmd(today), endDate: monthEndYmd(today) }, "month");
    else apply({ startDate: weekStartYmd(today), endDate: addDaysYmd(weekStartYmd(today), 6) }, "week");
  };
  const searchCustom = () => {
    const startDate = pickerDateToYmd(customStart);
    const endDate = pickerDateToYmd(customEnd);
    // Legacy: nothing happens until both dates are chosen; the check below only explains an impossible range.
    if (!startDate || !endDate) return setCustomError("Please select the start date and the end date.");
    if (startDate > endDate) return setCustomError("The start date must not be after the end date.");
    setCustomError("");
    apply({ startDate, endDate }, "custom");
  };

  if (selected) {
    return <ParentProgressReportView url={selected.url} range={selected.range} onBack={() => setSelected(null)} />;
  }

  const pageRows = reports.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((report, index) => {
    const frequency = dateRange(report.reportStartDate, report.reportEndDate);
    return {
      key: report.weeklyReportId || `${frequency}-${page}-${index}`,
      serial: page * PAGE_SIZE + index + 1,
      type: reportType(report.daysType),
      frequency,
      published: report.createdDate || "N/A",
      url: normalizeUrl(report.playloadUrl),
    };
  });
  const status = isLoading
    ? "Loading…"
    : sessionOut
      ? "Your session has ended. Please sign in again."
      : failed
        ? "The progress reports could not be loaded."
        : reports.length === 0
          ? "No progress report found"
          : null;
  const retryable = failed && !sessionOut ? retry : null;

  const viewButton = (row) => (
    <button
      type="button"
      onClick={() => setSelected({ url: row.url, range })}
      disabled={!row.url}
      className="flex shrink-0 items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-white disabled:opacity-60"
    >
      View
      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
  const presetClass = (active, edge) =>
    `px-4 py-1.5 text-sm ${edge} ${active ? "bg-primary text-white" : "bg-slate-100 text-black hover:bg-slate-200"}`;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="rounded-[10px] border border-slate-200 bg-white py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5">
          <h1 className="text-lg font-bold text-black sm:text-xl">Progress Report</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-full border border-slate-200" role="group" aria-label="Report period">
              <button type="button" aria-pressed={mode === "month"} onClick={() => pickPreset("month")} className={presetClass(mode === "month", "")}>
                Monthly
              </button>
              <button type="button" aria-pressed={mode === "week"} onClick={() => pickPreset("week")} className={presetClass(mode === "week", "border-l border-slate-200")}>
                Weekly
              </button>
              <button
                type="button"
                aria-pressed={mode === "custom"}
                onClick={() => {
                  setMode("custom");
                  setCustomError("");
                }}
                className={presetClass(mode === "custom", "border-l border-slate-200")}
              >
                Custom
              </button>
            </div>
          </div>
        </div>

        {mode === "custom" && (
          <div className="mb-3 px-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-52">
                <DatePicker icon={CalendarDays} label="Start Date" value={customStart} onChange={setCustomStart} height="h-10" />
              </div>
              <div className="w-full sm:w-52">
                <DatePicker icon={CalendarDays} label="End Date" value={customEnd} onChange={setCustomEnd} height="h-10" />
              </div>
              <button type="button" onClick={searchCustom} className="h-10 rounded-md bg-primary px-5 text-sm text-white">
                Search
              </button>
            </div>
            {customError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {customError}
              </p>
            )}
          </div>
        )}

        {/* Phones: one card per report instead of the 5-column table. */}
        <div className="md:hidden" aria-busy={isLoading}>
          {status ? (
            <StatusText status={status} retry={retryable} />
          ) : (
            <ul className="space-y-3 px-4">
              {pageRows.map((row) => (
                <li key={row.key}>
                  <ParentMobileTableCard
                    rows={[
                      { label: HEADERS[0], value: row.serial },
                      { label: HEADERS[1], value: row.type },
                      { label: HEADERS[2], value: row.frequency },
                      { label: HEADERS[3], value: row.published },
                      { label: HEADERS[4], value: viewButton(row) },
                    ]}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full whitespace-nowrap text-left text-sm text-black">
            <thead className="bg-primary text-white">
              <tr>
                {HEADERS.map((header, index) => (
                  <th key={header} className={`py-3 pr-3 font-normal ${index === 0 ? "pl-5" : "pl-3"}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {status ? (
                <tr>
                  <td colSpan={HEADERS.length}>
                    <StatusText status={status} retry={retryable} />
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-200">
                    <td className="py-3 pl-5 pr-3">{row.serial}</td>
                    <td className="px-3 py-3">{row.type}</td>
                    <td className="px-3 py-3">{row.frequency}</td>
                    <td className="px-3 py-3">{row.published}</td>
                    <td className="px-3 py-3">{viewButton(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!status && <ParentTableFooter page={page} pageSize={PAGE_SIZE} total={reports.length} onPageChange={setPage} />}
      </div>
    </div>
  );
}

function StatusText({ status, retry }) {
  return (
    <p className="py-8 text-center text-sm text-black/50" role="status">
      {status}
      {retry && (
        <>
          {" "}
          <button type="button" onClick={retry} className="text-primary underline">
            Try again
          </button>
        </>
      )}
    </p>
  );
}
