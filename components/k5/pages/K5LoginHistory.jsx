"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { useDashboardContext } from "@/hooks/useDashboardContext";

const PAGE_SIZE = 10;
const GRID = "56px minmax(190px,1.2fr) minmax(190px,1.2fr) minmax(220px,1.5fr) minmax(170px,1fr)";
const COLUMNS = ["S.No", "Log in Date | Time", "Log out Date | Time", "Location", "Duration"];
// Phone: every row becomes a card, each value under its label (mockup .bdrow).
const CELL =
  "px-3.5 py-3 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:[overflow-wrap:anywhere] max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]";
const svgProps = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };

function SummaryTile({ label, value, pill, pillClass, tileClass, children }) {
  return (
    <div className={`${K5_CARD} flex items-start gap-3.5 px-[18px] py-4`}>
      <span className="flex min-w-0 flex-[1_1_auto] flex-col gap-1.5">
        <span className="text-[15px] font-black text-k5-mut">{label}</span>
        <span className="font-k5-display text-[26px] font-semibold leading-[1.1] [overflow-wrap:anywhere]">{value}</span>
        <span className={`self-start rounded-full px-3 py-[3px] text-sm font-black ${pillClass}`}>{pill}</span>
      </span>
      <span aria-hidden="true" className={`flex h-[54px] w-[54px] flex-none items-center justify-center rounded-[18px] ${tileClass}`}>
        {children}
      </span>
    </div>
  );
}

function PageButton({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="min-h-11 cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-45"
    >
      {children}
    </button>
  );
}

/** "Login History" title row. Grade 6–8 (Middle.dc.html): no card, a 62px accent tile, a 30px heading. */
function LoginHeader() {
  const { isMiddle } = useDashboardContext();
  return (
    <div className={isMiddle ? "flex flex-wrap items-center gap-4" : `${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      <span
        className={isMiddle ? "k5h-lg-tile flex h-[62px] w-[62px] flex-none items-center justify-center rounded-[14px] bg-k5-act" : "flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-tt"}
      >
        <svg width={isMiddle ? 34 : 48} height={isMiddle ? 34 : 48} viewBox="0 0 24 24" fill="none" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: isMiddle ? "var(--k5-ac)" : "var(--k5-tI)" }}>
          <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
          <path d="M3 4v4h4" />
          <path d="M12 8v4l3 2" />
        </svg>
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h1 className={`m-0 font-k5-display font-semibold leading-[1.05] ${isMiddle ? "text-[30px]" : "text-4xl"}`}>Login History</h1>
        <p className={`m-0 font-extrabold text-k5-mut ${isMiddle ? "text-base" : "text-lg"}`}>See when and where you logged in.</p>
      </div>
    </div>
  );
}

/** Login History while it loads: the title, the three summary tiles, then the sessions card (heading and search, table, pager) and the notice. */
function LoginSkeleton() {
  return (
    <K5Loading label="Loading your log in history" className="flex flex-col gap-4">
      <LoginHeader />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={`${K5_CARD} flex items-start gap-3.5 px-[18px] py-4`}>
            <span className="flex flex-1 flex-col gap-2">
              <K5Sk className="h-4 w-32" />
              <K5Sk className="h-7 w-36" />
              <K5Sk className="h-6 w-24 rounded-full" />
            </span>
            <K5Sk className="h-[54px] w-[54px] flex-none rounded-[18px]" />
          </div>
        ))}
      </div>
      <div className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <K5Sk className="h-8 w-48" />
          <K5Sk className="h-[50px] w-[340px] max-w-full rounded-full" />
        </div>
        <div className="overflow-hidden rounded-[18px] border-[3px] border-k5-line">
          <div className="h-12 bg-k5-ac/25" />
          {Array.from({ length: 5 }, (_, r) => (
            <div key={r} className={`grid items-center gap-4 border-t-2 border-k5-line px-3.5 py-3 ${r % 2 ? "bg-k5-soft" : "bg-k5-card"}`} style={{ gridTemplateColumns: "40px 1.2fr 1.2fr 1.5fr 1fr" }}>
              <K5Sk className="h-4 w-5" />
              <K5Sk className="h-4 w-4/5" />
              <K5Sk className="h-4 w-4/5" />
              <K5Sk className="h-4 w-3/5" />
              <K5Sk className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <K5Sk className="h-4 w-44" />
          <span className="flex items-center gap-2">
            <K5Sk className="h-11 w-24 rounded-[14px]" />
            <K5Sk className="h-11 w-11 rounded-[14px]" />
            <K5Sk className="h-11 w-16 rounded-[14px]" />
          </span>
        </div>
      </div>
      <K5Sk className="h-[78px] w-full rounded-[22px]" />
    </K5Loading>
  );
}

/**
 * K–5 look of My Log in History (mockup Login History): First / Last / Total login tiles, the
 * "Log in Sessions" table with search and pages, and the security notice. Same data as the existing page.
 */
export function K5LoginHistory({ isLoading, attendance }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  usePicoContentReady(!isLoading);

  // "Oct 30, 2026 10:15 AM" -> date = first 3 words, time = the rest (as the existing page does).
  const firstParts = (attendance.firstLogin || "").split(" ");
  const firstDate = firstParts.slice(0, 3).join(" ");
  const firstTime = firstParts.length > 3 ? firstParts.slice(3).join(" ") : attendance.firstLogin;

  const sessions = (attendance.loginHistories ?? []).map((row, i) => {
    const out = row.logOutTime || "N/A";
    const dur = row.totalLoginDuretion || "N/A";
    return { login: row.loginTime || "N/A", logout: out, location: row.loginLocation || "N/A", duration: dur, live: i === 0 && out === "N/A" && dur === "N/A" };
  });
  const term = query.trim().toLowerCase();
  const rows = term ? sessions.filter((r) => [r.login, r.logout, r.location, r.duration].some((v) => v.toLowerCase().includes(term))) : sessions;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const start = current * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);

  if (isLoading) return <LoginSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <LoginHeader />

      {(
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
            <SummaryTile label="First Login" value={firstDate || "N/A"} pill={firstTime || "N/A"} pillClass="bg-k5-gt text-k5-gx" tileClass="bg-k5-gt">
              <svg {...svgProps} style={{ stroke: "var(--k5-gX)" }}>
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" />
              </svg>
            </SummaryTile>
            <SummaryTile label="Last Login | Duration" value={attendance.lastLogin || "N/A"} pill={attendance.duration || "N/A"} pillClass="bg-k5-yt text-k5-yx" tileClass="bg-k5-yt">
              <svg {...svgProps} style={{ stroke: "var(--k5-yX)" }}>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
            </SummaryTile>
            <SummaryTile label="Total Login | Duration" value="Till Now" pill={attendance.totalLoginDuretion || "N/A"} pillClass="bg-k5-bt text-k5-bi" tileClass="bg-k5-bt">
              <svg {...svgProps} style={{ stroke: "var(--k5-bI)" }}>
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M15 7h6v6" />
              </svg>
            </SummaryTile>
          </div>

          <section aria-labelledby="k5-lh" className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-4`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="k5-lh" className="m-0 font-k5-display text-2xl font-semibold">Log in Sessions</h2>
              <label className="flex min-h-[50px] min-w-0 flex-[0_1_340px] items-center gap-2.5 rounded-full border-[3px] border-k5-line bg-k5-soft px-4 max-[760px]:flex-[1_1_100%]">
                <Search className="h-5 w-5 flex-none text-k5-mut" strokeWidth={3} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search sessions..."
                  aria-label="Search sessions..."
                  className="min-w-0 flex-1 border-none bg-transparent text-base font-extrabold text-k5-ink outline-none"
                />
              </label>
            </div>

            <div className="overflow-x-auto rounded-[18px] border-[3px] border-k5-line max-[760px]:overflow-visible max-[760px]:border-0">
              <div role="table" aria-label="Log in Sessions" className="min-w-[900px] text-[15px] font-extrabold max-[760px]:flex max-[760px]:min-w-0 max-[760px]:flex-col max-[760px]:gap-2.5">
                <div role="row" style={{ "--cols": GRID }} className="grid grid-cols-[var(--cols)] bg-k5-ac font-k5-display text-base font-semibold text-white max-[760px]:hidden">
                  {COLUMNS.map((c) => (
                    <span key={c} role="columnheader" className="p-3.5">{c}</span>
                  ))}
                </div>
                {visible.map((r, i) => (
                  <div
                    key={`${r.login}-${start + i}`}
                    role="row"
                    style={{ "--cols": GRID }}
                    className={`grid grid-cols-[var(--cols)] items-center border-t-2 border-k5-line max-[760px]:grid-cols-2 max-[760px]:rounded-[18px] max-[760px]:border-[3px] max-[760px]:py-1.5 ${i % 2 ? "bg-k5-soft" : "bg-k5-card"}`}
                  >
                    <span role="cell" className="px-3.5 py-3 max-[760px]:order-1 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:font-k5-display max-[760px]:text-lg max-[760px]:font-semibold">{start + i + 1}</span>
                    <span role="cell" data-l="Log in Date | Time" className={`${CELL} max-[760px]:col-span-full`}>{r.login}</span>
                    <span role="cell" data-l="Log out Date | Time" className={`${CELL} max-[760px]:col-span-full`}>{r.logout}</span>
                    <span role="cell" data-l="Location" className={`${CELL} max-[760px]:col-span-full`}>
                      <span className="inline-flex items-center gap-1.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none" style={{ stroke: "var(--k5-mut)" }}>
                          <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                          <circle cx="12" cy="9.5" r="2.5" />
                        </svg>
                        {r.location}
                      </span>
                    </span>
                    <span role="cell" data-l="Duration" className={`${CELL} max-[760px]:col-span-full`}>
                      {r.live ? (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-k5-gt px-3 py-1 text-sm font-black text-k5-gx">
                          <span aria-hidden="true" className="k5-lhdot h-2.5 w-2.5 rounded-full bg-k5-gx" />
                          Active now
                        </span>
                      ) : (
                        <span className={r.duration !== "N/A" ? "font-black text-k5-bi" : ""}>{r.duration}</span>
                      )}
                    </span>
                  </div>
                ))}
                {visible.length === 0 && <div className="px-4 py-7 text-center font-k5-display text-[19px] font-semibold text-k5-mut">No sessions found.</div>}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-[15px] font-extrabold text-k5-mut">
                {rows.length ? `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, rows.length)} of ${rows.length} sessions` : "Showing 0 sessions"}
              </span>
              <nav aria-label="Pages" className="flex items-center gap-2">
                <PageButton disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</PageButton>
                <button type="button" aria-current="page" className="h-11 min-w-11 rounded-[14px] border-[3px] border-k5-ac bg-k5-ac px-1.5 font-k5-display text-[17px] font-semibold text-white">
                  {current + 1}
                </button>
                <PageButton disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</PageButton>
              </nav>
            </div>
          </section>

          <div role="note" className="flex items-start gap-3.5 rounded-[22px] border-[3px] border-k5-yb bg-k5-yt px-[18px] py-4">
            <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-[#FFC531]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "#3A2A00" }}>
                <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <p className="m-0 text-base font-extrabold leading-normal">
              <strong className="font-k5-display text-lg font-semibold text-k5-yx">Security Notice:</strong> If you notice any suspicious login activity or unrecognized locations, please contact your administrator immediately. Your account security is important to us.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
