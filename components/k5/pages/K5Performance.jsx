"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { saveMyGoals } from "@/services/profileSaveApi";
import { callServer } from "@/utils/serverCall";
import { K5PerformanceGoals } from "@/components/k5/pages/K5PerformanceGoals";
import { K5PerformanceCompare } from "@/components/k5/pages/K5PerformanceCompare";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { studentNavHref } from "@/utils/dashboardNav";
import { K5PerformanceStats } from "@/components/k5/pages/K5PerformanceStats";
import { K5PerformanceCourseList } from "@/components/k5/pages/K5PerformanceCourseList";
import { K5PerformanceCourseView } from "@/components/k5/pages/K5PerformanceCourseView";
import { K5PerformanceScoreCard } from "@/components/k5/pages/K5PerformanceScoreCard";
import { K5PerformanceStreak } from "@/components/k5/pages/K5PerformanceStreak";
import { K5PerformanceAchievements } from "@/components/k5/pages/K5PerformanceAchievements";
import { ChartIcon, HeroScene, PeopleIcon, TargetIcon } from "@/components/k5/pages/K5PerformanceIcons";
import { asArray, badgeView, courseKey, fmtShort, sessionInfo } from "@/components/k5/pages/k5PerformanceData";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";

const TABS = [
  { id: "perf", label: "Performance", Icon: ChartIcon },
  { id: "goals", label: "My Goals", Icon: TargetIcon },
  { id: "class", label: "Class Comparison", Icon: PeopleIcon },
];

const PILLS = ["Progress", "Streak", "Scores"];
// Shown when the day's insight for a slot has no data (the reference skips such a slot).
const QUIET = ["Keep going — your progress shows here after the next daily update.", "Submit your next activity on time to start a streak.", "Your scores will show here once your work is graded."];

/** Auto-rotate the pill every INTERVAL ms; pauses while the user hovers or focuses the hero. */
function useAutoRotate(count, onPill, active) {
  const paused = useRef(false);
  useEffect(() => {
    if (!active || count < 2) return;
    const id = setInterval(() => {
      if (!paused.current) onPill((p) => (p + 1) % count);
    }, 5000);
    return () => clearInterval(id);
  }, [count, onPill, active]);
  const pause = useCallback(() => { paused.current = true; }, []);
  const resume = useCallback(() => { paused.current = false; }, []);
  return { onMouseEnter: pause, onMouseLeave: resume, onFocus: pause, onBlur: resume };
}

function Hero({ name, tips, pill, onPill, plain, hoverProps }) {
  const { isMiddle } = useDashboardContext();
  return (
    <section
      className="relative flex flex-col gap-3 overflow-hidden rounded-[26px] border-[3px] border-k5-ac px-[26px] py-6 shadow-[0_6px_0_var(--k5-acl)]"
      style={
        isMiddle
          ? { background: "var(--k5-act)", boxShadow: "0 2px 0 var(--k5-acl)", borderRadius: 18 }
          : {
              background:
                "radial-gradient(circle at 8% 0%, rgba(255,255,255,.55), rgba(255,255,255,0) 45%), radial-gradient(circle at 70% 120%, rgba(255,197,49,.18), rgba(255,197,49,0) 50%), var(--k5-act)",
            }
      }
      {...hoverProps}
    >
      {!plain && !isMiddle && <HeroScene />}
      <h2 className="relative m-0 font-k5-display text-[30px] font-semibold text-k5-ink">{plain ? `Hi ${name}, here’s how you’re doing.` : `Hey ${name}, nice momentum.`}</h2>
      <p key={pill} aria-live="polite" className="k5-pmpanel relative m-0 min-h-[52px] text-lg font-extrabold leading-normal text-k5-ink">
        {tips[pill] || QUIET[pill]}
      </p>
      <div role="tablist" aria-label="My Performance" className="relative flex flex-wrap gap-2.5">
        {PILLS.map((label, i) => {
          const sel = i === pill;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={sel}
              aria-label={`${i + 1} / 3: ${label}`}
              onClick={() => onPill(i)}
              className="k5-pmpill relative inline-flex min-h-11 min-w-[130px] cursor-pointer items-center justify-center overflow-hidden rounded-full border-[3px] px-4 font-k5-body text-[15px] font-black"
              style={{ background: sel ? "var(--k5-ac)" : "var(--k5-card)", borderColor: sel ? "var(--k5-ac)" : "var(--k5-line)", color: sel ? "#FFFFFF" : "var(--k5-ink)" }}
            >
              <em className="relative inline-flex items-center gap-2 not-italic">
                <b
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px]"
                  style={{
                    background: i <= pill ? (sel ? "#FFFFFF" : "var(--k5-ac)") : "var(--k5-soft)",
                    color: i <= pill ? (sel ? "var(--k5-ac)" : "#FFFFFF") : "var(--k5-ink)",
                  }}
                >
                  {i + 1}
                </b>
                {label}
              </em>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Header({ session }) {
  const { school } = useParams();
  const { isMiddle } = useDashboardContext();
  return (
    <div className={isMiddle ? "flex flex-wrap items-center gap-4" : `${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      <span
        aria-hidden="true"
        className={`flex flex-none items-center justify-center ${isMiddle ? "h-[62px] w-[62px]" : "h-[76px] w-[76px] rounded-[24px]"}`}
        style={isMiddle ? { background: "var(--k5-act)", color: "var(--k5-ac)", borderRadius: 14 } : { background: "var(--k5-gT)", color: "var(--k5-gI)" }}
      >
        <ChartIcon size={isMiddle ? 34 : 42} width={2.3} />
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <span className="text-[15px] font-extrabold text-k5-mut">
          <Link href={studentNavHref(school, "")} className="font-black text-k5-acx no-underline">
            Dashboard
          </Link>{" "}
          / My Performance
        </span>
        <h1 className={`m-0 font-k5-display font-semibold leading-[1.05] ${isMiddle ? "text-[30px]" : "text-4xl"}`}>My Performance</h1>
      </div>
      {session && <span className="rounded-full border-2 border-k5-line bg-k5-soft px-3.5 py-1.5 text-[15px] font-black text-k5-mut">{session.label}</span>}
    </div>
  );
}

function BehindBanner({ names }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-[20px] border-[3px] px-4 py-3 text-base font-black" style={{ background: "var(--k5-oT)", borderColor: "var(--k5-oI)", color: "var(--k5-oI)" }}>
      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-k5-card">
        <TargetIcon size={20} />
      </span>
      <span>You’re behind today’s target in {names.join(" & ")}. A little work today gets you back on track!</span>
    </div>
  );
}

/**
 * My Performance while it loads, laid out like the page: the title, the three tabs, the hero (greeting, tip, three
 * pills), the badge cards, the four number tiles and the course rows.
 */
function PerformanceSkeleton() {
  return (
    <K5Loading label="Loading your performance" className="flex flex-col gap-[18px]">
      <Header session={null} />
      <div className="flex flex-wrap gap-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <K5Sk key={i} className="h-[50px] w-40 rounded-full" />
        ))}
      </div>
      <div className={`${K5_CARD} flex flex-col gap-3 px-[26px] py-6`}>
        <K5Sk className="h-8 w-72 max-w-full" />
        <K5Sk className="h-5 w-full max-w-[640px]" />
        <K5Sk className="h-5 w-2/3 max-w-[420px]" />
        <div className="flex flex-wrap gap-2.5 pt-1">
          {Array.from({ length: 3 }, (_, i) => (
            <K5Sk key={i} className="h-11 w-[130px] rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-[18px] border-[3px] border-k5-line bg-k5-card px-3.5 py-3">
            <K5Sk className="h-14 w-14 flex-none rounded-full" />
            <span className="flex flex-1 flex-col gap-2">
              <K5Sk className="h-4 w-3/4" />
              <K5Sk className="h-3 w-1/2" />
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${K5_CARD} flex items-center gap-3.5 px-[18px] py-4`}>
            <K5Sk className="h-[50px] w-[50px] flex-none rounded-2xl" />
            <span className="flex flex-1 flex-col gap-2">
              <K5Sk className="h-3.5 w-24" />
              <K5Sk className="h-6 w-16" />
              <K5Sk className="h-3 w-28" />
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-[20px] border-[3px] border-k5-line bg-k5-card px-[18px] py-3.5">
            <K5Sk className="h-16 w-16 flex-none rounded-full" />
            <span className="flex flex-1 flex-col gap-2">
              <K5Sk className="h-5 w-1/2" />
              <K5Sk className="h-3.5 w-1/3" />
              <K5Sk className="h-3 w-full max-w-[420px] rounded-full" />
            </span>
            <K5Sk className="h-9 w-24 flex-none rounded-full max-[560px]:hidden" />
          </div>
        ))}
      </div>
    </K5Loading>
  );
}

/** plain: the regular dashboard look for Middle / High school (no mascot, stars or kid panels). */
export function K5Performance({ isLoading, performance, courseProviderId, plain = false }) {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("perf");
  const [pill, setPill] = useState(0);
  // contentPill: which lower box to show. For K5 it only changes on click; for plain it follows the pill.
  const [contentPill, setContentPill] = useState(0);
  const handlePillClick = useCallback((i) => { setPill(i); setContentPill(i); }, []);
  const stablePill = useCallback((fn) => setPill(fn), []);
  const hoverProps = useAutoRotate(PILLS.length, stablePill, tab === "perf");
  const [openKey, setOpenKey] = useState(null);
  const [savingGoals, setSavingGoals] = useState(false);
  // Demo / ?dummyStudent=Y: goals live on the page only, nothing is written to the backend.
  const [dummyGoals, setDummyGoals] = useState(null);
  usePicoContentReady(!isLoading);

  const courses = asArray(performance?.courses);
  const tiles = performance?.tiles || null;
  const compareAvailable = performance?.compareAvailable === true;
  const today = performance?.today;
  const goals = { ...(performance?.goals || {}), ...(dummy.enabled && dummyGoals ? dummyGoals : {}) };
  goals.remind = goals.remind !== "N";
  goals.compare = goals.compare !== "N";
  const session = sessionInfo(tiles);
  const badges = badgeView(performance?.badges, goals.score);
  const tips = asArray(performance?.insights);
  const studentName = String(context?.userName || "").split(" ")[0] || "there";
  const behindNames = goals.remind ? courses.filter((c) => c.pace === "behind").map((c) => c.courseName) : [];

  const saveGoals = async (next) => {
    if (dummy.enabled) {
      setDummyGoals({ ...next, saved: true });
      toast.success(`Goals saved — aiming for ${next.score}% by ${fmtShort(next.finishBy)}`);
      return true;
    }
    setSavingGoals(true);
    try {
      await callServer(() => saveMyGoals(next));
      toast.success(`Goals saved — aiming for ${next.score}% by ${fmtShort(next.finishBy)}`);
      // The dialog closes now and the page recalculates behind it.
      queryClient.invalidateQueries({ queryKey: ["student-academic-performance"] });
      return true;
    } catch (error) {
      toast.error(String(error?.message || "Your goals could not be saved.").replace(/^[A-Z0-9_]+: /, ""));
      return false;
    } finally {
      setSavingGoals(false);
    }
  };
  const turnOnCompare = () => saveGoals({ score: goals.score, finishBy: goals.finishBy, remind: goals.remind ? "Y" : "N", compare: "Y" });

  const openIndex = openKey == null ? -1 : courses.findIndex((c) => courseKey(c) === openKey);
  const openCourse = (course) => {
    setOpenKey(courseKey(course));
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  if (isLoading) return <PerformanceSkeleton />;

  if (openIndex >= 0) {
    return <K5PerformanceCourseView course={courses[openIndex]} index={openIndex} onBack={() => setOpenKey(null)} />;
  }

  // Only the Agilix Buzz providers have the daily synced course data this page is built from.
  const detailed = [36, 37, 38].includes(parseInt(courseProviderId, 10));

  return (
    <div className="k5-perf-page flex flex-col gap-[18px]">
      <Header session={session} />

      <div role="tablist" aria-label="My Performance" className="flex flex-wrap gap-2.5">
        {TABS.filter((t) => t.id !== "class" || compareAvailable).map((t) => {
          const sel = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={sel}
              onClick={() => setTab(t.id)}
              className="k5-pmtab flex min-h-[50px] cursor-pointer items-center gap-2 rounded-full border-[3px] px-5 font-k5-display text-lg font-semibold"
              style={{
                background: sel ? "var(--k5-ac)" : "var(--k5-card)",
                borderColor: sel ? "var(--k5-ac)" : "var(--k5-line)",
                color: sel ? "#FFFFFF" : "var(--k5-ink)",
                boxShadow: `0 4px 0 ${sel ? "var(--k5-acd)" : "var(--k5-line)"}`,
              }}
            >
              <t.Icon />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "perf" && (
        <div className="k5-pmpanel flex flex-col gap-[18px]">
          <Hero name={studentName} tips={tips} pill={pill} onPill={handlePillClick} plain={plain} hoverProps={hoverProps} />
          {behindNames.length > 0 && <BehindBanner names={behindNames} />}
          {plain ? (
            <>
              {pill === 0 && <K5PerformanceAchievements badges={badges} />}
              {pill === 1 && <K5PerformanceStreak courses={courses} />}
              {pill === 2 && <K5PerformanceScoreCard avg={tiles?.avgScore ?? null} />}
            </>
          ) : (
            <>
              {contentPill === 0 && <K5PerformanceAchievements badges={badges} />}
              {contentPill === 1 && <K5PerformanceStreak courses={courses} />}
              {contentPill === 2 && <K5PerformanceScoreCard avg={tiles?.avgScore ?? null} />}
            </>
          )}
          <K5PerformanceStats tiles={tiles} session={session} />
          <K5PerformanceCourseList courses={courses} detailed={detailed} onOpen={openCourse} plain={plain} />
        </div>
      )}

      {tab === "goals" && (
        <K5PerformanceGoals
          goals={goals}
          avg={tiles?.avgScore ?? null}
          courses={courses}
          week={performance?.week}
          today={today}
          initial={studentName.charAt(0).toUpperCase()}
          onSave={saveGoals}
          plain={plain}
          compareAvailable={compareAvailable}
        />
      )}
      {tab === "class" && compareAvailable && <K5PerformanceCompare goals={goals} courses={courses} today={today} onTurnOn={turnOnCompare} saving={savingGoals} />}
    </div>
  );
}
