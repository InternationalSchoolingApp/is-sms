"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { addMonths, format } from "date-fns";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { useK5CalendarModel } from "@/hooks/useK5CalendarModel";
import { OnboardingVideoModal } from "@/components/dashboard/OnboardingVideoModal";
import { GraduationCeremonyModal } from "@/components/dashboard/GraduationCeremonyModal";
import { EventDetailModal } from "@/components/dashboard/calendar/EventDetailModal";
import { JoinClassModal } from "@/components/dashboard/calendar/JoinClassModal";
import { titles } from "@/components/k5/home/K5Toolbar";
import { K5ClassesHeader } from "@/components/k5/home/K5ClassesHeader";
import { PlanChromeContext } from "@/components/k5/home/planChrome";
import { K5PlanFilters } from "@/components/k5/home/K5PlanFilters";
import { ColourClues } from "@/components/k5/home/ColourClues";
import { CalendarPopup, MiniCalendar, MyCourses, TodayCard } from "@/components/k5/home/K5LeftColumn";
import { DayPlan } from "@/components/k5/home/DayPlan";
import { K5Dashboard } from "@/components/k5/home/K5Dashboard";
import { MonthPlan, WeekPlan } from "@/components/k5/home/WeekMonthPlans";
import { LiveClassAlert } from "@/components/k5/home/LiveClassAlert";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { ZoomIn } from "@/components/motion/ZoomIn";
import { K5CompleteProfileModal } from "@/components/k5/home/K5CompleteProfileModal";
import { DUMMY_STUDENT_TIMEZONE, resolveTimezone } from "@/utils/calendarEvents";
import { classTitle, countStatuses, dayAt, dayKey, keyToDate, weekKeys } from "@/utils/k5Calendar";
import { celebrate } from "@/components/motion/canvas/celebrationEvents";
import { revealPlanTop } from "@/utils/k5Scroll";
import { picoSay, setPicoLive } from "@/components/k5/pico/picoEvents";
import { isChristmasKey, setChristmasPlanner } from "@/components/k5/christmas/christmasStore";
import { LIVE_ALERT_KEY } from "@/utils/liveAlertMemory";
import { K5HomeLeftSkeleton, K5PlanSkeleton } from "@/components/k5/K5Skeletons";



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
 * holdProfilePopup: the "Complete Your Profile" popup waits (the contact check comes first, StudentHomeForGrade.jsx).
 */
export function StudentHomeK5({ holdProfilePopup = false, dashboard = false }) {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });

  // Clock and events use the student's configured timezone (Asia/Singapore when missing or
  // invalid). Dummy data is generated around the viewer's own clock, so dummy mode uses it.
  const ready = dummy.settled && !dashboardData.isLoading;
  const timezone = dummy.enabled ? DUMMY_STUDENT_TIMEZONE : resolveTimezone(dashboardData.userTimezone);

  return (
    <>
      {ready ? (
        <K5Planner key={timezone} timezone={timezone} dashboard={dashboard} />
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
      {!holdProfilePopup && <K5CompleteProfileModal />}
    </>
  );
}

function K5Planner({ timezone, dashboard = false }) {
  const { context, isPreK, isSelfStudy } = useDashboardContext();
  // The month prefetch (the mini calendar dots) is for My Classes only: the dashboard home has no mini calendar any more.
  const model = useK5CalendarModel({ schoolUUID: context?.schoolUUID, userId: context?.userId, timezone, prefetchMonth: !dashboard });
  const [clue, setClue] = useState(null);
  const [calOpen, setCalOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState(null);
  const [joiningEvent, setJoiningEvent] = useState(null);
  const firstName = String(context?.userName || "").split(" ")[0];

  const { viewName, setViewName, selectedDate, selectedKey, todayKey, now, days } = model;
  const view = isPreK && viewName === "month" ? "today" : viewName;

  // "My Classes and Activities" (Playful.dc.html, Middle.dc.html, High.dc.html): a header card on top, and the Today / Week / Month
  // switch and the previous / next arrows inside the plan card (planChrome.jsx), in every look.
  const [titleBig, titleSmall] = titles(view, selectedDate);
  const unit = view === "week" ? "week" : view === "month" ? "month" : "day";
  const chrome = {
    viewName: view,
    onView: setViewName,
    onToday: model.goToday,
    onPrev: model.goPrev,
    onNext: model.goNext,
    prevLabel: `Previous ${unit}`,
    nextLabel: `Next ${unit}`,
    // Week: the range is the big text and the year the small one (the heading already says "My Week").
    titleBig: view === "week" ? titleSmall : titleBig,
    titleSmall: view === "week" ? format(selectedDate, "yyyy") : titleSmall,
    isPreK,
  };

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

  // Live-class alert: until the student answers it, once per live class per login (utils/liveAlertMemory.js).
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
  // Nothing planned today (no class, no activity), and the holiday's name when it is one: the buddy's plan tip says so.
  const todayPlan = dayAt(days, todayKey);
  const dayIsEmpty = todayPlan.classes.length === 0 && todayPlan.activities.length === 0;
  const todayHoliday = todayPlan.holidays[0];
  const holidayName = todayHoliday ? todayHoliday.title || todayHoliday.eventTitle || "Holiday" : "";
  const alertPending = Boolean(alertEvent);
  useEffect(() => {
    setPicoLive({ ready: !model.isLoading, pending: alertPending, name: liveName, dayEmpty: dayIsEmpty, holidayName });
  }, [model.isLoading, alertPending, liveName, dayIsEmpty, holidayName]);
  useEffect(() => () => setPicoLive({ ready: false, pending: false, name: "", dayEmpty: false, holidayName: "" }), []);

  // My Classes tells the Christmas theme which screen is open: 25 December in the Day view, or in the Month view with it selected.
  useEffect(() => {
    if (dashboard) return;
    setChristmasPlanner({ onXmasDay: (view === "today" || view === "month") && isChristmasKey(selectedKey), viewKey: `${view}:${selectedKey}` });
  }, [dashboard, view, selectedKey]);
  useEffect(() => () => setChristmasPlanner({ onXmasDay: false, viewKey: "" }), []);

  // Celebration: every class and activity of today is done. Once per student per day (remembered on this device; if the
  // device cannot remember, nothing is played rather than risking a repeat on every visit). It waits a moment so it does
  // not collide with the page zooming in, and it only plays on the home page where the day plan lives.
  const todayDay = dayAt(days, todayKey);
  const todayCounts = countStatuses([...todayDay.classes, ...todayDay.activities]);
  const dayComplete = !model.isLoading && todayCounts.done > 0 && todayCounts.live === 0 && todayCounts.next === 0;
  const userKey = context?.userId;
  useEffect(() => {
    if (!dayComplete || !userKey) return undefined;
    const timer = setTimeout(() => {
      const key = `is-day-celebrated:${userKey}:${todayKey}`;
      try {
        if (window.localStorage.getItem(key)) return;
        window.localStorage.setItem(key, "1");
      } catch {
        return;
      }
      celebrate({ kind: "day-complete" });
    }, 800);
    return () => clearTimeout(timer);
  }, [dayComplete, userKey, todayKey]);

  return (
    <PlanChromeContext.Provider value={chrome}>
    <div className="flex flex-col gap-4">
      {dashboard ? (
        <K5Dashboard now={now} timezone={timezone} days={days} todayKey={todayKey} isLoading={model.isLoading} firstName={firstName} onJoin={setJoiningEvent} onOpenActivity={setDetailEvent} />
      ) : (
        <>
      <K5ClassesHeader now={now} timezone={timezone} />
      <ColourClues
        clue={clue}
        isPreK={isPreK}
        showHint={false}
        onClue={(key) => {
          setClue(key);
          if (!key) return;
          // The student stays on the view they picked; matching boxes light up there and the
          // buddy explains the clue with the student's own dates.
          picoSay(clueText(key, days, now), "clues");
        }}
      />

      {!isPreK && <K5PlanFilters filters={model.filters} onToggle={model.toggleFilter} />}

      <div className="flex flex-wrap items-start gap-5 in-data-[hand=left]:flex-row-reverse">
        <div className="sticky top-[calc(var(--maintenance-banner-h,0px)+100px)] box-border flex min-w-0 flex-[1_1_300px] flex-col gap-4 pb-3 max-[1100px]:static">
          <MiniCalendar
            selectedDate={selectedDate}
            todayKey={todayKey}
            days={days}
            onPick={openDayAndShow}
            onMonth={(dir) => model.setSelectedDate((d) => addMonths(d, dir))}
          />
          {/* The Today card and My Courses are switched off for now, so the left column is only the mini calendar and there is nothing
              to show a skeleton for (K5HomeLeftSkeleton draws exactly these two cards; bring it back together with them).
          {model.isLoading ? (
            <K5HomeLeftSkeleton />
          ) : (
            <>
              <ZoomIn index={0}><TodayCard todayKey={todayKey} days={days} courseRegistry={model.courseRegistry} onOpen={open} /></ZoomIn>
              <ZoomIn index={1}><MyCourses courseRegistry={model.courseRegistry} courseVisibility={model.courseVisibility} onToggle={model.toggleCourseVisibility} /></ZoomIn>
            </>
          )}
          */}
        </div>

        {/* Mobile (mockup .duo>[data-pin=plan]{order:-1}): the plan comes before the left column. */}
        <section ref={planRef} aria-label="My plans" data-pin="calendar" className={`${K5_CARD} k5h-pcard scroll-mt-[120px] @container box-border flex min-w-0 flex-[999_1_460px] flex-col gap-[18px] p-[22px] max-[760px]:order-first max-[560px]:p-3.5`}>
          {model.isLoading ? (
            <K5PlanSkeleton />
          ) : (
            <ZoomIn index={2} className="flex flex-col gap-[18px]">
          {model.isError ? (
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
              onShowCalendar={() => setCalOpen(true)}
            />
          )}
            </ZoomIn>
          )}
        </section>
      </div>
        </>
      )}

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
    </PlanChromeContext.Provider>
  );
}
