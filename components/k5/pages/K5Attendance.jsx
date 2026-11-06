"use client";

import { useState } from "react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { K5AttendanceDetails, AC, ATB, LABEL } from "@/components/k5/pages/K5AttendanceDetails";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";

/**
 * K–5 look of My Attendance (mockup My Attendance): header, three number tiles, the Academic Year bar
 * chart, the Monthly Summary donut with its medal, and the Attendance Details table.
 * Tiles, bars and the donut use the real attendance data (student-attendance-full); Attendance Details
 * (K5AttendanceDetails) loads its own page from student-attendance-details.
 */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const VIEWS = [["today", "Today"], ["week", "Week"], ["month", "Month"], ["year", "Academic Year"]];

const n = (v) => Number(v) || 0;
const pad = (v) => String(v).padStart(2, "0");


// ---- real data helpers ------------------------------------------------------------------------------------
function academicYearMonths(now) {
  const start = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return [7, 8, 9, 10, 11, 12, 1, 2, 3, 4].map((m) => ({ year: m >= 7 ? start : start + 1, month: m }));
}

function buildMonth(slot, byKey, summary, isCurrent) {
  const m = byKey[`${slot.year}-${pad(slot.month)}`];
  const held = isCurrent && summary ? n(summary.totalClassesHeldThisMonth) : n(m?.totalClassesHeld);
  if (!m && !(isCurrent && summary)) return null;
  if (held <= 0) return null;
  let late;
  let absent;
  let present;
  if (isCurrent && summary) {
    late = n(summary.late);
    absent = n(summary.absent);
    present = n(summary.classesAttended);
  } else {
    // The API names them absentClasses / lateClasses per month.
    absent = m.absentClasses !== undefined ? n(m.absentClasses) : Math.max(0, held - n(m.attendedClasses));
    late = n(m.lateClasses);
    present = Math.max(0, held - absent - late);
  }
  const percent = isCurrent && summary ? n(summary.attendancePercentThisMonth) : n(m?.attendancePercent);
  return { total: held, present, late, absent, percent };
}

function Medal({ b }) {
  return (
    <svg width="64" height="78" viewBox="0 0 64 78" aria-hidden="true" className="k5-atmedal flex-none">
      <path d="M18 40 L10 74 L22 67 L28 77 L34 44 Z" fill={b.r1} />
      <path d="M46 40 L54 74 L42 67 L36 77 L30 44 Z" fill={b.r2} />
      <circle cx="32" cy="30" r="27" fill={b.c1} stroke={b.c2} strokeWidth="4" />
      <circle cx="32" cy="30" r="19" fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="3 4" />
      <path d="M32 16l4.1 8.4 9.2 1.3-6.7 6.5 1.6 9.2L32 37.1l-8.2 4.3 1.6-9.2-6.7-6.5 9.2-1.3z" fill="#FFFFFF" stroke={b.c2} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

// Every level wears the gold medal card of the mockup's Attendance Star; the level only changes its chip and message.
const GOLD = { c1: "#FFC531", c2: "#C9930A", r1: "#E5243B", r2: "#B81A2E", bg: "#FFF8DC" };

function badgeOf(p) {
  if (p >= 95) return { ...GOLD, name: "Attendance Star", msg: "Super star! You almost never miss a class." };
  if (p >= 90) return { ...GOLD, name: "Super Regular", msg: "Great job! Keep it up." };
  if (p >= 80) return { ...GOLD, name: "Good Effort", msg: "Let's try to come to every class!" };
  return { ...GOLD, name: "Keep Going", msg: "Let's try to come to every class!" };
}

function StatTile({ label, value, valueClass, tileClass, icon, children }) {
  return (
    <div className={`${K5_CARD} flex items-center gap-3.5 px-4 py-3.5`}>
      <span className="flex min-w-0 flex-[1_1_auto] flex-col gap-1">
        <span className="text-[15px] font-black text-k5-mut">{label}</span>
        <span className={`font-k5-display text-[38px] font-bold leading-none ${valueClass}`}>{value}</span>
        {children}
      </span>
      <span aria-hidden="true" className={`flex h-[54px] w-[54px] flex-none items-center justify-center rounded-[18px] ${tileClass}`}>
        {icon}
      </span>
    </div>
  );
}

const svgProps = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };

/** K–5 look of My Attendance. `months` / `summary` are the existing attendance response. */
export function K5Attendance({ isLoading, sessionOut, summary, months }) {
  const now = new Date();
  const slots = academicYearMonths(now);
  const byKey = Object.fromEntries((months ?? []).map((m) => [m.monthKey, m]));
  const curIdx = slots.findIndex((s) => s.year === now.getFullYear() && s.month === now.getMonth() + 1);
  const data = slots.map((s, i) => buildMonth(s, byKey, summary, i === curIdx));
  const lastWithData = data.reduce((acc, d, i) => (d ? i : acc), -1);

  const [picked, setPicked] = useState(null);
  const [view, setView] = useState("year");
  const [filter, setFilter] = useState("");
  usePicoContentReady(!isLoading);

  // The current month, or - while it has no classes yet - the latest month that has some.
  const sel = picked ?? (curIdx >= 0 && data[curIdx] ? curIdx : lastWithData >= 0 ? lastWithData : Math.max(0, curIdx));
  const cur = data[sel];
  const prevIdx = (() => {
    for (let j = sel - 1; j >= 0; j--) if (data[j]) return j;
    return -1;
  })();
  const diff = cur && prevIdx >= 0 ? cur.percent - data[prevIdx].percent : null;
  const monthLong = `${MON_LONG[slots[sel].month - 1]} ${slots[sel].year}`;
  const badge = cur ? badgeOf(cur.percent) : null;

  const toggleFilter = (k) => setFilter((f) => (f === k ? "" : k));

  const R = 58;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const slices = cur
    ? [["present", cur.present], ["late", cur.late], ["absent", cur.absent]]
        .filter(([, count]) => count > 0)
        .map(([k, count]) => {
          const len = (C * count) / (cur.total || 1);
          const gap = len >= C - 0.5 ? 0 : Math.min(3, len * 0.4);
          const active = !filter || filter === k || (filter === "missS" && k === "absent");
          const slice = { k, count, c: AC[k], dash: `${(len - gap).toFixed(2)} ${(C - len + gap).toFixed(2)}`, off: (-offset).toFixed(2), op: active ? 1 : 0.3, sw: filter === k ? 26 : 20 };
          offset += len;
          return slice;
        })
    : [];

  if (isLoading) return <p className="m-0 py-8 text-center font-k5-display text-2xl font-semibold text-k5-mut">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
        <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-tt">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "var(--k5-tI)" }}>
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M9 2.5h6v3H9z" />
            <path d="M8.5 11l1.5 1.5 3-3" />
            <path d="M8.5 16.5h7" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">My Attendance</h1>
          <p className="m-0 text-lg font-extrabold text-k5-mut">See how many classes you came to.</p>
        </div>
      </div>

      {!summary ? (
        <div className={`${K5_CARD} p-8 text-center font-k5-display text-2xl font-semibold text-k5-mut`}>
          {sessionOut ? "Your session has expired. Please log in again." : "Attendance details not found"}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
            <StatTile
              label="Classes Today"
              value={n(summary.classesToday)}
              valueClass="text-k5-vi"
              tileClass="bg-k5-vt"
              icon={
                <svg {...svgProps} strokeWidth="2.4" style={{ stroke: "var(--k5-vI)" }}>
                  <rect x="3" y="5" width="18" height="16" rx="3" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
              }
            />
            <StatTile
              label={`Attendance · ${monthLong}`}
              value={cur ? `${cur.percent}%` : "–"}
              valueClass="text-k5-gx"
              tileClass="bg-k5-gt"
              icon={
                <svg {...svgProps} strokeWidth="2.6" style={{ stroke: "var(--k5-gX)" }}>
                  <path d="M5 12l5 5 9-10" />
                </svg>
              }
            >
              {diff !== null && (
                <span className={`self-start rounded-full px-2.5 py-0.5 text-[13px] font-black ${diff >= 0 ? "bg-k5-gt text-k5-gx" : "bg-k5-rt text-k5-ri"}`}>
                  {diff === 0
                    ? `Same as ${MON_LONG[slots[prevIdx].month - 1]}`
                    : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)}% from ${MON_LONG[slots[prevIdx].month - 1]}`}
                </span>
              )}
            </StatTile>
            <StatTile
              label={`Late · ${monthLong}`}
              value={cur ? cur.late : 0}
              valueClass="text-k5-yx"
              tileClass="bg-k5-yt"
              icon={
                <svg {...svgProps} strokeWidth="2.4" style={{ stroke: "var(--k5-yX)" }}>
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 2" />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-stretch gap-4 max-[900px]:grid-cols-1">
            <section aria-labelledby="k5-at-perf" className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-[18px]`}>
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 id="k5-at-perf" className="m-0 font-k5-display text-2xl font-semibold">Performance Overview</h2>
                  <span className="text-[15px] font-extrabold text-k5-mut">Tap a month to see its summary.</span>
                </div>
                <select value={view} onChange={(e) => setView(e.target.value)} aria-label="Performance Overview" className="min-h-[46px] cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3 text-base font-extrabold text-k5-ink">
                  {VIEWS.map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </div>

              {view !== "year" ? (
                <div className="flex h-[240px] items-center justify-center rounded-[20px] bg-k5-soft px-4 text-center font-k5-display text-[19px] font-semibold text-k5-mut">
                  Coming soon · Pick Academic Year to see your months.
                </div>
              ) : (
                <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-1.5">
                  <div aria-hidden="true" className="relative h-[240px] text-xs font-extrabold text-k5-mut">
                    {[100, 75, 50, 25, 0].map((p) => (
                      <span key={p} className="absolute right-0 translate-y-1/2" style={{ bottom: `${p}%` }}>{p}%</span>
                    ))}
                  </div>
                  <div className="relative h-[240px] border-b-2 border-k5-line">
                    {[100, 75, 50, 25].map((p) => (
                      <span key={p} aria-hidden="true" className="absolute inset-x-0 border-t border-dashed border-k5-line" style={{ bottom: `${p}%` }} />
                    ))}
                    <div role="group" aria-label="Performance Overview" className="absolute inset-0 flex items-end gap-1">
                      {slots.map((s, j) => {
                        const d = data[j];
                        const label = MON[s.month - 1];
                        const long = `${MON_LONG[s.month - 1]} ${s.year}`;
                        const isSel = j === sel;
                        return (
                          <button
                            key={j}
                            type="button"
                            onClick={() => {
                              setPicked(j);
                              setFilter("");
                            }}
                            aria-pressed={isSel}
                            aria-label={d ? `${long}: ${d.percent}% attendance` : `${long}: Not yet`}
                            className="group relative flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-end gap-1 border-none bg-transparent p-0"
                          >
                            <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[2] -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-k5-ink px-2.5 py-1 text-[13px] font-black text-k5-card opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                              {long}: {d ? `${d.percent}%` : "Not yet"}
                            </span>
                            <span className={`text-[13px] font-black text-k5-ink ${d && isSel ? "opacity-100" : "opacity-0"}`}>{d ? `${d.percent}%` : ""}</span>
                            <span
                              className={`w-[min(34px,78%)] rounded-t-lg box-border transition-[height] ${d ? "bg-k5-ac" : "border-2 border-dashed border-k5-line bg-k5-soft"} ${d && !isSel ? "opacity-[0.42]" : ""}`}
                              style={{ height: d ? `${d.percent}%` : "8px" }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <span />
                  <div aria-hidden="true" className="flex gap-1">
                    {slots.map((s, j) => (
                      <span key={j} className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap text-center text-[13px] ${j === sel ? "font-black text-k5-ink" : "font-bold text-k5-mut"}`}>{MON[s.month - 1]}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section aria-labelledby="k5-at-sum" className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-[18px]`}>
              <div className="flex flex-col gap-0.5">
                <h2 id="k5-at-sum" className="m-0 font-k5-display text-2xl font-semibold">Monthly Summary</h2>
                <span className="text-[15px] font-black text-k5-acx">{monthLong}</span>
              </div>
              {cur ? (
                <>
                  <div className="flex flex-wrap items-center gap-[18px]">
                    <div className="relative h-[160px] w-[160px] flex-none">
                      <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label={`You came to ${cur.total - cur.absent} of ${cur.total} classes.`}>
                        <circle cx="80" cy="80" r={R} fill="none" strokeWidth="20" style={{ stroke: "var(--k5-soft)" }} />
                        {slices.map((s) => (
                          <circle
                            key={s.k}
                            cx="80"
                            cy="80"
                            r={R}
                            fill="none"
                            stroke={s.c}
                            strokeWidth={s.sw}
                            strokeDasharray={s.dash}
                            strokeDashoffset={s.off}
                            transform="rotate(-90 80 80)"
                            onClick={() => toggleFilter(s.k)}
                            style={{ opacity: s.op, cursor: "pointer" }}
                          >
                            <title>{`${LABEL[s.k]}: ${s.count}`}</title>
                          </circle>
                        ))}
                      </svg>
                      <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="font-k5-display text-[34px] font-bold leading-none">{filter ? { present: cur.present, late: cur.late, absent: cur.absent, missS: cur.absent, missT: 0 }[filter] : cur.total}</span>
                        <span className="text-xs font-black text-k5-mut">{filter ? LABEL[filter] : "classes"}</span>
                      </span>
                    </div>
                    <ul className="m-0 flex flex-[1_1_150px] list-none flex-col gap-2 p-0">
                      {[["present", cur.present], ["late", cur.late], ["absent", cur.absent]].map(([k, count]) => {
                        const on = filter === k;
                        return (
                          <li key={k}>
                            <button
                              type="button"
                              onClick={() => toggleFilter(k)}
                              aria-pressed={on}
                              className="flex w-full cursor-pointer items-center gap-2.5 rounded-full border-[3px] py-1.5 pe-2.5 ps-1.5 text-start text-k5-ink"
                              style={{ borderColor: on ? AC[k] : "transparent", background: on ? ATB[k] : "transparent" }}
                            >
                              <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full" style={{ background: AC[k] }}>
                                {k === "present" && (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                                )}
                                {k === "late" && (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A2A00" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>
                                )}
                                {k === "absent" && (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                                )}
                              </span>
                              <span className="flex-1 text-base font-extrabold">{LABEL[k]}</span>
                              <span className="font-k5-display text-[22px] font-bold">{count}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="flex items-center gap-3.5 rounded-[20px] border-[3px] px-3.5 py-3" style={{ background: badge.bg, borderColor: badge.c2 }}>
                    <Medal b={badge} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="self-start rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-[0.04em] text-white" style={{ background: badge.c2 }}>{badge.name}</span>
                      <span className="font-k5-display text-[19px] font-semibold leading-[1.2]">{badge.msg}</span>
                      <span className="text-[15px] font-extrabold text-k5-mut">You came to {cur.total - cur.absent} of {cur.total} classes.</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[20px] bg-k5-soft px-4 py-[30px] text-center font-k5-display text-[19px] font-semibold text-k5-mut">Not yet · No classes this month.</div>
              )}
            </section>
          </div>

          <K5AttendanceDetails status={filter} onStatusChange={setFilter} />
        </>
      )}
    </div>
  );
}
