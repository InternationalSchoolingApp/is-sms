"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { getProgressReportGradeHistory } from "@/services/dashboardApi";
import { resolveTimeZone } from "@/utils/attendanceDates";
import { getBrowserTimezone } from "@/utils/calendarEvents";
import { asArray, courseTone, fmtShort, num, paceInfo } from "@/components/k5/pages/k5PerformanceData";
import { teacherName } from "@/components/k5/pages/K5PerformanceCourseList";
import { BackIcon, CloseIcon, EyeIcon, HistoryIcon, PaceIcon, SmallFlame, TickIcon } from "@/components/k5/pages/K5PerformanceIcons";
import { K5Loading, K5RowsSkeleton } from "@/components/k5/K5Skeletons";

const HEAD = "px-3.5 py-3 font-k5-display text-[15px] font-semibold";
const STAT_COLS = [
  ["total", "Total Assignments"],
  ["excused", "Excused"],
  ["submitted", "Submitted"],
  ["upcoming", "Upcoming"],
  ["missed", "Missed"],
  ["passed", "Passed"],
  ["failed", "Failed"],
  ["before", "Submitted BEFORE TIME"],
  ["onTime", "Submitted ON TIME"],
  ["late", "Submitted LATE"],
];
const ACT_GRID = { gridTemplateColumns: "2.4fr 1.1fr 1.1fr 1fr 1fr .8fr .7fr 1fr .6fr" };

function Bar({ pct, col, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[15px] font-extrabold">
      <span className="relative box-border block h-3.5 w-[290px] max-w-full overflow-hidden rounded-full border-2 border-k5-line bg-k5-soft">
        <span className="block h-full rounded-full transition-[width] duration-400" style={{ width: `${Math.min(100, pct)}%`, background: col }} />
      </span>
      <span>{children}</span>
    </div>
  );
}

const hms = (sec) => {
  const s = num(sec);
  if (s == null) return "—";
  const t = Math.round(s);
  return `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** Mockup "Grade History" dialog: every attempt at one assignment. */
function GradeHistory({ act, enrollId, onClose }) {
  const { context } = useDashboardContext();
  const { schoolUUID, uniqueId, userId } = context ?? {};
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID, userId });
  const timeZone = resolveTimeZone(dummy.enabled ? getBrowserTimezone() : dashboardData.userTimezone);
  const { data, isLoading } = useQuery({
    queryKey: ["progress-report-grade-history", schoolUUID, act.id, enrollId, dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.academicGradeHistory(act.id) : getProgressReportGradeHistory({ schoolUUID, uniqueId, itemId: act.id, enrollId })),
    enabled: Boolean(schoolUUID && uniqueId && act.id && enrollId && dummy.settled),
  });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Teacher-entered grades and plain activity records come back without attempts / seconds (and sometimes
  // without any date but modifieddate); those cells show "—" rather than a made-up 0.
  const rows = asArray(data?.response?.grades?.grade).map((g) => {
    const when = g.scoreddate || g.submitteddate || g.lastactivitydate || g.modifieddate || null;
    const parsed = when ? new Date(when).getTime() : NaN;
    const t = Number.isNaN(parsed) ? 0 : parsed;
    const achieved = num(g.achieved);
    const possible = num(g.possible);
    const pct = achieved == null ? null : num(g.percent);
    const expTime = String(g.expTime || "").trim();
    return {
      t,
      date: t ? new Date(t).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone }) : when || "—",
      visits: g.attempts || "—",
      time: num(g.seconds) != null ? hms(g.seconds) : expTime || "—",
      pts: possible != null && possible > 1 && achieved != null ? `${achieved} / ${possible}` : "",
      pct: pct == null ? "—" : `${pct}%`,
      pass: pct != null && (g.passing != null ? Boolean(g.passing) : pct > 70),
      by: [g.user?.firstname, g.user?.lastname].filter(Boolean).join(" ") || "—",
    };
  });
  const latest = rows.reduce((a, r) => Math.max(a, r.t), 0);

  return (
    <div className="fixed inset-0 z-[88] box-border flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-pointer border-none bg-[rgba(10,16,34,0.55)] p-0" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="k5-gh-title"
        className="relative box-border flex max-h-full w-[980px] max-w-full flex-col gap-4 overflow-y-auto rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-[22px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)]"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl bg-k5-act text-k5-acx">
            <HistoryIcon />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="k5-gh-title" className="m-0 font-k5-display text-[26px] font-semibold leading-tight">Grade History</h2>
            <p className="m-0 mt-0.5 text-[15px] font-extrabold text-k5-mut [overflow-wrap:anywhere]">{act.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card p-0 text-k5-ink">
            <CloseIcon />
          </button>
        </div>
        <div className="k5-bdwrap overflow-hidden rounded-[18px] border-[3px] border-k5-line">
          <div role="table" aria-label="Grade History" className="k5-bdtbl text-[15px] font-extrabold">
            <div role="row" className="k5-bdhead grid grid-cols-5 bg-k5-ac text-white">
              {["Date", "Visits", "Time", "Score", "By"].map((h) => (
                <span key={h} role="columnheader" className={HEAD}>{h}</span>
              ))}
            </div>
            {isLoading ? (
              <K5Loading label="Loading the attempts" className="">
                <K5RowsSkeleton rows={3} cols={5} />
              </K5Loading>
            ) : !rows.length ? (
              <p className="m-0 p-5 text-center text-k5-mut">No attempts yet.</p>
            ) : (
              rows.map((r, i) => (
                <div key={i} role="row" className="k5-bdrow grid grid-cols-5 border-t-2 border-k5-line" style={{ background: i % 2 ? "var(--k5-card)" : "var(--k5-soft)" }}>
                  <span role="cell" data-l="Date" className="flex flex-wrap items-center gap-2 px-3.5 py-3">
                    {r.date}
                    {r.t > 0 && r.t === latest && rows.length > 1 && (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-black" style={{ background: "var(--k5-gT)", color: "var(--k5-gX)" }}>Latest</span>
                    )}
                  </span>
                  <span role="cell" data-l="Visits" className="px-3.5 py-3">{r.visits}</span>
                  <span role="cell" data-l="Time" className="px-3.5 py-3">{r.time}</span>
                  <span role="cell" data-l="Score" className="px-3.5 py-3">
                    {r.pts} <span className="font-black" style={{ color: r.pct === "—" ? "var(--k5-mut)" : r.pass ? "var(--k5-gX)" : "var(--k5-rI)" }}>{r.pct}</span>
                  </span>
                  <span role="cell" data-l="By" className="px-3.5 py-3">{r.by}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[46px] cursor-pointer items-center rounded-full border-[3px] border-k5-line bg-k5-card px-[18px] font-k5-display text-[17px] font-semibold text-k5-ink shadow-[0_4px_0_var(--k5-line)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// "Late by 3 days" for an assignment handed in after its due date (legacy late time on a submitted activity).
function lateText(a) {
  if (a.status !== "late" || !a.due || !a.submitted) return "";
  const days = differenceInCalendarDays(parseISO(a.submitted), parseISO(a.due));
  return days > 0 ? `Late by ${days} day${days === 1 ? "" : "s"}` : "";
}

// Submission status (API Formula Reference, Shared calculations §1) as a chip.
const STATUS = {
  before_time: { label: "Before time", bg: "var(--k5-gT)", fg: "var(--k5-gX)" },
  on_time: { label: "On time", bg: "var(--k5-gT)", fg: "var(--k5-gX)" },
  late: { label: "Late", bg: "var(--k5-oT)", fg: "var(--k5-oI)" },
  missed: { label: "Missed", bg: "var(--k5-rT)", fg: "var(--k5-rI)" },
  upcoming: { label: "Upcoming", bg: "var(--k5-bT)", fg: "var(--k5-bI)" },
  excused: { label: "Excused", bg: "var(--k5-soft)", fg: "var(--k5-mut)" },
};

/** Mockup course view (pmCv): course facts, pace and streak, the assignment counts and every assignment. */
export function K5PerformanceCourseView({ course, index, onBack }) {
  const [ghAct, setGhAct] = useState(null);
  const tone = courseTone(course, index);
  const pace = paceInfo(course);
  const streak = course.streak || 0;
  const scored = Boolean(course.hasScore);
  const acts = asArray(course.activities);
  const st = course.summary || {};
  const back = (e) => {
    e?.preventDefault();
    onBack();
  };

  return (
    <div className="k5-pmpanel flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-extrabold text-k5-mut">
            <a href="#" onClick={back} className="font-black text-k5-acx no-underline">My Performance</a> / {course.courseName}
          </span>
          <h1 className="m-0 font-k5-display text-[32px] font-semibold leading-tight">{course.courseName}</h1>
        </div>
        <button
          type="button"
          onClick={back}
          className="flex min-h-[46px] cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-line bg-k5-card pe-[18px] ps-3 font-k5-display text-[17px] font-semibold text-k5-ink shadow-[0_4px_0_var(--k5-line)]"
        >
          <BackIcon />
          Back
        </button>
      </div>

      <section className={`${K5_CARD} flex flex-col gap-[18px] px-[22px] py-5`} style={{ borderTop: `8px solid ${tone.col}` }}>
        <div className="flex flex-wrap gap-6">
          <div className="grid flex-[999_1_360px] content-start gap-2 text-base font-extrabold">
            <div><b className="font-black">Course:</b> {course.courseName || "N/A"}</div>
            <div><b className="font-black">Teacher:</b> {teacherName(course)}</div>
            <div><b className="font-black">Current Overall Score:</b> {scored ? `${Number(course.score).toFixed(2)}%` : "No score yet"}</div>
            <div><b className="font-black">Current Overall Grade:</b> {scored ? course.grade || "N/A" : "No score yet"}</div>
            <div><b className="font-black">Remaining Days:</b> {course.daysLeft ?? "N/A"}</div>
            <div><b className="font-black">Duration:</b> {course.startDate && course.endDate ? `${fmtShort(course.startDate)} - ${fmtShort(course.endDate)}` : "N/A"}</div>
            <div className="mt-1.5 grid gap-2.5">
              {course.countable > 0 ? (
                <Bar pct={num(course.progress) ?? 0} col={tone.col}>
                  {`${(num(course.progress) ?? 0).toFixed(2)}% of gradable activities completed (${course.submitted} of ${course.countable})`}
                </Bar>
              ) : (
                acts.length > 0 && <span className="text-k5-mut">No assignments to complete</span>
              )}
              {/* Legacy second bar (studentAcademicPerformanceContent.js): every activity of the course, not only the gradable ones. */}
              {num(course.allProgress) != null && course.allTotal > 0 && (
                <Bar pct={num(course.allProgress)} col={tone.col}>
                  {`${num(course.allProgress).toFixed(2)}% of all activities completed (${course.allDone ?? 0} of ${course.allTotal})`}
                </Bar>
              )}
            </div>
          </div>
          <div className="flex flex-[1_1_280px] flex-col gap-2.5">
            <div className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-base font-black" style={{ background: pace.bg, color: pace.fg }}>
              <PaceIcon pace={pace.key} size={24} />
              {pace.text}
            </div>
            <div className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-extrabold" style={{ background: streak ? "var(--k5-oT)" : "var(--k5-soft)", color: streak ? "var(--k5-oI)" : "var(--k5-mut)" }}>
              <span className="k5h-r8 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-k5-card">
                <SmallFlame on={streak > 0} />
              </span>
              <span>
                {streak > 1 ? (
                  <b className="font-black">{streak} on-time submissions in a row</b>
                ) : streak === 1 ? (
                  <b className="font-black">1 on-time submission in a row</b>
                ) : (
                  <>
                    <b className="font-black">No streak yet</b> — submit your next activity on time to start one.
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        {acts.length > 0 && (
          <div className="k5-bdwrap overflow-x-auto rounded-[18px] border-[3px] border-k5-line bg-k5-card">
            <div role="table" aria-label="Assignment counts" className="k5-bdtbl min-w-[1000px] text-[15px] font-extrabold">
              <div role="row" className="k5-bdhead grid grid-cols-10 bg-k5-ac text-white">
                {STAT_COLS.map(([, label]) => (
                  <span key={label} role="columnheader" className={HEAD}>{label}</span>
                ))}
              </div>
              <div role="row" className="k5-bdrow grid grid-cols-10 items-center">
                {STAT_COLS.map(([key, label]) => (
                  <span key={key} role="cell" data-l={label} className="px-3.5 py-3 font-k5-display text-xl font-semibold">{st[key] ?? 0}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {!acts.length ? (
        <section className={`${K5_CARD} p-[30px] text-center text-[17px] font-extrabold text-k5-mut`}>Assignments will appear after the next daily update.</section>
      ) : (
        <section className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
          <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">Assignments</h2>
          <div className="k5-bdwrap overflow-x-auto rounded-[18px] border-[3px] border-k5-line bg-k5-card">
            <div role="table" aria-label="Assignments" className="k5-bdtbl min-w-[1100px] text-[15px] font-extrabold">
              <div role="row" className="k5-bdhead grid bg-k5-ac text-white" style={ACT_GRID}>
                {["Activity Name", "Due Date", "Submitted Date", "Time Spent (hh:mm:ss)", "Submitted Status", "Score", "Grade", "Detailed Assignment Status", "Status"].map((h) => (
                  <span key={h} role="columnheader" className={HEAD}>{h}</span>
                ))}
              </div>
              {acts.map((a, i) => {
                const s = STATUS[a.status] || STATUS.upcoming;
                const scoreTx = a.score == null ? "" : `${Number(a.score)}%`;
                return (
                  <div key={a.itemId || i} role="row" className="k5-bdrow grid items-center border-t-2 border-k5-line" style={{ ...ACT_GRID, background: i % 2 ? "var(--k5-card)" : "var(--k5-soft)" }}>
                    <span role="cell" data-l="Activity Name" className="k5-bdwide px-3.5 py-3">{a.fullTitle || a.title}</span>
                    <span role="cell" data-l="Due Date" className="px-3.5 py-3">{a.due ? fmtShort(a.due) : "N/A"}</span>
                    <span role="cell" data-l="Submitted Date" className="px-3.5 py-3">{a.submitted ? fmtShort(a.submitted) : "N/A"}</span>
                    <span role="cell" data-l="Time Spent (hh:mm:ss)" className="px-3.5 py-3 font-mono">{a.timeSpent || "N/A"}</span>
                    <span role="cell" data-l="Submitted Status" className="px-3.5 py-3">
                      <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-black" style={{ background: s.bg, color: s.fg }}>{s.label}</span>
                      {lateText(a) && <small className="mt-1 block text-[13px] font-extrabold text-k5-mut">{lateText(a)}</small>}
                    </span>
                    <span role="cell" data-l="Score" className="px-3.5 py-3 font-black" style={{ color: a.score == null ? undefined : a.passed ? "var(--k5-gX)" : "var(--k5-rI)" }}>{scoreTx}</span>
                    <span role="cell" data-l="Grade" className="px-3.5 py-3 font-black">{a.score == null ? "" : a.grade || ""}</span>
                    <span role="cell" data-l="Detailed Assignment Status" className="px-3.5 py-3">
                      {a.score != null && (
                        <a
                          href="#"
                          aria-haspopup="dialog"
                          onClick={(e) => {
                            e.preventDefault();
                            setGhAct({ id: a.itemId, name: a.fullTitle || a.title });
                          }}
                          className="inline-flex items-center gap-1.5 font-black text-k5-acx no-underline"
                        >
                          <EyeIcon />
                          View
                        </a>
                      )}
                    </span>
                    <span role="cell" data-l="Status" className="px-3.5 py-3 text-k5-grn">
                      {a.done && (
                        <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full" style={{ background: "var(--k5-gT)" }} aria-label="Done">
                          <TickIcon />
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {ghAct && <GradeHistory act={ghAct} enrollId={course.lmsEnrollmentId} onClose={() => setGhAct(null)} />}
    </div>
  );
}
