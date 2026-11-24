"use client";

import { useMemo, useState } from "react";
import { Award, Download, FileX, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { downloadTranscriptDocument, isDownloadableTranscriptLink } from "@/utils/transcriptDownload";
import { K5Loading, K5TableSkeleton } from "@/components/k5/K5Skeletons";

const GRID = "70px minmax(130px,0.9fr) minmax(170px,1.1fr) minmax(145px,1fr) minmax(145px,1fr) minmax(185px,1.2fr)";
const COLUMNS = ["S. No.", "Grade", "Student ID", "Transcript", "Diploma", "Academic Verification"];
// Phone: every row becomes a card, each value under its label (mockup .bdrow).
const CELL =
  "px-3.5 py-3 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:[overflow-wrap:anywhere] max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]";

function DownloadButton({ href, label }) {
  const className = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] border-[2px] border-k5-ac bg-k5-card px-3 font-k5-display text-[15px] font-semibold text-k5-acx no-underline shadow-[0_2px_0_var(--k5-acd)]";
  const [busy, setBusy] = useState(false);
  if (!href) return <span className="text-sm font-extrabold text-k5-mut">--</span>;
  // The demo page of dummy mode is only a page to look at; the real documents are saved as files, not opened in a tab.
  if (!isDownloadableTranscriptLink(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Download ${label}`} className={className}>
        Download <Download className="h-4 w-4" aria-hidden="true" />
      </a>
    );
  }
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadTranscriptDocument({ href, name: label });
    } catch (error) {
      toast.error(String(error?.message || "The document could not be downloaded right now. Please try again."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={save} disabled={busy} aria-busy={busy} aria-label={`Download ${label}`} className={`${className} cursor-pointer disabled:cursor-default disabled:opacity-70`}>
      {busy ? "Downloading" : "Download"} {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
/** K–5 look of Student Transcript (mockup Student Transcript): the same record and links as the existing page. */
export function K5Transcript({ isLoading, student, transcripts = [], links }) {
  const [query, setQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const { isMiddle } = useDashboardContext();
  usePicoContentReady(!isLoading);

  const rows = useMemo(() => {
    if (!student) return [];
    const records = transcripts.length
      ? transcripts.map((transcript, index) => ({
          key: `transcript-${index}`,
          grade: transcript.gradeName || student.grade,
          id: student.rollNumber,
          transcriptLink: links.find((link) => link.key === `t${index}`),
          diplomaLink: links.find((link) => link.key === `d${index}`),
          verificationLink: links.find((link) => link.key === `v${index}`),
        }))
      : [{ key: "current", grade: student.grade, id: student.rollNumber }];
    const q = query.trim().toLowerCase();
    return records.filter((row) => !q || [row.grade, row.id].some((value) => String(value ?? "").toLowerCase().includes(q)));
  }, [student, transcripts, links, query]);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;
  const visible = rows.slice(start, start + perPage);

  return (
    <div className="flex flex-col gap-4">
      {isMiddle ? (
        // Grade 6–8 (Middle.dc.html): no card around the title — a 62px accent tile with a clipboard, a 30px heading.
        <div className="flex flex-wrap items-center gap-4">
          <span className="k5h-tr-tile flex h-[62px] w-[62px] flex-none items-center justify-center rounded-[14px] bg-k5-act">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="stroke-k5-ac">
              <rect x="5" y="3" width="14" height="18" rx="2.5" />
              <path d="M9 3.5v2h6v-2" />
              <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" />
            </svg>
          </span>
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
            <h1 className="m-0 font-k5-display text-[30px] font-semibold leading-[1.05]">Student Transcript</h1>
            <p className="m-0 text-base font-extrabold text-k5-mut">Your school record for each grade.</p>
          </div>
        </div>
      ) : (
        <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
          <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-yt">
            <Award className="h-12 w-12 text-k5-yi" strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
            <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">Student Transcript</h1>
            <p className="m-0 text-lg font-extrabold text-k5-mut">Your school record for each grade.</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <K5Loading label="Loading your transcript">
          <K5TableSkeleton rows={1} cols={6} />
        </K5Loading>
      ) : !student ? (
        <div className={`${K5_CARD} flex flex-col items-center gap-2 p-8 text-center`}>
          <FileX className="h-10 w-10 text-k5-mut" aria-hidden="true" />
          <p className="m-0 font-k5-display text-2xl font-semibold text-k5-mut">Your transcript has not been published yet.</p>
        </div>
      ) : (
        <section aria-labelledby="k5-tr" className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-4`}>
          <h2 id="k5-tr" className="sr-only">Student Transcript</h2>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-base font-extrabold">
              Show
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="k5h-pr-btn min-h-[42px] rounded-xl border-[3px] border-k5-line bg-k5-card px-2.5 text-base font-black text-k5-ink"
                style={isMiddle ? { borderRadius: 8 } : undefined}
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              entries
            </label>
            <label className="flex min-h-[50px] min-w-0 flex-[0_1_320px] items-center gap-2.5 rounded-full border-[3px] border-k5-line bg-k5-soft px-4 max-[760px]:flex-[1_1_100%]">
              <Search className="h-5 w-5 flex-none text-k5-mut" strokeWidth={2.6} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search..."
                aria-label="Search..."
                className="min-w-0 flex-1 border-none bg-transparent text-base font-extrabold text-k5-ink outline-none"
              />
            </label>
          </div>

          <div className="relative z-[6] overflow-x-auto rounded-[18px] border-[3px] border-k5-line bg-k5-card pb-0.5 max-[760px]:overflow-visible max-[760px]:border-0">
            <div role="table" aria-label="Student Transcript" className="k5h-tr-table min-w-[900px] text-[15px] font-extrabold max-[760px]:flex max-[760px]:min-w-0 max-[760px]:flex-col max-[760px]:gap-2.5">
              <div role="row" style={{ "--cols": GRID }} className="grid grid-cols-[var(--cols)] rounded-t-[14px] bg-k5-ac font-k5-display text-base font-semibold text-white max-[760px]:hidden">
                {COLUMNS.map((c) => (
                  <span key={c} role="columnheader" className="p-3.5">{c}</span>
                ))}
              </div>
              {visible.map((row, i) => (
                <div
                  key={row.key}
                  role="row"
                  className="relative grid grid-cols-[var(--cols)] items-center border-t-2 border-k5-line bg-k5-card max-[760px]:grid-cols-2 max-[760px]:rounded-[18px] max-[760px]:border-[3px] max-[760px]:py-1.5"
                  style={isMiddle ? { "--cols": GRID, borderTopWidth: 1.5 } : { "--cols": GRID }}
                >
                  <span role="cell" className="px-3.5 py-3 max-[760px]:order-1 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:font-k5-display max-[760px]:text-lg max-[760px]:font-semibold">{start + i + 1}</span>
                  <span role="cell" data-l="Grade" className={`${CELL} max-[760px]:col-span-full`}>
                    <span className="rounded-full bg-k5-act px-3 py-[3px] font-black text-k5-acx whitespace-nowrap">{row.grade}</span>
                  </span>
                  <span role="cell" data-l="Student ID" className={`${CELL} max-[760px]:col-span-full`}>
                    <span className="k5h-tr-code rounded-lg bg-k5-soft px-2.5 py-0.5 font-mono text-sm font-extrabold">{row.id}</span>
                  </span>
                  <span role="cell" data-l="Transcript" className={CELL}>
                    <DownloadButton href={row.transcriptLink?.href} label={row.transcriptLink?.label || "transcript"} />
                  </span>
                  <span role="cell" data-l="Diploma" className={CELL}>
                    <DownloadButton href={row.diplomaLink?.href} label={row.diplomaLink?.label || "diploma"} />
                  </span>
                  <span role="cell" data-l="Academic Verification" className={CELL}>
                    <DownloadButton href={row.verificationLink?.href} label={row.verificationLink?.label || "academic verification"} />
                  </span>
                </div>
              ))}
              {visible.length === 0 && (
                <div className="px-4 py-7 text-center font-k5-display text-[19px] font-semibold text-k5-mut">No matching records found.</div>
              )}
            </div>
          </div>

          <div className={`flex flex-wrap items-center gap-2.5 ${isMiddle ? "justify-between" : "justify-center"}`}>
            <span className="text-[15px] font-extrabold text-k5-mut">
              {rows.length ? `Showing ${start + 1} to ${Math.min(start + perPage, rows.length)} of ${rows.length} entries` : "Showing 0 to 0 of 0 entries"}
            </span>
            <nav aria-label="Pages" className="flex items-center gap-2">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="min-h-11 cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-45">
                Previous
              </button>
              <button type="button" aria-current="page" className="h-11 min-w-11 rounded-[14px] border-[3px] border-k5-ac bg-k5-ac px-1.5 font-k5-display text-[17px] font-semibold text-white">
                {current}
              </button>
              <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)} className="min-h-11 cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-45">
                Next
              </button>
            </nav>
          </div>
        </section>
      )}

    </div>
  );
}
