"use client";

import { CalendarDays } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { GRADING_SYSTEM, assetUrl, orNA, useProgressReport, useReportDownload } from "@/components/student/ProgressReportView";
import { courseTone, num } from "@/components/k5/pages/k5PerformanceData";
import { BackIcon } from "@/components/k5/pages/K5PerformanceIcons";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";

const HEAD = "p-3 font-k5-display text-[15px] font-semibold";
const ACT_GRID = { gridTemplateColumns: "1fr .9fr 2.2fr 1fr 1.1fr 1.1fr 1fr .8fr" };
const ACT_GRID_NO_MODULE = { gridTemplateColumns: ".9fr 2.2fr 1fr 1.1fr 1.1fr 1fr .8fr" };

// Grade letters take the mockup's tint pairs (A green, B blue, C yellow, D orange, F red).
function gradeTone(letter) {
  const g = String(letter || "").trim().toUpperCase().charAt(0);
  if (g === "A") return { bg: "var(--k5-gT)", fg: "var(--k5-gX)" };
  if (g === "B") return { bg: "var(--k5-bT)", fg: "var(--k5-bI)" };
  if (g === "C") return { bg: "var(--k5-yT)", fg: "var(--k5-yX)" };
  if (g === "D") return { bg: "var(--k5-oT)", fg: "var(--k5-oI)" };
  if (g === "F") return { bg: "#D7263D", fg: "#FFFFFF" };
  return { bg: "var(--k5-soft)", fg: "var(--k5-mut)" };
}

function typeTone(type) {
  const t = String(type || "").toUpperCase();
  if (t.startsWith("QUIZ")) return { bg: "var(--k5-bT)", fg: "var(--k5-bI)" };
  if (t.startsWith("ASSIGNMENT")) return { bg: "var(--k5-oT)", fg: "var(--k5-oI)" };
  if (t.startsWith("LESSON")) return { bg: "var(--k5-gT)", fg: "var(--k5-gX)" };
  return { bg: "var(--k5-soft)", fg: "var(--k5-mut)" };
}

// Legacy colorScoreText: red below passing, amber close to it; otherwise the grade's own colour.
function scoreColor(item) {
  const cls = String(item.colorScoreText || "");
  if (cls.includes("danger")) return "var(--k5-red)";
  if (cls.includes("warning")) return "var(--k5-oI)";
  return item.letter ? gradeTone(item.letter).fg : "var(--k5-ink)";
}

const valueOf = (v) => (v && v !== "null" ? v : "");

/** "Elementary Language Arts Grade 5 v22 (GS) IS-ORG 541 (1.0 Credit)" -> name + "1.0 Credit". */
function splitTitle(title) {
  const t = valueOf(title);
  const m = /\s*\(([\d.]+\s*Credits?)\)\s*$/i.exec(t);
  return m ? { name: t.slice(0, m.index), credit: m[1] } : { name: t, credit: "" };
}

function Kv({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t-2 border-k5-line px-3.5 py-[9px] text-[15px] font-extrabold first:border-t-0">
      <span className="whitespace-nowrap font-black text-k5-mut">{label}:</span>
      <b className="min-w-0 font-black [overflow-wrap:anywhere]">{children}</b>
    </div>
  );
}

function CourseReport({ enrollment, report, index }) {
  const grades = enrollment.grades ?? {};
  const items = (grades.items?.item ?? []).filter((item) => item.unitTitle);
  const showModule = !grades.unitStatus;
  const { name, credit } = splitTitle(enrollment.entity?.title);
  const tone = courseTone({ courseName: name }, index);
  const grid = showModule ? ACT_GRID : ACT_GRID_NO_MODULE;
  const comp = num(grades.complete) ?? 0;
  const courseTone2 = gradeTone(grades.letter);
  const { isMiddle } = useDashboardContext();
  const teacher = valueOf(enrollment.teacherName);

  return (
    <section className={`${K5_CARD} flex flex-col gap-4 px-[22px] py-5`} style={{ borderTop: `8px solid ${tone.col}` }}>
      <div className="flex flex-wrap items-center gap-3.5 rounded-[18px] px-4 py-3.5" style={{ background: tone.lt }}>
        <span aria-hidden="true" className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl text-white" style={{ background: tone.col }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
            <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
          <span className="text-[13px] font-black uppercase tracking-[.08em] text-k5-mut">Course</span>
          <b className="font-k5-display text-2xl font-semibold leading-tight text-k5-ink">{name || "N/A"}</b>
          {isMiddle && (
            <span className="text-[15px] font-extrabold text-k5-mut">
              Teacher Name: <b className="font-black text-k5-ink">{orNA(teacher)}</b>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {[valueOf(report.standardName), credit].filter(Boolean).map((chip) => (
            <span key={chip} className="whitespace-nowrap rounded-full border-2 bg-k5-card px-3 py-1 text-sm font-black" style={{ borderColor: tone.col }}>
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-0.5 text-center">
        <h2 className="m-0 font-k5-display text-[26px] font-semibold uppercase tracking-[.02em] text-k5-acx">Detailed Student Grading Report</h2>
        <span className="font-k5-display text-lg font-semibold uppercase">
          Duration: {report.reportStartDate} - {report.reportEndDate}
        </span>
      </div>

      <div className="k5-bdwrap overflow-x-auto rounded-[18px] border-[3px] border-k5-line bg-k5-card">
        <div role="table" aria-label={name} className="k5-bdtbl min-w-[980px] text-[15px] font-extrabold">
          <div role="row" className="k5-bdhead grid text-k5-ink" style={{ ...grid, background: tone.lt }}>
            {[showModule && "Module | Activity", "Type", "Activity Name", "Time Spent (hh:mm:ss)", "Target Due Date", "Submitted Date", "Percentage", "Grade"]
              .filter(Boolean)
              .map((h) => (
                <span key={h} role="columnheader" className={HEAD}>{h}</span>
              ))}
          </div>
          {!items.length && <p className="m-0 p-5 text-center text-k5-mut">No activities in this period.</p>}
          {items.map((item, i) => {
            const tt = typeTone(item.unitType);
            const gt = gradeTone(item.letter);
            return (
              <div key={item.itemid || i} role="row" className="k5-bdrow grid items-center border-t-2 border-k5-line" style={grid}>
                {showModule && <span role="cell" data-l="Module | Activity" className="px-3 py-[11px]">{orNA(item.unit)}</span>}
                <span role="cell" data-l="Type" className="px-3 py-[11px]">
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-black tracking-[.04em]" style={{ background: tt.bg, color: tt.fg }}>{orNA(item.unitType)}</span>
                </span>
                <span role="cell" data-l="Activity Name" className="k5-bdwide px-3 py-[11px]">{String(item.unitTitle).trim()}</span>
                <span role="cell" data-l="Time Spent (hh:mm:ss)" className="px-3 py-[11px] font-mono">{orNA(item.unitTimeSpent)}</span>
                <span role="cell" data-l="Target Due Date" className="px-3 py-[11px]">{orNA(item.duedate)}</span>
                <span role="cell" data-l="Submitted Date" className="px-3 py-[11px]">{orNA(item.submitteddate)}</span>
                <span role="cell" data-l="Percentage" className="px-3 py-[11px] font-black" style={{ color: scoreColor(item) }}>{orNA(item.unitPercent)}</span>
                <span role="cell" data-l="Grade" className="px-3 py-[11px]">
                  {item.letter ? (
                    <span className="inline-block rounded-[10px] px-2.5 py-0.5 font-black" style={{ background: gt.bg, color: gt.fg }}>{item.letter}</span>
                  ) : (
                    "N/A"
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <span className="text-[13px] font-black text-k5-mut">*N/A - Not Available</span>

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-3.5 max-[760px]:grid-cols-1">
        <div className="flex flex-col overflow-hidden rounded-2xl border-[3px] border-k5-line text-center">
          {[
            ["Total Activity Time", orNA(grades.totalDays)],
            ["Number of Activities - Submitted & Graded", orNA(grades.submiteActivityGrade)],
            ["Number of Activities - Waiting for the Grade", orNA(grades.activityWaitingForGrade)],
            ["Number of Activities - Not Submitted", orNA(grades.activityNotSubmited)],
          ].map(([label, value]) => (
            <div key={label} className="border-t-2 border-k5-line px-3.5 py-[9px] text-[15px] font-extrabold first:border-t-0">
              {label}: <b className="font-black">{value}</b>
            </div>
          ))}
          <div className="border-t-2 border-k5-line px-3.5 py-[9px] text-[15px] font-extrabold">
            Last Submission Date: <b className="font-black">{orNA(grades.lastSubmissionDate)}</b> | Activity Name: <b className="font-black">{orNA(grades.lastsubmissionName)}</b>
          </div>
        </div>
        <div className="flex flex-col overflow-hidden rounded-2xl border-[3px] border-k5-line">
          <div className="flex items-center justify-between gap-2 px-3.5 py-[9px] text-[15px] font-extrabold">
            <span className="font-black text-k5-mut">Course Grade:</span>
            <b className="rounded-[10px] px-3 font-k5-display text-[22px] font-semibold" style={{ background: courseTone2.bg, color: courseTone2.fg }}>{orNA(grades.letter)}</b>
          </div>
          <div className="flex items-center justify-between gap-2 border-t-2 border-k5-line px-3.5 py-[9px] text-[15px] font-extrabold">
            <span className="font-black text-k5-mut">Current Overall Percentage:</span>
            <b className="font-black">{orNA(grades.percentage)}</b>
          </div>
          {report.subReportType === "weekly" && (
            <div className="flex items-center justify-between gap-2 border-t-2 border-k5-line px-3.5 py-[9px] text-[15px] font-extrabold">
              <span className="font-black text-k5-mut">Current Week Percentage:</span>
              <b className="font-black">{orNA(grades.percentWeekly)}</b>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-k5-line px-3.5 py-[9px] text-[15px] font-extrabold">
            <span className="font-black text-k5-mut">Course Completion Percentage:</span>
            <b className="font-black">{orNA(grades.complete)}</b>
            <span className="block h-2.5 flex-[1_1_100%] overflow-hidden rounded-full border-2 border-k5-line bg-k5-soft">
              <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, comp))}%`, background: tone.col }} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Progress Report while it loads: title bar, date search, student card and one course report (header, table, totals). */
function ReportSkeleton() {
  return (
    <K5Loading label="Getting your report ready" className="k5-pr-page flex flex-col gap-[18px]">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-3.5 px-5 py-4`}>
        <K5Sk className="h-12 w-28 rounded-full" />
        <K5Sk className="h-8 w-80 max-w-full" />
      </div>
      <div className={`${K5_CARD} flex flex-wrap items-end gap-3 px-[18px] py-3.5`}>
        <K5Sk className="h-[50px] w-[220px] rounded-[14px]" />
        <K5Sk className="h-[50px] w-[220px] rounded-[14px]" />
        <K5Sk className="h-[50px] w-24 rounded-full" />
        <K5Sk className="ms-auto h-12 w-36 rounded-full" />
      </div>
      <div className={`${K5_CARD} flex flex-col gap-4 px-[22px] py-5`}>
        <K5Sk className="h-[50px] w-[220px]" />
        <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1">
          {Array.from({ length: 2 }, (_, c) => (
            <div key={c} className="flex flex-col overflow-hidden rounded-2xl border-[3px] border-k5-line">
              {Array.from({ length: c ? 4 : 3 }, (_, r) => (
                <div key={r} className="flex items-center gap-2 border-t-2 border-k5-line px-3.5 py-[9px] first:border-t-0">
                  <K5Sk className="h-4 w-32" />
                  <K5Sk className="h-4 w-28" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={`${K5_CARD} flex flex-col gap-4 px-[22px] py-5`}>
        <div className="flex flex-wrap items-center gap-3.5 rounded-[18px] bg-k5-soft px-4 py-3.5">
          <K5Sk className="h-[52px] w-[52px] flex-none rounded-2xl" />
          <span className="flex flex-[1_1_220px] flex-col gap-2">
            <K5Sk className="h-3.5 w-16" />
            <K5Sk className="h-6 w-72 max-w-full" />
          </span>
          <K5Sk className="h-7 w-24 rounded-full" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <K5Sk className="h-7 w-80 max-w-full" />
          <K5Sk className="h-5 w-56" />
        </div>
        <div className="overflow-hidden rounded-[18px] border-[3px] border-k5-line">
          <div className="h-12 bg-k5-soft" />
          {Array.from({ length: 4 }, (_, r) => (
            <div key={r} className="grid grid-cols-6 items-center gap-4 border-t-2 border-k5-line px-3 py-3">
              {Array.from({ length: 6 }, (_, c) => (
                <K5Sk key={c} className={`h-4 ${c === 2 ? "w-full" : "w-4/5"}`} />
              ))}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-3.5 max-[760px]:grid-cols-1">
          <K5Sk className="h-40 rounded-2xl" />
          <K5Sk className="h-40 rounded-2xl" />
        </div>
      </div>
    </K5Loading>
  );
}

/** K–5 look of a Progress Report (Playful.dc.html progrep detail), same data and date search as ProgressReportView. */
export function K5ProgressReportView({ url, onBack }) {
  const { context, logoUrl } = useDashboardContext();
  const { isLoading, report, startdate, enddate, setStartdate, setEnddate, search, error, enrollments, unsupported } = useProgressReport(url);
  const { preparing, download } = useReportDownload(report?.downloadUrl, "k5");
  const first = enrollments[0];
  const ready = !isLoading && report?.status === "SUCCESS" && !report.reportMessage && !unsupported;

  if (isLoading) return <ReportSkeleton />;

  return (
    <div className="k5-pmpanel k5-pr-page flex flex-col gap-[18px]">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-3.5 px-5 py-4`}>
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-line bg-k5-card pe-[18px] ps-3 font-k5-display text-[17px] font-semibold text-k5-ink shadow-[0_4px_0_var(--k5-line)]"
        >
          <BackIcon />
          Back
        </button>
        <h1 className="m-0 min-w-0 flex-[1_1_260px] font-k5-display text-[28px] font-semibold leading-tight">
          Grade book summary{report?.studentName ? ` | ${report.studentName}` : ""}
        </h1>
      </div>

      <div className={`${K5_CARD} flex flex-col gap-2 px-[18px] py-3.5`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-[0_1_220px] max-[760px]:flex-[1_1_100%]">
            <DatePicker icon={CalendarDays} label="Due Start Date" value={startdate} onChange={setStartdate} height="h-[50px]" />
          </div>
          <div className="flex-[0_1_220px] max-[760px]:flex-[1_1_100%]">
            <DatePicker icon={CalendarDays} label="Due End Date" value={enddate} onChange={setEnddate} height="h-[50px]" />
          </div>
          <button
            type="button"
            onClick={search}
            disabled={isLoading}
            className="min-h-[50px] cursor-pointer rounded-full border-none bg-[#13803F] px-[18px] font-k5-display text-base font-semibold text-white shadow-[0_4px_0_#0B5A2B] disabled:cursor-default disabled:opacity-60"
          >
            Search
          </button>
          {report?.downloadUrl && (
            <button
              type="button"
              onClick={download}
              disabled={preparing}
              aria-busy={preparing}
              className="ms-auto flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-ac bg-k5-ac px-[18px] font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] disabled:cursor-wait disabled:opacity-80 max-[760px]:ms-0 max-[760px]:flex-[1_1_100%] max-[760px]:justify-center"
            >
              {preparing ? (
                <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />
                </svg>
              )}
              {preparing ? "Preparing…" : "Download"}
            </button>
          )}
        </div>
        {error && <p className="m-0 text-sm font-extrabold text-k5-ri">{error}</p>}
      </div>

      {!ready ? (
        <section className={`${K5_CARD} p-[30px] text-center text-[17px] font-extrabold text-k5-mut`}>
          {unsupported ? "This report type is not available here yet." : report?.reportMessage || "Unable to load progress report detail."}
        </section>
      ) : (
        <>
          <section aria-label="Student" className={`${K5_CARD} flex flex-col gap-4 px-[22px] py-5`}>
            {logoUrl ? (
              <OptimizedImage src={logoUrl} alt={context?.schoolName || "School logo"} width={260} height={60} className="h-auto w-full max-w-[260px]" />
            ) : (
              context?.schoolName && <b className="font-k5-display text-[22px] font-semibold text-k5-brand">{context.schoolName}</b>
            )}
            <div className="grid grid-cols-2 gap-3.5 max-[760px]:grid-cols-1">
              <div className="flex flex-col overflow-hidden rounded-2xl border-[3px] border-k5-line">
                <Kv label="Student Name">{orNA(report.studentName)}</Kv>
                <Kv label="Grade">{orNA(report.standardName)}</Kv>
                <Kv label="Student ID"><span className="font-mono">{orNA(report.rollNumber)}</span></Kv>
              </div>
              <div className="flex flex-col overflow-hidden rounded-2xl border-[3px] border-k5-line">
                <Kv label="Academic Year Start Date">{orNA(first?.startdate)}</Kv>
                <Kv label="Academic Year End Date">{orNA(first?.enddate)}</Kv>
                <Kv label="Country">{orNA(report.country)}</Kv>
                <Kv label="Teacher Name">{orNA(valueOf(first?.teacherName))}</Kv>
              </div>
            </div>
          </section>

          {!enrollments.length && (
            <section className={`${K5_CARD} p-[30px] text-center text-[17px] font-extrabold text-k5-mut`}>No activities in this period.</section>
          )}
          {enrollments.map((enrollment, i) => (
            <CourseReport key={enrollment.id || i} enrollment={enrollment} report={report} index={i} />
          ))}

          <section className={`${K5_CARD} flex flex-wrap items-center justify-between gap-6 px-[22px] py-5`}>
            <div className="flex flex-col items-center gap-1">
              <span role="img" aria-label="School Official" className="relative block h-40 w-[190px] flex-none rounded-[22px] bg-white">
                <OptimizedImage src={assetUrl("is-stamp.png")} alt="" width={132} height={135} className="absolute left-3 top-3 h-auto w-[132px] -rotate-6 opacity-90" />
                <OptimizedImage src={assetUrl("signature-report.png")} alt="" width={120} height={117} className="absolute right-1.5 top-[22px] h-auto w-[120px]" />
              </span>
              <span className="text-sm font-black text-k5-mut">School Official</span>
            </div>
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-2">
              <b className="text-center font-k5-display text-lg font-semibold">Grading System</b>
              <div role="table" aria-label="Grading System" className="flex flex-col overflow-hidden overflow-x-auto rounded-[14px] border-[3px] border-k5-line">
                {[
                  ["Grade", (g) => g[0]],
                  ["Percentage", (g) => g[1]],
                ].map(([label, pick], r) => (
                  <div key={label} role="row" className={`grid min-w-[820px] grid-cols-[110px_repeat(13,minmax(54px,1fr))] ${r ? "border-t-2 border-k5-line" : ""}`}>
                    <span role="rowheader" className="bg-k5-soft px-3 py-2 text-[13px] font-black">{label}</span>
                    {GRADING_SYSTEM.map((g) => {
                      const tone = gradeTone(g[0]);
                      const isF = g[0] === "F";
                      const style = r === 0 ? { background: tone.bg, color: tone.fg } : isF ? { background: "#FDECEC", color: "#D7263D" } : undefined;
                      return (
                        <span key={g[0]} role="cell" className="border-s-2 border-k5-line px-1 py-2 text-center text-[13px] font-black" style={style}>
                          {pick(g)}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
