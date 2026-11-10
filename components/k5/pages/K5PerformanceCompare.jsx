"use client";

import { useState } from "react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { courseKey, courseTone, fmtShort, num, perWeekText } from "@/components/k5/pages/k5PerformanceData";
import { PeopleIcon, UpRightIcon } from "@/components/k5/pages/K5PerformanceIcons";

const BANDS = ["Well behind", "Behind", "On schedule", "Ahead", "Well ahead"];
const HEAD = "px-3.5 py-3 font-k5-display text-[15px] font-semibold";
const GLANCE_GRID = { gridTemplateColumns: "1.8fr 1fr 1fr 1fr 1fr 1.1fr" };

const topText = (p) => (p >= 50 ? `Top ${100 - p}%` : `Bottom ${p}%`);
// Mockup vcls: green from 60, blue from 40, red below.
const tone3 = (p) =>
  p >= 60 ? { bg: "var(--k5-gT)", fg: "var(--k5-gX)", i: 0 } : p >= 40 ? { bg: "var(--k5-bT)", fg: "var(--k5-bI)", i: 1 } : { bg: "var(--k5-rT)", fg: "var(--k5-rI)", i: 2 };
const overallOf = (cc) => {
  const parts = [cc.scorePct, cc.progressPct].filter((p) => p != null);
  return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null;
};
const pct = (v) => (v == null ? "—" : `${v}%`);
const fmtGap = (v) => (v == null ? "—" : v > 0 ? `+${v}` : `${v}`);
const gapBar = (v) => Math.min(100, Math.max(0, ((v ?? 0) + 30) / 60 * 100));

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function Twin({ label, value, col }) {
  return (
    <div className="grid grid-cols-[50px_1fr] items-center gap-2 text-[13px] font-extrabold text-k5-mut">
      <span>{label}</span>
      <span className="relative box-border block h-3.5 overflow-hidden rounded-full border-2 border-k5-line bg-k5-soft">
        <span className="block h-full rounded-full transition-[width] duration-400" style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%`, background: col }} />
      </span>
    </div>
  );
}

function CompareCard({ title, you, cls, youBar, clsBar, col, verdict }) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border-[3px] border-k5-line bg-k5-card p-[18px]">
      <h3 className="m-0 text-base font-black text-k5-mut">{title}</h3>
      <div className="flex items-end gap-[18px]">
        <div>
          <b className="block font-k5-display text-[30px] font-semibold leading-tight" style={{ color: col }}>{you}</b>
          <small className="text-[13px] font-extrabold text-k5-mut">You</small>
        </div>
        <div>
          <b className="block font-k5-display text-[22px] font-semibold leading-tight text-k5-mut">{cls}</b>
          <small className="text-[13px] font-extrabold text-k5-mut">Class average</small>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Twin label="You" value={youBar} col={col} />
        <Twin label="Class" value={clsBar} col="var(--k5-mut)" />
      </div>
      {verdict && (
        <div className="rounded-xl px-3 py-2 text-sm font-black" style={{ background: verdict.bg, color: verdict.fg }}>
          {verdict.text}
        </div>
      )}
    </div>
  );
}

/** Mockup Tab 3 "Class Comparison" — class numbers come anonymized from the backend, per course. */
export function K5PerformanceCompare({ goals, courses, today, onTurnOn, saving }) {
  const toned = courses.map((course, i) => ({ course, tone: courseTone(course, i), cc: course.classComparison }));
  const ready = toned.filter((x) => x.cc);
  const [selKey, setSelKey] = useState(null);

  if (!goals.compare) {
    return (
      <section className={`${K5_CARD} k5-pmpanel flex flex-col items-center gap-3 px-5 py-[34px] text-center text-k5-mut`}>
        <PeopleIcon size={40} />
        <b className="font-k5-display text-xl font-semibold text-k5-ink">Class comparison is turned off</b>
        <span className="text-base font-extrabold">Turn it on to see how your score and progress compare with others in your courses.</span>
        <button
          type="button"
          onClick={onTurnOn}
          disabled={saving}
          className="flex min-h-[46px] cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-ac bg-k5-ac px-[18px] font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] disabled:opacity-50"
        >
          {saving ? "Turning on…" : "Turn on comparison"}
        </button>
      </section>
    );
  }

  if (!ready.length) {
    return (
      <section className={`${K5_CARD} k5-pmpanel flex flex-col items-center gap-3 px-5 py-[34px] text-center text-k5-mut`}>
        <PeopleIcon size={40} />
        <b className="font-k5-display text-xl font-semibold text-k5-ink">Not enough classmates to compare yet</b>
        <span className="text-base font-extrabold">We only compare when there’s enough data. Names and scores of others are never shown.</span>
      </section>
    );
  }

  const sel = ready.find((x) => courseKey(x.course) === selKey) || ready[0];
  const { course, tone, cc } = sel;
  const score = course.hasScore ? num(course.score) : null;
  const progress = num(course.progress) ?? 0;
  const overall = overallOf(cc);
  const youBand = cc.youBand ?? 2;
  const maxC = Math.max(1, ...(cc.dist || []));

  const left = course.left ?? null;
  const finish = fmtShort(goals.finishBy);

  const v1 = cc.scorePct == null ? null : tone3(cc.scorePct);
  const v2 = cc.progressPct == null ? null : tone3(cc.progressPct);
  const v3 = cc.onTimePct == null ? null : tone3(cc.onTimePct);
  const scoreVerdict = v1 && {
    ...v1,
    text: [`Higher than ${cc.scorePct}% of the class`, `Right around the class middle (${cc.scorePct}%)`, `Below ${100 - cc.scorePct}% of the class — room to climb`][v1.i],
  };
  const progVerdict = v2 && {
    ...v2,
    text: [`Better pace than ${cc.progressPct}% of the class`, `Pacing with the class middle (${cc.progressPct}%)`, `${100 - cc.progressPct}% of the class have a better pace`][v2.i],
  };
  const timeVerdict = v3 && {
    ...v3,
    text: [`More punctual than ${cc.onTimePct}% of the class`, `About as punctual as most (${cc.onTimePct}%)`, "Most classmates submit on time more often"][v3.i],
  };
  const aboveScore = ready.filter((x) => (x.cc.scorePct ?? 0) >= 50).length;
  const aheadProgress = ready.filter((x) => (x.cc.progressPct ?? 0) >= 50).length;

  return (
    <div className="k5-pmpanel flex flex-col gap-[18px]">
      <section className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">How you compare</h2>
          <span className="k5-pmaside ms-auto inline-flex items-center gap-1.5 text-sm font-extrabold text-k5-mut">
            <LockIcon />
            Private to you · other students’ names and scores are never shown
          </span>
        </div>
        <p className="m-0 font-k5-display text-[21px] font-semibold leading-normal">
          You’re scoring above the class average in <span style={{ color: "var(--k5-gX)" }}>{aboveScore} of {ready.length}</span> courses, and on a better pace than most classmates in{" "}
          <span style={{ color: "var(--k5-gX)" }}>{aheadProgress} of {ready.length}</span>.
        </p>
        <div role="tablist" aria-label="Course" className="flex flex-wrap gap-2">
          {ready.map((x) => {
            const on = x === sel;
            return (
              <button
                key={courseKey(x.course)}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setSelKey(courseKey(x.course))}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[3px] px-4 font-k5-body text-[15px] font-black text-k5-ink"
                style={{ borderColor: on ? x.tone.col : "var(--k5-line)", background: on ? x.tone.lt : "var(--k5-card)" }}
              >
                <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ background: x.tone.col }} />
                {x.course.courseName}
              </button>
            );
          })}
        </div>
      </section>

      <section className={`${K5_CARD} flex flex-col gap-[18px] px-[22px] py-5`} style={{ borderTop: `8px solid ${tone.col}` }}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">{course.courseName}</h2>
          <span className="k5-pmaside ms-auto text-sm font-extrabold text-k5-mut">Compared with {cc.size} students this session</span>
        </div>
        {overall != null && (
          <div>
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-[15px] font-black">
              <span>Your overall standing</span>
              <span>
                {topText(overall)} <em className="font-extrabold not-italic text-k5-mut">of the class</em>
              </span>
            </div>
            <div className="relative mb-2.5 mt-[34px] h-4 rounded-full border-2 border-k5-line" style={{ background: "linear-gradient(90deg, var(--k5-rT) 0%, var(--k5-bT) 50%, var(--k5-gT) 100%)" }}>
              <div className="absolute -top-8 flex -translate-x-1/2 flex-col items-center gap-1" style={{ left: `${overall}%` }}>
                <span className="whitespace-nowrap rounded-lg bg-k5-ink px-2.5 py-0.5 text-xs font-black text-k5-card">You</span>
                <i className="h-[18px] w-[18px] rounded-full border-[3px] border-k5-card" style={{ background: tone.col, boxShadow: `0 0 0 2px ${tone.col}` }} />
              </div>
            </div>
            <div className="flex justify-between text-[13px] font-extrabold text-k5-mut">
              <span>Further behind</span>
              <span>Class middle</span>
              <span>Leading the class</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
          <CompareCard
            title="Score"
            you={score == null || score <= 0 ? "—" : `${score.toFixed(1)}%`}
            cls={pct(cc.avgScore)}
            youBar={score}
            clsBar={cc.avgScore}
            col={tone.col}
            verdict={scoreVerdict}
          />
          <CompareCard
            title="Progress"
            you={fmtGap(cc.myPaceGap)}
            cls={fmtGap(cc.avgPaceGap)}
            youBar={gapBar(cc.myPaceGap)}
            clsBar={gapBar(cc.avgPaceGap)}
            col={tone.col}
            verdict={progVerdict}
          />
          <CompareCard title="On-time submissions" you={pct(cc.youOnTime)} cls={pct(cc.classOnTime)} youBar={cc.youOnTime} clsBar={cc.classOnTime} col={tone.col} verdict={timeVerdict} />
        </div>
        <div>
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-[15px] font-black">
            <span>Where the class is</span>
            <em className="font-extrabold not-italic text-k5-mut">students per pace band</em>
          </div>
          <div role="img" aria-label={`${cc.size} students · you are ${BANDS[youBand]}`} className="flex h-[150px] items-end gap-1.5 pt-[26px]">
            {(cc.dist || []).map((n, i) => (
              <div key={BANDS[i]} title={String(n)} className="relative flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                {i === youBand && <span className="absolute -top-6 rounded-lg border-2 border-k5-line bg-k5-card px-[7px] py-px text-xs font-black">You</span>}
                <div className="w-full rounded-t-lg transition-[height] duration-400" style={{ height: `${Math.max(6, (n / maxC) * 100)}%`, background: i === youBand ? tone.col : "var(--k5-line)" }} />
                <span className="whitespace-nowrap text-xs font-extrabold text-k5-mut">{BANDS[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-black" style={{ background: "var(--k5-bT)", color: "var(--k5-bI)" }}>
          <UpRightIcon />
          <span>
            {(cc.progressPct ?? 0) >= 50
              ? `Finish by ${finish} to stay ahead of ${cc.progressPct}% of students in this course.`
              : left != null && today
                ? `Completing ${perWeekText(left, goals.finishBy, today)} would move you past the class average within a few weeks.`
                : "A few more assignments each week would move you past the class average within a few weeks."}
          </span>
        </div>
      </section>

      <section className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
        <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">All courses at a glance</h2>
        <div className="k5-bdwrap overflow-x-auto rounded-[18px] border-[3px] border-k5-line bg-k5-card">
          <div role="table" aria-label="All courses at a glance" className="k5-bdtbl min-w-[760px] text-[15px] font-extrabold">
            <div role="row" className="k5-bdhead grid bg-k5-ac text-white" style={GLANCE_GRID}>
              {["Course", "Your score", "Class average", "Your progress", "Class average", "Your standing"].map((h, i) => (
                <span key={i} role="columnheader" className={HEAD}>{h}</span>
              ))}
            </div>
            {ready.map((x) => {
              const s = x.course.hasScore ? num(x.course.score) : null;
              const p = num(x.course.progress) ?? 0;
              const o = overallOf(x.cc);
              const st = o == null ? null : tone3(o);
              return (
                <div key={courseKey(x.course)} role="row" className="k5-bdrow grid items-center border-t-2 border-k5-line" style={GLANCE_GRID}>
                  <span role="cell" data-l="Course" className="k5-bdwide flex items-center gap-2 px-3.5 py-3">
                    <span aria-hidden="true" className="h-3 w-3 flex-none rounded-full" style={{ background: x.tone.col }} />
                    {x.course.courseName}
                  </span>
                  <span role="cell" data-l="Your score" className="px-3.5 py-3 font-black" style={{ color: s != null && x.cc.avgScore != null && s >= x.cc.avgScore ? "var(--k5-gX)" : "var(--k5-rI)" }}>
                    {s == null || s <= 0 ? "—" : `${s.toFixed(2)}%`}
                  </span>
                  <span role="cell" data-l="Class average" className="px-3.5 py-3">{pct(x.cc.avgScore)}</span>
                  <span role="cell" data-l="Your progress" className="px-3.5 py-3 font-black" style={{ color: x.cc.avgProgress != null && p >= x.cc.avgProgress ? "var(--k5-gX)" : "var(--k5-rI)" }}>
                    {Math.round(p)}%
                  </span>
                  <span role="cell" data-l="Class average" className="px-3.5 py-3">{pct(x.cc.avgProgress)}</span>
                  <span role="cell" data-l="Your standing" className="px-3.5 py-3">
                    {st ? (
                      <span className="whitespace-nowrap rounded-full px-3 py-[3px] text-[13px] font-black" style={{ background: st.bg, color: st.fg }}>
                        {topText(o)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
