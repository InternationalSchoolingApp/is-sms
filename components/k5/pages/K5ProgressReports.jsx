"use client";

import { useState } from "react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { EyeIcon } from "@/components/k5/pages/K5PerformanceIcons";
import { K5ProgressReportView } from "@/components/k5/pages/K5ProgressReportView";

const PAGE_SIZE = 10;
const GRID = { gridTemplateColumns: "90px 1.4fr 1.6fr 1.2fr 130px" };
const HEAD = "p-3.5 font-k5-display text-base font-semibold";
const PAGE_BTN = "min-h-[42px] cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-3.5 font-k5-body text-[15px] font-black text-k5-mut disabled:cursor-default disabled:opacity-50";

export function ReportIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

/** K–5 look of My Progress Reports (Playful.dc.html progrep list); View opens the report in the K–5 view. */
export function K5ProgressReports({ isLoading, rows }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  usePicoContentReady(!isLoading);

  if (selected) return <K5ProgressReportView url={selected} onBack={() => setSelected(null)} />;

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const from = rows.length ? page * PAGE_SIZE + 1 : 0;
  const to = Math.min(rows.length, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-[18px]">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
        <span aria-hidden="true" className="flex h-[76px] w-[76px] flex-none items-center justify-center rounded-[24px]" style={{ background: "var(--k5-gT)", color: "var(--k5-gI)" }}>
          <ReportIcon size={42} />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h1 id="k5-pr-title" className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">Progress Report</h1>
          <p className="m-0 text-lg font-extrabold text-k5-mut">Your weekly reports, one for every week of school</p>
        </div>
      </div>

      <section aria-labelledby="k5-pr-title" className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-[18px]`}>
        <div className="k5-bdwrap overflow-x-auto rounded-[18px] border-[3px] border-k5-line bg-k5-card">
          <div role="table" aria-labelledby="k5-pr-title" className="k5-bdtbl min-w-[820px] text-base font-extrabold">
            <div role="row" className="k5-bdhead grid bg-k5-ac text-white" style={GRID}>
              {["S. No.", "Report Type", "Report Frequency", "Report Published Date", "View"].map((h) => (
                <span key={h} role="columnheader" className={HEAD}>{h}</span>
              ))}
            </div>
            {isLoading ? (
              <p className="m-0 p-6 text-center font-k5-display text-lg font-semibold text-k5-mut">Loading…</p>
            ) : !rows.length ? (
              <p className="m-0 p-6 text-center font-k5-display text-lg font-semibold text-k5-mut">No progress report found</p>
            ) : (
              pageRows.map((row, i) => (
                <div key={row.key} role="row" className="k5-bdrow grid items-center border-t-2 border-k5-line" style={{ ...GRID, background: i % 2 ? "var(--k5-card)" : "var(--k5-soft)" }}>
                  <span role="cell" data-l="S. No." className="px-3.5 py-3">{row.serial}</span>
                  <span role="cell" data-l="Report Type" className="k5-bdwide flex items-center gap-2.5 px-3.5 py-3">
                    <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-xl" style={{ background: "var(--k5-gT)", color: "var(--k5-gI)" }}>
                      <ReportIcon />
                    </span>
                    {row.type}
                  </span>
                  <span role="cell" data-l="Report Frequency" className="px-3.5 py-3">{row.range}</span>
                  <span role="cell" data-l="Report Published Date" className="px-3.5 py-3">{row.published}</span>
                  <span role="cell" data-l="View" className="px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => setSelected(row.url)}
                      disabled={!row.url}
                      className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full border-none bg-k5-ac px-4 font-k5-display text-base font-semibold text-white shadow-[0_3px_0_var(--k5-acd)] disabled:cursor-default disabled:opacity-50"
                    >
                      View
                      <EyeIcon />
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        {!isLoading && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-base font-extrabold text-k5-mut">
              Showing {from} to {to} of {rows.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className={PAGE_BTN}>Previous</button>
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-k5-ac font-k5-display font-semibold text-white">{page + 1}</span>
              <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className={PAGE_BTN}>Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
