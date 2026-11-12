"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ParentMobileTableCard } from "@/components/parent/common/ParentMobileTableCard";
import { ParentTableFooter } from "@/components/parent/common/ParentTableFooter";
import { VIEWS, filterRows } from "@/components/parent/academicDocs/docRows";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { useAcademicDocDownload, useParentAcademicDocs } from "@/hooks/parent/useParentAcademicDocs";
import { resolveTimeZone } from "@/utils/attendanceDates";

const PAGE_SIZE = 10;
const HEADERS = ["S.No", "Grade", "Academic Year", "Learning Program", "Transcript", "Diploma", "Academic Verification"];

function DownloadButton({ row, kind, busy, onDownload }) {
  if (!row[kind]) return <span aria-label="Not available">--</span>;
  const working = busy === `${row.index}:${kind}`;
  return (
    <button
      type="button"
      onClick={() => onDownload(row, kind)}
      disabled={Boolean(busy)}
      className="inline-flex items-center gap-1.5 rounded border border-primary px-3 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {working ? "Preparing…" : "Download"}
      {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
    </button>
  );
}

/**
 * Parent "Download Academic Docs" (pageLink parent-download-academic-docs), legacy parentAcademicDocs.js: for the
 * selected child, the "Academic Documents" table (S.No, Grade, Academic Year, Learning Program, Transcript, Diploma,
 * Academic Verification) with the Weekly / Monthly filter on the graduation date. A document with no link shows "--".
 * Downloads go through /api/parent/academic-docs (see useAcademicDocDownload): no backend link or token reaches the browser.
 */
export function ParentAcademicDocs() {
  const { selectedChild } = useSelectedChild();
  return (
    <ParentChildRequired>
      {/* Keyed by child: switching child starts again on the Weekly view, page 1. */}
      <SelectedChildAcademicDocs key={selectedChild?.userId} />
    </ParentChildRequired>
  );
}

function SelectedChildAcademicDocs() {
  const { selectedChild } = useSelectedChild();
  const { isLoading, sessionOut, failed, rows, retry } = useParentAcademicDocs();
  const { busy, download } = useAcademicDocDownload();
  const [view, setView] = useState("week");
  const [page, setPage] = useState(0);

  const timeZone = resolveTimeZone(selectedChild?.studentTimezone);
  const filtered = useMemo(() => filterRows(rows, view, timeZone), [rows, view, timeZone]);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const cells = (row, index) => [
    page * PAGE_SIZE + index + 1,
    row.gradeName || "N/A",
    row.sessionName || "N/A",
    row.learningProgram || "N/A",
    <DownloadButton key="t" row={row} kind="transcript" busy={busy} onDownload={download} />,
    <DownloadButton key="d" row={row} kind="diploma" busy={busy} onDownload={download} />,
    <DownloadButton key="v" row={row} kind="verification" busy={busy} onDownload={download} />,
  ];

  const status = isLoading
    ? "Loading…"
    : sessionOut
      ? "Your session has expired. Please log in again."
      : failed
        ? "Unable to load academic documents."
        : filtered.length === 0
          ? "No academic documents found"
          : null;
  const retryButton =
    failed && !isLoading ? (
      <button type="button" onClick={retry} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 md:ml-3 md:mt-0 md:px-3 md:py-1 md:text-xs">
        Try again
      </button>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-3 flex items-center gap-3 px-1">
        <FileText className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-bold text-black sm:text-xl">Academic Documents - {selectedChild?.studentName || "N/A"}</h1>
      </div>

      <div className="rounded-[10px] border border-slate-200 bg-white py-4">
        <div className="mb-3 px-4 sm:px-5">
          <div className="inline-flex overflow-hidden rounded-full border border-slate-200" role="group" aria-label="Show documents">
            {VIEWS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => {
                  setView(key);
                  setPage(0);
                }}
                className={`px-4 py-1.5 text-sm ${view === key ? "bg-primary text-white" : "bg-slate-100 text-black hover:bg-slate-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Phones: one card per document row instead of a 7-column table. */}
        <div className="md:hidden">
          {status ? (
            <div className="border-t border-slate-200 py-8 text-center text-sm text-black/50">
              <p>{status}</p>
              {retryButton}
            </div>
          ) : (
            <ul className="space-y-3 px-4">
              {pageRows.map((row, index) => (
                <li key={`${row.index}-${row.rowKey}`}>
                  <ParentMobileTableCard rows={cells(row, index).map((value, column) => ({ label: HEADERS[column], value }))} />
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
                  <td colSpan={HEADERS.length} className="py-8 text-center text-black/50">
                    {status}
                    {retryButton}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={`${row.index}-${row.rowKey}`} className="border-b border-slate-200">
                    {cells(row, index).map((value, column) => (
                      <td key={HEADERS[column]} className={`py-3 pr-3 ${column === 0 ? "pl-5" : "pl-3"}`}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!status && <ParentTableFooter page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />}
      </div>
    </div>
  );
}
