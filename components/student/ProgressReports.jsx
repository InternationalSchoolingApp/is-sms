"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentProgressReports } from "@/hooks/useStudentProgressReports";
import { TableFooter } from "@/components/student/TableFooter";
import { ProgressReportView } from "@/components/student/ProgressReportView";
import { MobileTableCard } from "@/components/student/MobileTableCard";

const PAGE_SIZE = 10;

// Legacy studentProgressDetailMapRows: daysType -> report type label.
function reportType(daysType) {
  const days = Number(daysType);
  if (days === 14 || days === 15) return "Biweekly Progress Report";
  if (days === 28 || days === 30) return "Monthly Progress Report";
  return "Weekly Progress Report";
}

function dateRange(startDate, endDate) {
  if (!startDate && !endDate) return "N/A";
  return `${startDate || "N/A"} - ${endDate || "N/A"}`;
}

// Legacy studentProgressDetailNormalizeUrl: the backend joins base URL + school UUID with a doubled slash.
function normalizeUrl(url) {
  return url ? String(url).replace(/([^:/])\/{2,}/g, "$1/") : "";
}

/**
 * Progress Reports ("My Progress Reports") — legacy studentProgressDetail.js +
 * studentProgressDetailContent.js ("Progress Report" DataTable). View swaps the
 * table for the gradebook report (ProgressReportView) with a Back button, as
 * legacy swaps the dashboard content.
 */
export function ProgressReports() {
  const { context } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const { isLoading, reports } = useStudentProgressReports({ schoolUUID, userId });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  const pageRows = useMemo(() => reports.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [reports, page]);

  if (selected) {
    return <ProgressReportView url={selected} onBack={() => setSelected(null)} />;
  }

  const headers = ["S. No.", "Report Type", "Report Frequency", "Report Published Date", "View"];
  const rows = pageRows.map((report, index) => {
    const range = dateRange(report.reportStartDate, report.reportEndDate);
    return {
      key: report.weeklyReportId || `${range}-${index}`,
      serial: page * PAGE_SIZE + index + 1,
      type: reportType(report.daysType),
      range,
      published: report.createdDate || "N/A",
      url: normalizeUrl(report.playloadUrl),
    };
  });
  const viewButton = (row) => (
    <button
      type="button"
      onClick={() => setSelected(row.url)}
      disabled={!row.url}
      className="flex shrink-0 items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-white disabled:opacity-60"
    >
      View
      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
  const status = isLoading ? "Loading…" : reports.length === 0 ? "No progress report found" : null;

  return (
    <div className="w-full">
      <div className="rounded-[10px] border border-slate-200 bg-white py-4">
        <h4 className="mb-3 ml-4 text-lg font-bold text-black sm:ml-5 sm:text-xl">Progress Report</h4>

        {/* Mobile: one card per report (column title beside each value) instead of a 5-column table. */}
        <div className="md:hidden">
          {status ? (
            <p className="border-t border-slate-200 py-8 text-center text-sm text-black/50">{status}</p>
          ) : (
            <ul className="space-y-3 px-4">
              {rows.map((row) => (
                <li key={row.key}>
                  <MobileTableCard
                    rows={[
                      { label: headers[0], value: row.serial },
                      { label: headers[1], value: row.type },
                      { label: headers[2], value: row.range },
                      { label: headers[3], value: row.published },
                      { label: headers[4], value: viewButton(row) },
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
                {headers.map((header, index) => (
                  <th key={header} className={`py-3 pr-3 font-normal ${index === 0 ? "pl-5" : "pl-3"}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {status ? (
                <tr>
                  <td colSpan={headers.length} className="py-8 text-center text-black/50">
                    {status}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-200">
                    <td className="py-3 pl-5 pr-3">{row.serial}</td>
                    <td className="px-3 py-3">{row.type}</td>
                    <td className="px-3 py-3">{row.range}</td>
                    <td className="px-3 py-3">{row.published}</td>
                    <td className="px-3 py-3">{viewButton(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && reports.length > 0 && (
          <TableFooter page={page} pageSize={PAGE_SIZE} total={reports.length} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
