"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { GOAL_SCORES, addDays, asArray, courseKey, courseTone, daysTo, fmtDay, fmtShort, fmtWeekday, num, paceInfo, perWeek, perWeekText } from "@/components/k5/pages/k5PerformanceData";
import { ArrowRightIcon, PaceIcon, ProgressRing, TickIcon } from "@/components/k5/pages/K5PerformanceIcons";

const BTN = "flex min-h-[46px] cursor-pointer items-center gap-2 rounded-full border-[3px] px-[18px] font-k5-display text-[17px] font-semibold disabled:cursor-default disabled:opacity-50";
const BTN_GHOST = `${BTN} border-k5-line bg-k5-card text-k5-ink shadow-[0_4px_0_var(--k5-line)]`;
const BTN_PRIMARY = `${BTN} border-k5-ac bg-k5-ac text-white shadow-[0_4px_0_var(--k5-acd)]`;

function PenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function Dart() {
  return (
    <svg width="78" height="78" viewBox="0 0 80 80" aria-hidden="true" className="block flex-none overflow-visible">
      <circle cx="36" cy="44" r="30" fill="#FFFFFF" stroke="#2A2F4A" strokeWidth="3" />
      <circle cx="36" cy="44" r="21" fill="#FF8FA3" stroke="#2A2F4A" strokeWidth="3" />
      <circle cx="36" cy="44" r="12" fill="#FFFFFF" stroke="#2A2F4A" strokeWidth="3" />
      <circle cx="36" cy="44" r="5" fill="#E8455E" />
      <g>
        <path d="M38 42 L70 10" stroke="#2A2F4A" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M64 6 l10 -2 -2 10 -6 -2 z" fill="#FFC531" stroke="#2A2F4A" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M70 10 l8 -1 M70 10 l-1 8" stroke="#2A2F4A" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const STAR = "M50.0 7.0 L61.8 36.8 L93.7 38.8 L69.0 59.2 L77.0 90.2 L50.0 73.0 L23.0 90.2 L31.0 59.2 L6.3 38.8 L38.2 36.8 Z";

/** Smiling star that fills up as the average gets closer to the goal (mockup .pkjar). */
function StarJar({ fill }) {
  const sy = (99 - 92 * Math.min(1, Math.max(0, fill))).toFixed(1);
  return (
    <svg width="112" height="112" viewBox="0 0 100 100" aria-hidden="true" className="block flex-none overflow-visible">
      <defs>
        <clipPath id="k5GoalClip">
          <path d={STAR} />
        </clipPath>
      </defs>
      <path d={STAR} fill="#FFF1C2" />
      <g clipPath="url(#k5GoalClip)">
        <rect x="0" y={sy} width="100" height="100" fill="#FFC531" />
        <path className="k5-pkwave" d={`M-20 ${sy} q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 v8 h-140 z`} fill="#FFD95A" />
      </g>
      <path d={STAR} fill="none" stroke="#2A2F4A" strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="43" cy="56" r="3.4" fill="#2A2F4A" />
      <circle cx="57" cy="56" r="3.4" fill="#2A2F4A" />
      <circle cx="44" cy="55" r="1.1" fill="#FFFFFF" />
      <circle cx="58" cy="55" r="1.1" fill="#FFFFFF" />
      <ellipse cx="37" cy="63" rx="3.6" ry="2.3" fill="#FF8FA3" />
      <ellipse cx="63" cy="63" rx="3.6" ry="2.3" fill="#FF8FA3" />
      <path d="M45.5 63 q4.5 5 9 0" fill="none" stroke="#2A2F4A" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function Bar({ pct, col, mark }) {
  return (
    <span className="relative box-border block h-3.5 overflow-hidden rounded-full border-2 border-k5-line bg-k5-soft">
      <span className="block h-full rounded-full transition-[width] duration-400" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: col }} />
      {mark != null && <i className="absolute inset-y-0 -ms-px block w-[3px] bg-k5-ink" style={{ insetInlineStart: `${Math.min(100, Math.max(0, mark))}%` }} />}
    </span>
  );
}

function Toggle({ checked, onChange, title, help }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-[22px] w-[22px] flex-none accent-[var(--k5-ac)]" />
      <span>
        <b className="block text-base font-black">{title}</b>
        <small className="text-sm font-extrabold text-k5-mut">{help}</small>
      </span>
    </label>
  );
}

/** Mockup "Set my goals" dialog (PRD §4): school default or higher, finish-by between tomorrow and the end date. */
function GoalsDialog({ goals, avg, today, totalLeft, canCompare, onClose, onSave }) {
  const rec = goals.recommended;
  const end = goals.endDate;
  const tomorrow = today ? addDays(today, 1) : null;
  const presetChoice = rec && goals.finishBy === rec ? "rec" : end && goals.finishBy === end ? "end" : "custom";
  const [score, setScore] = useState(goals.score);
  const [choice, setChoice] = useState(presetChoice);
  const [custom, setCustom] = useState(presetChoice === "custom" ? goals.finishBy : "");
  const [remind, setRemind] = useState(goals.remind);
  const [compare, setCompare] = useState(goals.compare);
  const [saving, setSaving] = useState(false);
  const finishBy = choice === "rec" ? rec : choice === "end" ? end : custom;
  const schoolDefault = goals.schoolDefault || 85;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const save = async () => {
    if (!finishBy) return;
    setSaving(true);
    const ok = await onSave({ score, finishBy, remind: remind ? "Y" : "N", compare: compare ? "Y" : "N" });
    setSaving(false);
    if (ok) onClose();
  };

  const choiceStyle = (on) => ({ borderColor: on ? "var(--k5-ac)" : "var(--k5-line)", background: on ? "var(--k5-act)" : "var(--k5-card)" });
  const dateChoices = [
    rec && tomorrow && rec >= tomorrow && { id: "rec", label: fmtShort(rec), sub: "Recommended · 2 weeks early" },
    end && { id: "end", label: fmtShort(end), sub: "Course end date" },
    { id: "custom", label: "Pick a date", sub: "Finish on your own plan" },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[88] box-border flex items-center justify-center p-4">
      <button type="button" aria-label="Cancel" onClick={() => !saving && onClose()} className="absolute inset-0 cursor-pointer border-none bg-[rgba(10,16,34,0.55)] p-0" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="k5-goals-title"
        className="relative box-border flex max-h-full w-[640px] max-w-full flex-col gap-4 overflow-y-auto rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-[22px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)]"
      >
        <div>
          <h2 id="k5-goals-title" className="m-0 font-k5-display text-[26px] font-semibold">Set my goals</h2>
          <p className="m-0 mt-1.5 text-base font-extrabold text-k5-mut">Choose what you’re aiming for this session. You can change it any time.</p>
        </div>

        <div className="flex flex-col gap-2.5 border-t-[3px] border-k5-line pt-4">
          <div className="font-k5-display text-lg font-semibold">Target average score</div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2.5">
            {GOAL_SCORES.map(([v, letter]) => {
              const below = v < schoolDefault;
              const on = score === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  disabled={below}
                  onClick={() => setScore(v)}
                  className="flex min-h-[68px] cursor-pointer flex-col items-start justify-center gap-0.5 rounded-2xl border-[3px] px-3.5 py-2.5 text-start font-k5-body text-k5-ink disabled:cursor-default"
                  style={{ ...choiceStyle(on), opacity: below ? 0.45 : 1 }}
                >
                  <b className="font-k5-display text-xl font-semibold">{v}%</b>
                  <small className="text-[13px] font-extrabold text-k5-mut">{below ? "Below school target" : `${letter}${v === schoolDefault ? " · School target" : ""}`}</small>
                </button>
              );
            })}
          </div>
          <p className="m-0 text-[15px] font-extrabold text-k5-mut">
            {avg == null
              ? "Your average will show here once your work is graded."
              : avg >= score
                ? `You’re at ${Number(avg).toFixed(1)}% — already there. Aim higher if you like!`
                : `You’re at ${Number(avg).toFixed(1)}% — ${(score - avg).toFixed(1)}% to go.`}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 border-t-[3px] border-k5-line pt-4">
          <div className="font-k5-display text-lg font-semibold">Finish all my courses by</div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5">
            {dateChoices.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={choice === d.id}
                onClick={() => setChoice(d.id)}
                className="flex min-h-[68px] cursor-pointer flex-col items-start justify-center gap-0.5 rounded-2xl border-[3px] px-3.5 py-2.5 text-start font-k5-body text-k5-ink"
                style={choiceStyle(choice === d.id)}
              >
                <b className="font-k5-display text-lg font-semibold">{d.label}</b>
                <small className="text-[13px] font-extrabold text-k5-mut">{d.sub}</small>
              </button>
            ))}
          </div>
          {choice === "custom" && (
            <div className="max-w-[300px]">
              <DatePicker
                label={end ? `Pick a date (by ${fmtShort(end)})` : "Pick a date"}
                icon={CalendarDays}
                height="h-[50px]"
                autoOpen={!custom}
                value={custom ? new Date(`${custom}T00:00:00`) : undefined}
                fromDate={tomorrow ? new Date(`${tomorrow}T00:00:00`) : undefined}
                toDate={end ? new Date(`${end}T00:00:00`) : undefined}
                onChange={(date) => {
                  if (!date) return setCustom("");
                  const d = new Date(date);
                  setCustom(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                }}
              />
            </div>
          )}
          {finishBy && today && (
            <p className="m-0 text-[15px] font-extrabold text-k5-mut">That’s about {perWeekText(totalLeft, finishBy, today)} across all your courses.</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5 border-t-[3px] border-k5-line pt-4">
          <div className="font-k5-display text-lg font-semibold">Reminders &amp; comparisons</div>
          <Toggle checked={remind} onChange={setRemind} title="Remind me when I fall behind today’s target" help="Shown on this page — no extra emails." />
          {canCompare && (
            <Toggle checked={compare} onChange={setCompare} title="Show how I compare with my class" help="Names and scores of others are never shown." />
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 border-t-[3px] border-k5-line pt-4">
          <button type="button" onClick={onClose} disabled={saving} className={BTN_GHOST}>Cancel</button>
          <button type="button" onClick={save} disabled={saving || !finishBy} className={BTN_PRIMARY}>{saving ? "Saving…" : "Save goals"}</button>
        </div>
      </div>
    </div>
  );
}

const LINE_STYLE = {
  done: { background: "var(--k5-gT)", borderColor: "var(--k5-gI)" },
  overdue: { background: "var(--k5-card)", borderColor: "var(--k5-rI)" },
  not_started: { background: "var(--k5-card)", borderColor: "var(--k5-line)" },
};

/** Mockup Tab 2 "My Goals" (PRD §3). */
/** plain: the regular dashboard look (score goal ring and a completion bar instead of the star jar and road). */
export function K5PerformanceGoals({ goals, avg, courses, week, today, initial, onSave, plain = false, compareAvailable = false }) {
  const [open, setOpen] = useState(false);
  const n = courses.length;
  // Completion: average course progress vs average time used (today's target).
  const ov = n ? courses.reduce((s, c) => s + (num(c.progress) ?? 0), 0) / n : 0;
  const exp = n ? courses.reduce((s, c) => s + (num(c.target) ?? 0), 0) / n : 0;
  const totalLeft = courses.reduce((s, c) => s + (c.left || 0), 0);
  const gap = avg == null ? null : goals.score - avg;
  const lines = asArray(week?.lines);
  const doneLines = lines.filter((l) => l.state === "done").length;
  const cleared = lines.length > 0 && doneLines === lines.length;
  const pastFinish = Boolean(today && goals.finishBy && goals.finishBy < today);
  const days = today ? daysTo(goals.finishBy, today) : null;

  return (
    <div className="k5-pmpanel flex flex-col gap-[18px]">
      <section className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">My goals</h2>
          <button type="button" onClick={() => setOpen(true)} className={`${BTN_PRIMARY} ms-auto`}>
            <PenIcon />
            Set my goals
          </button>
        </div>
        <div className="relative flex items-center gap-[18px] overflow-hidden rounded-[22px] bg-k5-act px-5 py-[18px] max-[760px]:items-start">
          <span aria-hidden="true" className="k5-pkspark absolute end-[22px] top-3 h-2.5 w-2.5 rounded-full bg-[#FFC531]" />
          <span aria-hidden="true" className="k5-pkspark absolute bottom-3.5 end-16 h-[7px] w-[7px] rounded-full bg-[#FF8FA3] [animation-delay:.6s]" />
          <span aria-hidden="true" className="k5-pkspark absolute end-[110px] top-[26px] h-1.5 w-1.5 rounded-full bg-k5-ac [animation-delay:1.1s]" />
          {!plain && <Dart />}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="font-k5-display text-2xl font-semibold leading-[1.35]">
              Aim for{" "}
              <span className="inline-block rounded-full border-2 border-k5-ac bg-k5-card px-2.5 text-k5-acx">{goals.score}% average</span> and finish by{" "}
              <span className="inline-block rounded-full border-2 border-k5-ac bg-k5-card px-2.5 text-k5-acx">{fmtShort(goals.finishBy)}</span>
            </div>
            <p className="m-0 text-base font-extrabold leading-normal text-k5-ink">
              {gap == null ? "Your average will show here once your work is graded." : gap > 0 ? `You’re ${gap.toFixed(1)}% away from your score goal.` : "Goal reached — keep it there."}{" "}
              {pastFinish ? (
                <b className="font-black" style={{ color: "var(--k5-rI)" }}>Past your finish date — set a new one.</b>
              ) : (
                today && (
                  <>
                    About <b className="font-black text-k5-acx">{perWeekText(totalLeft, goals.finishBy, today)}</b> across your courses gets you there on time.
                  </>
                )
              )}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3.5">
          <div className="flex items-center gap-4 rounded-[22px] border-[3px] border-k5-line bg-k5-card px-[18px] py-4">
            {plain ? (
              <ProgressRing pct={avg == null ? 0 : (avg / goals.score) * 100} col="var(--k5-ac)" lt="var(--k5-act)" />
            ) : (
              <StarJar fill={avg == null ? 0 : avg / goals.score} />
            )}
            <span className="flex min-w-0 flex-col gap-1">
              <b className="font-k5-display text-lg font-semibold">Score goal</b>
              <span className="flex flex-wrap items-baseline gap-1.5">
                <b className="font-k5-display text-[32px] font-semibold leading-none">{avg == null ? "—" : `${Number(avg).toFixed(1)}%`}</b>
                <span className="text-[15px] font-black text-k5-mut">of {goals.score}%</span>
              </span>
              <span className="self-start rounded-full bg-[#FFF1C2] px-3 py-[3px] text-sm font-black text-[#7A4E00]">
                {gap == null ? "No score yet" : gap > 0 ? `${gap.toFixed(1)}% to go` : "Goal reached — keep it there"}
              </span>
            </span>
          </div>
          <div className="flex flex-col gap-2.5 rounded-[22px] border-[3px] border-k5-line bg-k5-card px-[18px] py-4">
            <span className="flex flex-wrap items-baseline justify-between gap-2.5">
              <b className="font-k5-display text-lg font-semibold">Completion</b>
              <span>
                <b className="font-k5-display text-[32px] font-semibold leading-none">{Math.round(ov)}%</b> <span className="text-[15px] font-black text-k5-mut">done</span>
              </span>
            </span>
            {plain ? (
              <Bar pct={ov} col="var(--k5-grn)" mark={exp} />
            ) : (
            <div role="img" aria-label={`You are ${Math.round(ov)}% of the way. Today’s target is ${Math.round(exp)}%.`} className="relative me-3.5 ms-1.5 h-[70px]">
              <span aria-hidden="true" className="absolute inset-x-0 top-[34px] h-[22px] rounded-full bg-[#5B6478] shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]" />
              <span aria-hidden="true" className="absolute inset-x-2.5 top-[44px] h-0 border-t-[3px] border-dashed border-white/85" />
              <span aria-hidden="true" className="absolute start-0 top-[34px] h-[22px] rounded-full bg-k5-grn shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]" style={{ width: `${Math.min(100, Math.round(ov))}%` }} />
              <span aria-hidden="true" className="absolute top-[26px] -ms-0.5 h-[38px] w-1 rounded-sm bg-[#2A2F4A]" style={{ insetInlineStart: `${Math.min(100, Math.round(exp))}%` }} />
              <span aria-hidden="true" className="absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2A2F4A] px-2 py-px text-[11px] font-black text-white" style={{ insetInlineStart: `${Math.min(100, Math.round(exp))}%` }}>
                Today
              </span>
              <span
                aria-hidden="true"
                className="k5-pkme absolute top-[22px] -ms-5 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-k5-grn bg-white font-k5-display text-[17px] font-bold text-k5-grnd shadow-[0_3px_0_rgba(28,38,64,.2)]"
                style={{ insetInlineStart: `${Math.min(100, Math.round(ov))}%` }}
              >
                {initial}
              </span>
              <svg aria-hidden="true" width="34" height="48" viewBox="0 0 34 48" className="absolute -end-3.5 top-0 block">
                <path d="M5 46 V4" stroke="#2A2F4A" strokeWidth="3.5" strokeLinecap="round" />
                <path className="k5-pkflag" d="M6 5 h22 l-5 7 5 7 h-22 z" fill="#E8455E" stroke="#2A2F4A" strokeWidth="2.5" strokeLinejoin="round" />
              </svg>
            </div>
            )}
            <small className="text-sm font-extrabold leading-snug text-k5-mut">
              Today’s target is {Math.round(exp)}% · {pastFinish ? "Past your finish date" : `${days} days to your finish date`}
            </small>
          </div>
        </div>
      </section>

      <section className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">This week’s goals</h2>
          {lines.length > 0 && (
            <span aria-live="polite" className="rounded-full px-3 py-[3px] text-sm font-black" style={cleared ? { background: "var(--k5-grn)", color: "#FFFFFF" } : { background: "var(--k5-act)", color: "var(--k5-acx)" }}>
              {doneLines} of {lines.length} done
            </span>
          )}
          <span className="k5-pmaside ms-auto inline-flex items-center gap-1.5 text-sm font-extrabold text-k5-mut">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            Updated daily from your submissions
          </span>
        </div>
        {!lines.length ? (
          <p className="m-0 py-3 text-center text-[15px] font-extrabold text-k5-mut">Nothing due this week.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {lines.map((ln) => {
              const idx = courses.findIndex((c) => c.lmsEnrollmentId === ln.enrollmentId);
              const tone = courseTone(courses[idx] || { courseName: ln.course }, Math.max(0, idx));
              const done = ln.state === "done";
              return (
                <div key={`${ln.enrollmentId}-${ln.itemId}`} className="flex min-h-[60px] items-center gap-3.5 rounded-2xl border-[3px] px-4 py-2.5" style={LINE_STYLE[ln.state] || LINE_STYLE.not_started}>
                  <span aria-hidden="true" className="h-3.5 w-3.5 flex-none rounded-full" style={{ background: tone.col }} />
                  <span className="flex min-w-0 flex-[1_1_auto] flex-col text-base font-black" style={{ color: done ? "var(--k5-mut)" : "var(--k5-ink)" }}>
                    {ln.title}
                    <span className="text-[13px] font-extrabold text-k5-mut">
                      {ln.course}
                      {ln.catchUp ? " · Catch-up" : ""}
                    </span>
                  </span>
                  {done ? (
                    <span role="img" aria-label="Done" className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-k5-grn text-white">
                      <TickIcon />
                    </span>
                  ) : ln.state === "overdue" ? (
                    <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-black" style={{ background: "var(--k5-rT)", color: "var(--k5-rI)" }}>Overdue</span>
                  ) : (
                    <span className="whitespace-nowrap text-sm font-black" style={{ color: "var(--k5-oI)" }}>{!ln.due ? "" : week?.end && ln.due > week.end ? `Due ${fmtDay(ln.due)}` : `Due ${fmtWeekday(ln.due)}`}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {cleared && (
          <div role="status" className="flex items-center gap-3 rounded-2xl px-4 py-3 font-black" style={{ background: "var(--k5-gT)", color: "var(--k5-gX)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
              <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
            </svg>
            Week cleared — you’re staying ahead of target.
          </div>
        )}
      </section>

      <section className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">Goals by course</h2>
          <span className="k5-pmaside ms-auto text-sm font-extrabold text-k5-mut">Black line = your goal score, and today’s target</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-3.5 max-[760px]:grid-cols-1">
          {courses.map((course, index) => {
            const tone = courseTone(course, index);
            const scored = Boolean(course.hasScore);
            const score = num(course.score) ?? 0;
            const progress = num(course.progress) ?? 0;
            const target = num(course.target) ?? 0;
            const met = score >= goals.score;
            const targetGap = target - progress;
            const pace = paceInfo(course);
            const left = course.left ?? 0;
            const next = asArray(course.nextUp);
            return (
              <div key={courseKey(course)} className="flex flex-col gap-3.5 rounded-[20px] border-[3px] border-t-8 border-k5-line bg-k5-card p-[18px]" style={{ borderTopColor: tone.col }}>
                <div className="flex items-start justify-between gap-2.5">
                  <b className="font-k5-display text-[19px] font-semibold">{course.courseName}</b>
                  <span className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full py-[3px] pe-3 ps-2 text-[13px] font-black" style={{ background: pace.bg, color: pace.fg }}>
                    <PaceIcon pace={pace.key} />
                    {pace.label}
                  </span>
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-[15px] font-black">
                    <span>Score</span>
                    <span>
                      {scored ? `${score.toFixed(2)}%` : "—"} <em className="font-extrabold not-italic text-k5-mut">· Goal: {goals.score}%</em>
                    </span>
                  </div>
                  {scored && <Bar pct={score} col={tone.col} mark={goals.score} />}
                  <div className="mt-1.5 text-sm font-black" style={{ color: !scored ? "var(--k5-mut)" : met ? "var(--k5-gX)" : "var(--k5-oI)" }}>
                    {!scored ? "No score yet" : met ? "Goal met" : `${(goals.score - score).toFixed(1)}% to goal`}
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-[15px] font-black">
                    <span>Progress</span>
                    <span>
                      {Math.round(progress)}% done <em className="font-extrabold not-italic text-k5-mut">· Target today: {Math.round(target)}%</em>
                    </span>
                  </div>
                  <Bar pct={progress} col={tone.col} mark={target} />
                  <div className="mt-1.5 text-sm font-black" style={{ color: targetGap <= 0 ? "var(--k5-gX)" : "var(--k5-oI)" }}>
                    {targetGap <= 0 ? `Target met · ${(-targetGap).toFixed(1)}% ahead` : `${targetGap.toFixed(1)}% to today’s target`}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 max-[760px]:grid-cols-2">
                  <div className="rounded-[14px] bg-k5-soft px-3 py-2.5">
                    <b className="block font-k5-display text-xl font-semibold">{left}</b>
                    <small className="text-xs font-extrabold text-k5-mut">assignments left</small>
                  </div>
                  <div className="rounded-[14px] bg-k5-soft px-3 py-2.5">
                    <b className="block font-k5-display text-xl font-semibold">{today ? perWeek(left, goals.finishBy, today) : "—"}</b>
                    <small className="text-xs font-extrabold text-k5-mut">per week to finish by {fmtDay(goals.finishBy)}</small>
                  </div>
                  <div className="rounded-[14px] bg-k5-soft px-3 py-2.5">
                    <b className="block font-k5-display text-xl font-semibold">{pastFinish ? "—" : days ?? "—"}</b>
                    <small className="text-xs font-extrabold text-k5-mut">{pastFinish ? "Past your finish date" : "days to your finish date"}</small>
                  </div>
                </div>
                {next.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <b className="font-black">Next up</b>
                    {next.map((x) => (
                      <div key={`${x.title}-${x.due}`} className="flex items-center gap-2.5 rounded-[14px] bg-k5-soft px-3 py-2.5 text-[15px] font-extrabold">
                        <ArrowRightIcon />
                        <span className="flex-1">{x.title}</span>
                        <span className="whitespace-nowrap text-[13px] font-black" style={{ color: "var(--k5-oI)" }}>Due {fmtDay(x.due)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {open && <GoalsDialog goals={goals} avg={avg} today={today} totalLeft={totalLeft} canCompare={compareAvailable} onClose={() => setOpen(false)} onSave={onSave} />}
    </div>
  );
}
