"use client";

import { useMemo, useState } from "react";
import { Award, FileX, MoreVertical, Search } from "lucide-react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { K5Loading, K5TableSkeleton } from "@/components/k5/K5Skeletons";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";
const GRID = "70px minmax(220px,1.4fr) minmax(220px,1.6fr) 110px minmax(170px,1fr) 90px";
const COLUMNS = ["S. No.", "Student Name", "Email", "Grade", "Student ID", "Action"];
// Phone: every row becomes a card, each value under its label (mockup .bdrow).
const CELL =
  "px-3.5 py-3 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:[overflow-wrap:anywhere] max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]";

const initialsOf = (name) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

/** The ⋮ button of a row: opens a small menu with one item per published transcript. */
function ActionMenu({ transcripts, open, onToggle, onClose, middle }) {
  if (!transcripts.length) return <span className="text-sm font-extrabold text-k5-mut">--</span>;
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Action"
        className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[14px] border-[3px] border-k5-ac ${open ? "bg-k5-ac text-white" : "bg-k5-card text-k5-acx"}`}
      >
        <MoreVertical className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
      </button>
      {open && (
        <span role="menu" className="absolute end-2.5 top-[calc(100%-4px)] z-20 flex min-w-[230px] flex-col rounded-[18px] border-[3px] border-k5-ink bg-k5-card p-2 shadow-[0_6px_0_var(--k5-ink)]" style={middle ? { boxShadow: "0 2px 0 var(--k5-ink)" } : undefined}>
          {transcripts.map((t, i) => (
            <a
              key={i}
              role="menuitem"
              href={`${BACKEND_URL}${t.viewPath}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex min-h-12 items-center gap-2.5 rounded-xl px-3 font-k5-display text-base font-semibold text-k5-ink no-underline hover:bg-k5-soft"
              style={middle ? { borderRadius: 8 } : undefined}
            >
              <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-k5-yt">
                <Award className={`h-[18px] w-[18px] ${middle ? "text-k5-yx" : "text-k5-yi"}`} strokeWidth={2.4} />
              </span>
              Transcript - {t.gradeName}
            </a>
          ))}
        </span>
      )}
    </>
  );
}

/** K–5 look of Student Transcript (mockup Student Transcript): the same record and links as the existing page. */
export function K5Transcript({ isLoading, student, transcripts }) {
  const [query, setQuery] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const { isMiddle } = useDashboardContext();
  usePicoContentReady(!isLoading);

  const rows = useMemo(() => {
    if (!student) return [];
    const row = { name: student.name, email: student.email, grade: student.grade, id: student.rollNumber };
    const q = query.trim().toLowerCase();
    return !q || Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q)) ? [row] : [];
  }, [student, query]);
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;
  const visible = rows.slice(start, start + perPage);

  return (
    <div className="flex flex-col gap-4">
      {isMiddle ? (
        // Grade 6–8 (Middle.dc.html): no card around the title — a 62px accent tile with a clipboard, a 30px heading.
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-[62px] w-[62px] flex-none items-center justify-center bg-k5-act" style={{ borderRadius: 14 }}>
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
                className="min-h-[42px] rounded-xl border-[3px] border-k5-line bg-k5-card px-2.5 text-base font-black text-k5-ink"
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

          <div className={`relative z-[6] rounded-[18px] border-[3px] border-k5-line bg-k5-card pb-0.5 max-[760px]:border-0 ${menuOpen ? "overflow-visible" : "overflow-x-auto max-[760px]:overflow-visible"}`}>
            <div role="table" aria-label="Student Transcript" className="min-w-[900px] text-[15px] font-extrabold max-[760px]:flex max-[760px]:min-w-0 max-[760px]:flex-col max-[760px]:gap-2.5">
              <div role="row" style={{ "--cols": GRID }} className="grid grid-cols-[var(--cols)] rounded-t-[14px] bg-k5-ac font-k5-display text-base font-semibold text-white max-[760px]:hidden">
                {COLUMNS.map((c) => (
                  <span key={c} role="columnheader" className="p-3.5">{c}</span>
                ))}
              </div>
              {visible.map((row, i) => (
                <div
                  key={row.id ?? i}
                  role="row"
                  className="relative grid grid-cols-[var(--cols)] items-center border-t-2 border-k5-line bg-k5-card max-[760px]:grid-cols-2 max-[760px]:rounded-[18px] max-[760px]:border-[3px] max-[760px]:py-1.5"
                  style={isMiddle ? { "--cols": GRID, borderTopWidth: 1.5 } : { "--cols": GRID }}
                >
                  <span role="cell" className="px-3.5 py-3 max-[760px]:order-1 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:font-k5-display max-[760px]:text-lg max-[760px]:font-semibold">{start + i + 1}</span>
                  <span role="cell" data-l="Student Name" className={`${CELL} max-[760px]:col-span-full`}>
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-k5-vt font-k5-display text-sm font-semibold text-[var(--k5-vX)] max-[760px]:hidden">{initialsOf(row.name)}</span>
                      <span className="min-w-0">{row.name}</span>
                    </span>
                  </span>
                  <span role="cell" data-l="Email" className={`${CELL} [overflow-wrap:anywhere] max-[760px]:col-span-full`}>{row.email}</span>
                  <span role="cell" data-l="Grade" className={`${CELL} max-[760px]:col-span-full`}>
                    <span className="rounded-full bg-k5-act px-3 py-[3px] font-black text-k5-acx whitespace-nowrap">{row.grade}</span>
                  </span>
                  <span role="cell" data-l="Student ID" className={`${CELL} max-[760px]:col-span-full`}>
                    <span className="rounded-lg bg-k5-soft px-2.5 py-0.5 font-mono text-sm font-extrabold">{row.id}</span>
                  </span>
                  <span role="cell" className="relative px-3.5 py-2 max-[760px]:order-1 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:text-end">
                    <ActionMenu middle={isMiddle} transcripts={transcripts} open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} onClose={() => setMenuOpen(false)} />
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

      {/* A tap anywhere else closes the open menu (mockup trMenuClose). */}
      {menuOpen && <button type="button" aria-label="Close" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[4] cursor-default border-none bg-transparent p-0" />}
    </div>
  );
}
