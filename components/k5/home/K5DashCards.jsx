"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { addDays, format } from "date-fns";
import { openLmsLesson } from "@/utils/lmsCourseLink";
import { Skeleton } from "@/components/ui/skeleton";
import { K5_CARD, SubjectTile } from "@/components/k5/home/k5Bits";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentAcademicPerformance } from "@/hooks/useStudentAcademicPerformance";
import { asArray, daysTo, fmtShort, num } from "@/components/k5/pages/k5PerformanceData";
import { cleanCourseLabel, keyToDate } from "@/utils/k5Calendar";
import { getPendingAssignmentCount } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

/*
 * Step 3 of the Playful "My Dashboard" (Playful.dc.html pgLms): the My Performance card (goal, finish date, how far the
 * student is against today's target) and the My Assignments card (one red row for the work still owed, then what is due today and tomorrow, each with Start).
 * My Performance is worked out by the same backend call as the Academic Performance page (useStudentAcademicPerformance),
 * so its numbers match that page; My Assignments come from the planner's own calendar days. Nothing new is fetched.
 */

const CARD = `${K5_CARD} box-border flex flex-col rounded-[30px]`;
const LINK = "dash-viewAll text-sm font-semibold text-k5-acx no-underline py-2";

function Heading({ icon, tint, children }) {
  return (
    <h2 className="dash-h2 m-0 flex items-center gap-2 text-[21px] font-semibold">
      <span className={`dash-ico flex h-8 w-8 items-center justify-center rounded-full ${tint}`}>{icon}</span>
      <span>{children}</span>
    </h2>
  );
}

function GoalBox({ tone, icon, label, value }) {
  return (
    <div className="lmgb flex min-w-0 flex-[1_1_190px] items-center gap-3 rounded-[20px] border-[3px] px-4 py-3" style={tone}>
      <span aria-hidden="true" className="lmgi flex h-[50px] w-[50px] flex-none items-center justify-center rounded-full border-[3px] bg-white" style={{ borderColor: tone.borderColor }}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="dash-pLabel text-[13px] font-bold uppercase tracking-[0.05em] text-[#1C2640]">{label}</span>
        <b className="dash-pValue font-k5-display text-[26px] font-semibold text-[#1C2640]">{value}</b>
      </span>
    </div>
  );
}

const GOLD = { background: "linear-gradient(135deg,#FFF8DE 0%,#FFE6A0 100%)", borderColor: "#F2BE2E", boxShadow: "0 5px 0 #D9A10C" };
const GREEN = { background: "linear-gradient(135deg,#E6F8EC 0%,#BDEBCD 100%)", borderColor: "#3FB76D", boxShadow: "0 5px 0 #249A50" };

export function MyPerformanceCard({ firstInitial }) {
  const { school } = useParams();
  const { context } = useDashboardContext();
  const { isLoading, performance } = useStudentAcademicPerformance({ schoolUUID: context?.schoolUUID, userId: context?.userId, k5Performance: true });
  const perfHref = `/${school}/student/student-progress-report`;

  const goals = performance?.goals || null;
  const courses = asArray(performance?.courses);
  const today = performance?.today;
  const n = courses.length;
  // Same figures as My Performance > My goals: the average course progress against the average time used so far.
  const ov = n ? courses.reduce((s, c) => s + (num(c.progress) ?? 0), 0) / n : 0;
  const exp = n ? courses.reduce((s, c) => s + (num(c.target) ?? 0), 0) / n : 0;
  const pastFinish = Boolean(today && goals?.finishBy && goals.finishBy < today);
  const days = today && goals?.finishBy ? daysTo(goals.finishBy, today) : null;
  const done = Math.min(100, Math.round(ov));
  const target = Math.min(100, Math.round(exp));

  return (
    <section aria-label="My Performance" className={`${CARD} min-w-[520px] flex-[2_1_0] gap-3.5 px-[22px] pb-[22px] pt-5 max-[760px]:min-w-0 max-[760px]:basis-full`}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Heading
          tint="bg-[#FFE0EC] text-[#C2408A]"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v18h18" />
              <path d="M7 15l4-4 3 3 5-6" />
            </svg>
          }
        >
          My Performance
        </Heading>
        <div className="ms-auto flex items-center gap-4">
          <Link
            href={perfHref}
            className="dash-setGoals flex min-h-10 items-center gap-2 rounded-full border-[3px] border-k5-ac bg-k5-ac px-4 font-k5-display text-[15px] font-semibold text-white no-underline shadow-[0_4px_0_var(--k5-acd)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            Set my goals
          </Link>
          <Link href={perfHref} className={LINK}>
            View all
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div aria-busy="true" aria-label="Loading your performance" className="flex flex-col gap-3">
          <Skeleton className="h-[88px] rounded-[22px]" />
          <Skeleton className="h-[150px] rounded-[22px]" />
        </div>
      ) : !goals?.finishBy ? (
        <p className="m-0 rounded-[22px] bg-k5-act px-5 py-6 text-center text-base font-extrabold text-k5-mut">Your performance shows here after the next daily update.</p>
      ) : (
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-[22px] bg-k5-act px-5 py-[18px]">
          <span aria-hidden="true" className="k5-pkspark absolute end-[22px] top-3 h-2.5 w-2.5 rounded-full bg-[#FFC531]" />
          <span aria-hidden="true" className="k5-pkspark absolute bottom-3.5 end-16 h-[7px] w-[7px] rounded-full bg-[#FF8FA3] [animation-delay:.6s]" />
          <span aria-hidden="true" className="k5-pkspark absolute end-[110px] top-[26px] h-1.5 w-1.5 rounded-full bg-k5-ac [animation-delay:1.1s]" />
          <div className="flex flex-wrap gap-3">
            <GoalBox
              tone={GOLD}
              label="AIM FOR"
              value={`${goals.score}% average`}
              icon={
                <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="#FFC531" stroke="#B87A00" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="10" cy="11.5" r=".9" fill="#2A2F4A" />
                  <circle cx="14" cy="11.5" r=".9" fill="#2A2F4A" />
                  <path d="M10.4 13.6q1.6 1.4 3.2 0" fill="none" stroke="#2A2F4A" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              }
            />
            <GoalBox
              tone={GREEN}
              label="FINISH BY"
              value={fmtShort(goals.finishBy)}
              icon={
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 21V4" stroke="#2A2F4A" strokeWidth="2.2" strokeLinecap="round" />
                  <path className="lmflag" d="M6.5 5h11l-3 4 3 4h-11z" fill="#E8455E" stroke="#2A2F4A" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
          <div className="flex flex-col gap-2.5 rounded-[22px] border-[3px] border-k5-line bg-k5-card px-[18px] py-4">
            <span className="flex flex-wrap items-baseline justify-between gap-2.5">
              <b className="dash-compT font-k5-display text-lg font-semibold">Completion</b>
              <span>
                <b className="dash-compPct font-k5-display text-[32px] font-semibold leading-none">{done}%</b> <span className="dash-compDone text-[15px] font-black text-k5-mut">done</span>
              </span>
            </span>
            <div role="img" aria-label={`You are ${done}% of the way. Today’s target is ${target}%.`} className="relative me-3.5 ms-1.5 h-[70px]">
              <span aria-hidden="true" className="absolute inset-x-0 top-[34px] h-[22px] rounded-full bg-[#5B6478] shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]" />
              <span aria-hidden="true" className="absolute inset-x-2.5 top-[44px] h-0 border-t-[3px] border-dashed border-white/85" />
              <span aria-hidden="true" className="absolute start-0 top-[34px] h-[22px] rounded-full bg-k5-grn shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]" style={{ width: `${done}%` }} />
              <span aria-hidden="true" className="absolute top-[26px] -ms-0.5 h-[38px] w-1 rounded-sm bg-[#2A2F4A]" style={{ insetInlineStart: `${target}%` }} />
              <span aria-hidden="true" className="absolute top-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#2A2F4A] px-2 py-px text-[11px] font-black text-white" style={{ insetInlineStart: `${target}%` }}>
                Today
              </span>
              <span
                aria-hidden="true"
                className="k5-pkme absolute top-[22px] -ms-5 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-k5-grn bg-white font-k5-display text-[17px] font-bold text-k5-grnd shadow-[0_3px_0_rgba(28,38,64,.2)]"
                style={{ insetInlineStart: `${done}%` }}
              >
                {firstInitial}
              </span>
              <svg aria-hidden="true" width="34" height="48" viewBox="0 0 34 48" className="absolute -end-3.5 top-0 block">
                <path d="M5 46 V4" stroke="#2A2F4A" strokeWidth="3.5" strokeLinecap="round" />
                <path className="k5-pkflag" d="M6 5 h22 l-5 7 5 7 h-22 z" fill="#E8455E" stroke="#2A2F4A" strokeWidth="2.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 dash-chip rounded-full border-2 border-k5-line bg-k5-soft px-3 py-1 text-[13px] font-semibold text-k5-ink">
                <span aria-hidden="true" className="block h-3.5 w-1 rounded-sm bg-[#2A2F4A]" />
                Today’s target {target}%
              </span>
              {days != null && (
                <span className="inline-flex items-center gap-1.5 dash-chip rounded-full border-2 border-k5-line bg-k5-soft px-3 py-1 text-[13px] font-semibold text-k5-ink">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
                    <path d="M8 3v4M16 3v4M3.5 10h17" />
                  </svg>
                  {pastFinish ? "Past your finish date" : `${days} days left`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** "Due today" / "Due tomorrow" / "Due Dec 3, 2026" / "Overdue", red when it is due today or tomorrow or late. */
function dueText(dateKey, todayKey) {
  const day = keyToDate(dateKey);
  const diff = Math.round((day.getTime() - keyToDate(todayKey).getTime()) / 86_400_000);
  const date = format(day, "MMM d, yyyy");
  if (diff < 0) return [`Overdue · ${date}`, true];
  if (diff === 0) return ["Due today", true];
  if (diff === 1) return ["Due tomorrow", true];
  return [`Due ${date}`, false];
}

export function MyAssignmentsCard({ days, todayKey, isLoading }) {
  const { school } = useParams();
  const { context, lmsProviderURL, isPayLmsPaymentPending } = useDashboardContext();
  const dummy = useDummyStudent();
  // "View all" goes to My Performance and glides down to the My courses card (K5Performance reads ?go=courses).
  const allHref = `/${school}/student/student-progress-report?go=courses`;
  // What is due today and tomorrow and not handed in yet (today's are in Today's Goal as well).
  const tomorrowKey = format(addDays(keyToDate(todayKey), 1), "yyyy-MM-dd");
  const next = [todayKey, tomorrowKey]
    .flatMap((key) => (days[key]?.assignments || []).map((a) => ({ a, key })))
    .filter(({ a }) => a.k5Assignment?.status !== "submitted");
  // Everything still owed since the academic year start, as one red row: the backend counts it (dashboard/pending-assignment-count,
  // only the number). Not in the counselor's dummy view.
  const schoolUUID = context?.schoolUUID;
  const userId = context?.userId;
  const pending = useQuery({
    queryKey: ["student-pending-assignment-count", schoolUUID, userId, todayKey],
    queryFn: () => getPendingAssignmentCount({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId && dummy.settled && !dummy.enabled) && !isLoading,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const overdue = Number(pending.data?.details?.pendingAssignmentCount) || 0;
  // Start behaves like the header's LMS switch: the LMS opens in a new tab (or the pending-payment message shows).
  const start = () => openLmsLesson({ isPayLmsPaymentPending, lmsProviderUrl: lmsProviderURL });

  return (
    <section aria-label="My Assignments" className={`${CARD} min-w-[300px] flex-[1_1_0] gap-[11px] px-[18px] py-5 max-[760px]:min-w-0 max-[760px]:basis-full`}>
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <Heading
          tint="bg-[#D9F5E8] text-[#0B7A52]"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="6" y="4" width="12" height="17" rx="2" />
              <path d="M9 3h6v3H9zM9 13l2 2 4-4" />
            </svg>
          }
        >
          My Assignments
        </Heading>
        <Link href={allHref} className={LINK}>
          View all
        </Link>
      </div>
      {!isLoading && pending.isLoading && <Skeleton aria-label="Loading overdue assignments" className="h-[62px] rounded-[20px]" />}
      {!isLoading && overdue > 0 && (
        <div className="box-border flex min-h-[62px] items-center gap-3.5 rounded-[20px] border-2 border-[#F5B8C1] bg-k5-rt py-2 pl-2 pr-2.5">
          <span aria-hidden="true" className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[14px] bg-white text-[#D7263D]">
            <CircleAlert className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="dash-asgTitle m-0 text-sm font-semibold">
              {overdue} assignment{overdue === 1 ? "" : "s"} overdue
            </p>
            <p className="m-0 mt-0.5 text-xs font-semibold text-[#D7263D]">Finish them soon</p>
          </div>
          <Link href={allHref} className="dash-start flex h-8 flex-none items-center rounded-2xl bg-k5-ac px-3.5 font-k5-display text-[13px] font-semibold text-white no-underline shadow-[0_3px_0_var(--k5-acd)]">
            View
          </Link>
        </div>
      )}
      {isLoading ? (
        <div aria-busy="true" aria-label="Loading your assignments" className="flex flex-col gap-[11px]">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[62px] rounded-[20px]" />
          ))}
        </div>
      ) : next.length === 0 ? (
        overdue > 0 ? null : <p className="m-0 rounded-[20px] bg-k5-soft px-4 py-6 text-center text-[15px] font-extrabold text-k5-mut">Nothing due today or tomorrow. Great job!</p>
      ) : (
        next.map(({ a, key }, i) => {
          const [due, urgent] = dueText(key, todayKey);
          return (
            <div key={`${a.id}-${i}`} className="box-border flex min-h-[62px] items-center gap-3.5 rounded-[20px] border-2 border-k5-line bg-k5-soft py-2 pl-2 pr-2.5">
              <SubjectTile name={a.subjectName || a.title || ""} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="dash-asgTitle m-0 text-sm font-semibold">{a.title || a.eventTitle || "Assignment"}</p>
                
                {a.subjectName && <p className="m-0 mt-px text-xs font-semibold text-k5-mut">{cleanCourseLabel(a.subjectName)}</p>}
                <p className="m-0 mt-0.5 text-xs font-semibold" style={{ color: urgent ? "#D7263D" : "var(--k5-mut)" }}>
                  {due}
                </p>
              </div>
              <button type="button" onClick={start} className="dash-start h-8 flex-none cursor-pointer rounded-2xl border-none bg-k5-ac px-3.5 font-k5-display text-[13px] font-semibold text-white shadow-[0_3px_0_var(--k5-acd)]">
                Start
              </button>
            </div>
          );
        })
      )}
    </section>
  );
}
