"use client";

import { useMemo, useState } from "react";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { PdFooter } from "@/components/parent/pageParts/PdFooter";
import { PdHero } from "@/components/parent/pageParts/PdHero";
import { firstName } from "@/components/parent/childLabels";
import "@/components/parent/academicDocs/academicDocs.css";
import { VIEWS, filterRows } from "@/components/parent/academicDocs/docRows";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { useAcademicDocDownload, useParentAcademicDocs } from "@/hooks/parent/useParentAcademicDocs";
import { resolveTimeZone } from "@/utils/attendanceDates";

const PAGE_SIZE = 10;
const HEADERS = ["S. No.", "Grade", "Academic Year", "Learning Program", "Transcript", "Diploma", "Academic Verification"];
const KIND_LABEL = { transcript: "Transcript", diploma: "Diploma", verification: "Academic Verification" };

function DownloadButton({ row, kind, busy, onDownload }) {
  if (!row[kind]) return <span aria-label="Not available">--</span>;
  const working = busy === `${row.index}:${kind}`;
  return (
    <button type="button" onClick={() => onDownload(row, kind)} disabled={Boolean(busy)} className="fbtn o dc-dl">
      {working ? "Preparing…" : "Download"}
      <span className="dc-k">&nbsp;{KIND_LABEL[kind]}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
      </svg>
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

  const status = isLoading
    ? "Loading…"
    : sessionOut
      ? "Your session has expired. Please log in again."
      : failed
        ? "Unable to load academic documents."
        : filtered.length === 0
          ? "No academic documents found"
          : null;

  const name = firstName(selectedChild?.studentName);

  return (
    <section className="sch on" id="docsView" aria-label="Academic docs" aria-busy={isLoading}>
      <PdHero title={name ? `${name}\u2019s Academic Docs` : "Academic Docs"} subtitle="School record for each grade." />

      <div className="fcard">
        <div className="pv-hd" style={{ alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Student Transcript</h3>
          <div className="sc-seg dc-seg" role="tablist" aria-label="Show documents">
            {VIEWS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => {
                  setView(key);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

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
              {status ? (
                <tr>
                  <td colSpan={HEADERS.length} className="pv-empty" style={{ display: "block", textAlign: "center" }}>
                    {status}
                    {failed && !isLoading && (
                      <button type="button" onClick={retry} className="fbtn o" style={{ marginLeft: 12, height: 32, cursor: "pointer" }}>
                        Try again
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr key={`${row.index}-${row.rowKey}`}>
                    <td data-l={HEADERS[0]}>{page * PAGE_SIZE + index + 1}</td>
                    <td data-l={HEADERS[1]}>
                      <span className="pv-tag">{row.gradeName || "N/A"}</span>
                    </td>
                    <td data-l={HEADERS[2]}>{row.sessionName || "N/A"}</td>
                    <td data-l={HEADERS[3]}>{row.learningProgram || "N/A"}</td>
                    <td className="fa" data-l={HEADERS[4]}>
                      <DownloadButton row={row} kind="transcript" busy={busy} onDownload={download} />
                    </td>
                    <td className="fa" data-l={HEADERS[5]}>
                      <DownloadButton row={row} kind="diploma" busy={busy} onDownload={download} />
                    </td>
                    <td className="fa" data-l={HEADERS[6]}>
                      <DownloadButton row={row} kind="verification" busy={busy} onDownload={download} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!status && <PdFooter page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />}
      </div>
    </section>
  );
}
