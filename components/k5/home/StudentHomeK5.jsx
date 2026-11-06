"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { addMonths, format, isSameMonth, isSameWeek, isSameDay } from "date-fns";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { useK5CalendarModel } from "@/hooks/useK5CalendarModel";
import { OnboardingVideoModal } from "@/components/dashboard/OnboardingVideoModal";
import { GraduationCeremonyModal } from "@/components/dashboard/GraduationCeremonyModal";
import { EventDetailModal } from "@/components/dashboard/calendar/EventDetailModal";
import { JoinClassModal } from "@/components/dashboard/calendar/JoinClassModal";
import { K5Toolbar } from "@/components/k5/home/K5Toolbar";
import { ColourClues } from "@/components/k5/home/ColourClues";
import { CalendarPopup, MiniCalendar, MyCourses, TodayCard } from "@/components/k5/home/K5LeftColumn";
import { DayPlan } from "@/components/k5/home/DayPlan";
import { MonthPlan, WeekPlan } from "@/components/k5/home/WeekMonthPlans";
import { LiveClassAlert } from "@/components/k5/home/LiveClassAlert";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { getBrowserTimezone, resolveTimezone } from "@/utils/calendarEvents";
import { classTitle, dayAt, dayKey, keyToDate, weekKeys } from "@/utils/k5Calendar";
import { revealPlanTop } from "@/utils/k5Scroll";
import { picoSay, setPicoLive } from "@/components/k5/pico/picoEvents";

const LIVE_ALERT_KEY = "is-k5-live-alert:";


// "October 9, 16 and 28" for days of one month (a long list stops at 4 + "N more days").
function joinDays(keys) {
  const parts = keys.slice(0, 4).map((k, i) => format(keyToDate(k), i === 0 ? "MMMM d" : "d"));
  if (keys.length > 4) return `${parts.join(", ")} and ${keys.length - 4} more days`;
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
}

/** What the buddy says for a tapped colour clue, using this month's real plan (mockup copy). */
function clueText(key, days, now) {
  const month = format(now, "yyyy-MM");
  const monthDays = Object.keys(days)
    .filter((k) => k.startsWith(month))
    .sort();
  const todays = days[format(now, "yyyy-MM-dd")]?.classes || [];
  if (key === "assignment") {
    const due = monthDays.filter((k) => days[k].assignments.length);
    return due.length ? `Green dots are assignments. I lit them up for you: ${joinDays(due)}!` : "Green dots are assignments. You have none this month!";
  }
  if (key === "activity") {
    const k = monthDays.find((d) => days[d].activities.length);
    const a = k && days[k].activities[0];
    return a
      ? `Purple boxes are school activities, like ${a.title || a.eventTitle || "a school activity"} on ${format(keyToDate(k), "MMMM d")}!`
      : "Purple boxes are school activities. There are none this month!";
  }
  if (key === "holiday") {
    const off = monthDays.filter((k) => days[k].holidays.length);
    return off.length ? `Red boxes mean a holiday. ${joinDays(off)} ${off.length === 1 ? "is a holiday" : "are holidays"}. No school!` : "Red boxes mean a holiday. No holidays this month!";
  }
  if (key === "done") return "Gray circle boxes are classes you already finished. Great job!";
  if (key === "live") {
    return todays.some((c) => c.k5Status === "live")
      ? "Blue dashed boxes are live classes. Your teacher is online right now, so tap Join!"
      : "Blue dashed boxes are live classes. When one starts, tap Join!";
  }
  return "Yellow boxes are upcoming classes. They will start soon!";
}
const noSubscribe = () => () => {};
function readSession(key) {
  if (!key) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

// Same rule as the existing calendar: a class with a join link that hasn't finished joins on click.
const isJoinable = (event) => event.eventKind === "class" && Boolean(event.url) && event.k5Status !== "done";

/**
 * Grade K–5 dashboard home (plan Phase 2) — replaces StudentHome when isK5. Same data as
 * the existing calendar, laid out as the Playful.dc.html planner: toolbar, colour clues,
 * a left column (mini calendar, Today, My Courses) and the Day / Week / Month plan.
 * The onboarding video and graduation popups behave exactly as on the existing home.
 */
export function StudentHomeK5() {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });

  // Clock and events use the student's configured timezone (Asia/Singapore when missing or
  // invalid). Dummy data is generated around the viewer's own clock, so dummy mode uses it.
  const ready = dummy.settled && !dashboardData.isLoading;
  const timezone = dummy.enabled ? getBrowserTimezone() : resolveTimezone(dashboardData.userTimezone);

  return (
    <>
      {ready ? (
        <K5Planner key={timezone} timezone={timezone} />
      ) : (
        <div className={`${K5_CARD} p-10 text-center text-lg font-extrabold text-k5-mut`}>Getting your plan ready…</div>
      )}
      <OnboardingVideoModal videoUrl={dashboardData.videoUrl} />
      {dashboardData.showGraduationCeremonyPopup && (
        <GraduationCeremonyModal
          registrationDeadline={dashboardData.graduationCeremonyRegistrationDeadline}
          studentEmail={dashboardData.studentEmail}
        />
      )}
    </>
  );
}

function K5Planner({ timezone }) {
  const { context, isPreK, isSelfStudy } = useDashboardContext();
  const model = useK5CalendarModel({ schoolUUID: context?.schoolUUID, userId: context?.userId, timezone });
  const [clue, setClue] = useState(null);
  const [calOpen, setCalOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState(null);
  const [joiningEvent, setJoiningEvent] = useState(null);
  const firstName = String(context?.userName || "").split(" ")[0];

  const { viewName, setViewName, selectedDate, selectedKey, todayKey, now, days } = model;
  const view = isPreK && viewName === "month" ? "today" : viewName;

  // Opening a day (from the week, the month or the mini calendar) switches to its Day plan: bring it
  // into view when it is off-screen, but never move a page that already shows it.
  const planRef = useRef(null);
  const revealPlan = useRef(false);
  const openDayAndShow = (date) => {
    if (view !== "today" || dayKey(date) !== selectedKey) revealPlan.current = true;
    model.openDay(date);
  };
  useEffect(() => {
    if (!revealPlan.current) return;
    revealPlan.current = false;
    revealPlanTop(planRef.current);
  }, [selectedKey, view]);

  const open = (event) => (isJoinable(event) ? setJoiningEvent(event) : setDetailEvent(event));

  // Live-class alert: until the student answers it, once per live class per session.
  const liveNow = dayAt(days, todayKey).classes.find((c) => c.k5Status === "live" && c.url);
  const alertKey = liveNow ? `${LIVE_ALERT_KEY}${context?.userId}:${liveNow.id}` : null;
  const alertSeen = useSyncExternalStore(noSubscribe, () => readSession(alertKey), () => "1");
  const [answeredAlertId, setAnsweredAlertId] = useState(null);
  const alertEvent = liveNow && !model.isLoading && !alertSeen && answeredAlertId !== liveNow.id ? liveNow : null;
  const answerAlert = () => {
    setAnsweredAlertId(liveNow?.id ?? null);
    try {
      if (alertKey) window.sessionStorage.setItem(alertKey, "1");
    } catch {
      // storage unavailable: the alert may show again on the next load
    }
  };

  // Tell the buddy about the live class: the plan is ready, the popup waits for an answer, and the real class title.
  const liveName = liveNow ? classTitle(liveNow) : "";
  const alertPending = Boolean(alertEvent);
  useEffect(() => {
    setPicoLive({ ready: !model.isLoading, pending: alertPending, name: liveName });
  }, [model.isLoading, alertPending, liveName]);
  useEffect(() => () => setPicoLive({ ready: false, pending: false, name: "" }), []);

  const isCurrent =
    view === "week" ? isSameWeek(selectedDate, now, { weekStartsOn: 1 }) : view === "month" ? isSameMonth(selectedDate, now) : isSameDay(selectedDate, now);

  return (
    <div className="flex flex-col gap-4">
      {/* Mockup .sbcard: parents can add another child from the home page. Same "coming soon" as the legacy header until the sibling flow is wired. */}
      <section aria-label="Have another child to enroll?" className={`${K5_CARD} flex flex-wrap items-center gap-3.5 px-5 py-3.5`}>
        <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-[18px] bg-k5-act text-k5-acx">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3.6" />
            <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
            <path d="M19 7v6M16 10h6" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5">
          <h2 className="m-0 font-k5-display text-[22px] font-semibold leading-[1.2]">Have another child to enroll?</h2>
          <p className="m-0 text-base font-extrabold leading-[1.4] text-k5-mut">Your details are already saved, so you only need to fill in your child’s details.</p>
        </div>
        <button
          type="button"
          onClick={() => toast("Add More Siblings — coming soon", { icon: "🚧" })}
          className="flex min-h-12 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-k5-ac bg-k5-ac px-[18px] font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] max-[760px]:flex-[1_1_100%] max-[760px]:justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add More Siblings
        </button>
      </section>
      <K5Toolbar
        now={now}
        timezone={timezone}
        viewName={view}
        onView={setViewName}
        selectedDate={selectedDate}
        onPrev={model.goPrev}
        onNext={model.goNext}
        onToday={model.goToday}
        isCurrent={isCurrent}
        isPreK={isPreK}
      />
      <ColourClues
        clue={clue}
        isPreK={isPreK}
        onClue={(key) => {
          setClue(key);
          if (!key) return;
          // The student stays on the view they picked; matching boxes light up there and the
          // buddy explains the clue with the student's own dates.
          picoSay(clueText(key, days, now), "clues");
        }}
      />

      <div className="flex flex-wrap items-start gap-5">
        <div className="sticky top-[calc(var(--maintenance-banner-h,0px)+100px)] box-border flex max-h-[calc(100vh-120px)] min-w-0 flex-[1_1_300px] flex-col gap-4 overflow-y-auto pb-3 pr-1 [scrollbar-width:thin] max-[1100px]:static max-[1100px]:max-h-none max-[1100px]:overflow-visible">
          <MiniCalendar
            selectedDate={selectedDate}
            todayKey={todayKey}
            days={days}
            onPick={openDayAndShow}
            onMonth={(dir) => model.setSelectedDate((d) => addMonths(d, dir))}
          />
          <TodayCard todayKey={todayKey} days={days} />
          <MyCourses courseRegistry={model.courseRegistry} courseVisibility={model.courseVisibility} onToggle={model.toggleCourseVisibility} />
        </div>

        {/* Mobile (mockup .duo>[data-pin=plan]{order:-1}): the plan comes before the left column. */}
        <section ref={planRef} aria-label="My plans" data-pin="plan" className={`${K5_CARD} scroll-mt-[120px] @container box-border flex min-w-0 flex-[999_1_460px] flex-col gap-[18px] p-[22px] max-[760px]:order-first max-[560px]:p-3.5`}>
          {model.isLoading ? (
            <p className="m-0 p-10 text-center text-lg font-extrabold text-k5-mut">Loading your plan…</p>
          ) : model.isError ? (
            <p className="m-0 p-10 text-center text-lg font-extrabold text-k5-mut">Couldn&apos;t load your plan. Please try again shortly.</p>
          ) : view === "week" ? (
            <WeekPlan
              keys={weekKeys(selectedDate)}
              todayKey={todayKey}
              selectedKey={selectedKey}
              onSelect={model.setSelectedDate}
              days={days}
              courseRegistry={model.courseRegistry}
              clue={clue}
              isSelfStudy={isSelfStudy}
              onOpenDay={openDayAndShow}
              onOpenEvent={open}
            />
          ) : view === "month" ? (
            <MonthPlan
              selectedDate={selectedDate}
              selectedKey={selectedKey}
              todayKey={todayKey}
              days={days}
              courseRegistry={model.courseRegistry}
              clue={clue}
              isSelfStudy={isSelfStudy}
              onSelect={model.setSelectedDate}
              onOpenDay={openDayAndShow}
              onOpenEvent={open}
            />
          ) : (
            <DayPlan
              dateKey={selectedKey}
              todayKey={todayKey}
              now={now}
              days={days}
              clue={clue}
              isPreK={isPreK}
              isSelfStudy={isSelfStudy}
              firstName={firstName}
              onJoin={setJoiningEvent}
              onOpen={open}
              onPeek={model.setSelectedDate}
              onShowCalendar={() => setCalOpen(true)}
            />
          )}
        </section>
      </div>

      <CalendarPopup
        open={calOpen}
        onClose={() => setCalOpen(false)}
        selectedDate={selectedDate}
        todayKey={todayKey}
        days={days}
        onPick={openDayAndShow}
        onMonth={(dir) => model.setSelectedDate((d) => addMonths(d, dir))}
      />
      <LiveClassAlert
        event={alertEvent}
        now={now}
        firstName={firstName}
        onJoin={(event) => {
          answerAlert();
          // The buddy sends them off to the class they picked (the tour then skips its "class is live" tip).
          picoSay(`Off you go to ${classTitle(event)} class! Have fun learning${firstName ? `, ${firstName}` : ""}!`, "plan", { intro: true, skipLive: true });
          setJoiningEvent(event);
        }}
        onClose={() => {
          const name = alertEvent ? classTitle(alertEvent) : "";
          answerAlert();
          picoSay(`Okay! Your ${name ? `${name} ` : ""}class is still live. Tap the green Join class button when you are ready.`, "plan", { intro: true });
        }}
      />
      {detailEvent && <EventDetailModal event={detailEvent} courseRegistry={model.courseRegistry} onClose={() => setDetailEvent(null)} />}
      {joiningEvent && (
        <JoinClassModal event={joiningEvent} schoolUUID={context?.schoolUUID} courseRegistry={model.courseRegistry} onClose={() => setJoiningEvent(null)} />
      )}
    </div>
  );
}
