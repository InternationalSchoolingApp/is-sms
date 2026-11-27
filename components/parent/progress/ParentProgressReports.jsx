"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ProgressFooter } from "@/components/parent/progress/ProgressFooter";
import "@/components/parent/progress/progress.css";
import { ParentProgressReportView } from "@/components/parent/progress/ParentProgressReportView";
import { useParentProgressReports } from "@/hooks/parent/useParentProgressReports";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { addDaysYmd, monthStartYmd, pickerDateToYmd, resolveTimeZone, todayYmd, weekStartYmd } from "@/utils/attendanceDates";
import { dateRange, monthEndYmd, normalizeUrl, reportType } from "@/components/parent/progress/reportPayload";

const PAGE_SIZE = 10;
const HEADERS = ["S. No.", "Report Type", "Report Frequency", "Report Published Date", "View"];
const DATE_FIELD = "!rounded-xl !border-[1.5px] !border-[color:var(--line)] !bg-[var(--soft)]";

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

  const firstName = (selectedChild?.studentName || "").trim().split(/\s+/)[0];
  const heading = firstName ? `${firstName}\u2019s Progress Report` : "Progress Report";
  const tabs = [
    ["month", "Monthly"],
    ["week", "Weekly"],
    ["custom", "Custom"],
  ];

  return (
    <section className="sch on" aria-label="Progress report">
      <div className="sc-hero">
        <div>
          <h2>{heading}</h2>
          <p>Weekly reports, one for every week of school.</p>
        </div>
      </div>

      <div className="fcard">
        <div className="pgr-head">
          <h3>Progress Report</h3>
          <div className="sc-seg pgr-seg" role="tablist" aria-label="Report period">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => {
                  if (key === "custom") {
                    setMode("custom");
                    setCustomError("");
                  } else pickPreset(key);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "custom" && (
          <div className="pgr-custom">
            <div className="pgr-custom-row">
              <div className="pgr-dp">
                <DatePicker icon={CalendarDays} label="Start Date" value={customStart} onChange={setCustomStart} height="h-[42px]" triggerClassName={DATE_FIELD} />
              </div>
              <div className="pgr-dp">
                <DatePicker icon={CalendarDays} label="End Date" value={customEnd} onChange={setCustomEnd} height="h-[42px]" triggerClassName={DATE_FIELD} />
              </div>
              <button type="button" onClick={searchCustom} className="sc-go">
                Search
              </button>
            </div>
            {customError && (
              <p className="pgr-err" role="alert">
                {customError}
              </p>
            )}
          </div>
        )}

        {status ? (
          <StatusText status={status} retry={retryable} busy={isLoading} />
        ) : (
          <>
            <div className="ftw">
              <table className="ftbl">
                <thead>
                  <tr>
                    {HEADERS.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.key}>
                      <td data-l={HEADERS[0]}>{row.serial}</td>
                      <td data-l={HEADERS[1]}>{row.type}</td>
                      <td data-l={HEADERS[2]}>{row.frequency}</td>
                      <td data-l="Published">{row.published}</td>
                      <td className="fa" data-l={HEADERS[4]}>
                        <button
                          type="button"
                          className="fbtn o"
                          onClick={() => setSelected({ url: row.url, range })}
                          disabled={!row.url}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ProgressFooter page={page} pageSize={PAGE_SIZE} total={reports.length} onPageChange={setPage} />
          </>
        )}
      </div>
    </section>
  );
}

function StatusText({ status, retry, busy }) {
  return (
    <p className="pgr-status" role="status" aria-busy={busy}>
      {status}
      {retry && (
        <>
          {" "}
          <button type="button" onClick={retry} className="pgr-retry">
            Try again
          </button>
        </>
      )}
    </p>
  );
}
