"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useChristmas } from "@/components/k5/christmas/ChristmasProvider";
import { useParams } from "next/navigation";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarDays, Check, Gamepad2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { K5_CARD, SubjectIcon } from "@/components/k5/home/k5Bits";
import { MyAssignmentsCard, MyPerformanceCard } from "@/components/k5/home/K5DashCards";
import { K5ClockIcon } from "@/components/k5/home/K5ClockIcon";
import { HeroMoon, SCENE_LABEL, Umbrella, WeatherIcon, WeatherScene, sceneOf } from "@/components/k5/home/K5HeroWeather";
import { useK5Weather } from "@/hooks/useK5Weather";
import { activityTitle, classTitle, cleanCourseLabel, dayAt, gameAccess, subjectStyle, teacherName, timeRange, timeLabel } from "@/utils/k5Calendar";

/*
 * Playful "My Dashboard" (Playful.dc.html pgLms, the home of a K–5 / Playful-look student). This file is Step 2: the hero
 * (sky, date / clock / weather strip, greeting, the class that is live now with Join) and Today's Goal (a ring of what is
 * done today with the classes still to do). My Performance and My Assignments follow in Step 3.
 * Everything comes from the planner's own data (useK5CalendarModel days + the weather hook): nothing new is fetched.
 */

/** A link to My Classes that is not drawn at all when the student's role does not have that module (href is null). */
function ClassesLink({ href, ...props }) {
  return href ? <Link href={href} {...props} /> : null;
}

const greeting = (hour) => (hour < 12 && hour >= 5 ? "Good Morning" : hour < 17 && hour >= 12 ? "Good Afternoon" : "Good Evening");
const zoneLabel = (timezone) => `${String(timezone).split("/").pop().replace(/_/g, " ")} time`;
const RING = 339.3; // circumference of the r=54 goal ring

const SECTION_CARD = `${K5_CARD} box-border flex flex-col`;

/** The strip's clock ticks every second (the planner's own "now" only moves every few seconds), in the student's timezone. */
function useSecondClock(timezone, initial) {
  const [tick, setTick] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => setTick(toZonedTime(new Date(), timezone)), 1000);
    return () => clearInterval(id);
  }, [timezone]);
  return tick;
}

function DateStrip({ now, timezone, weather, night, scene }) {
  const clock = useSecondClock(timezone, now);
  const label = weather ? (night && scene === "sun" ? "Clear sky" : SCENE_LABEL[scene]) : "";
  return (
    <div className="hstrip backdrop-blur-[10px] backdrop-saturate-[1.4]" data-scene={scene} role="group" aria-label="Today">
      <span className="hs-wave" aria-hidden="true">
        <svg className="hs-wv1" viewBox="0 0 2400 40" preserveAspectRatio="none">
          <path d="M0 18Q30 6 60 18T120 18T180 18T240 18T300 18T360 18T420 18T480 18T540 18T600 18T660 18T720 18T780 18T840 18T900 18T960 18T1020 18T1080 18T1140 18T1200 18T1260 18T1320 18T1380 18T1440 18T1500 18T1560 18T1620 18T1680 18T1740 18T1800 18T1860 18T1920 18T1980 18T2040 18T2100 18T2160 18T2220 18T2280 18T2340 18T2400 18V40H0Z" fill="#FFFFFF" fillOpacity=".32" />
        </svg>
        <svg className="hs-wv2" viewBox="0 0 2400 40" preserveAspectRatio="none">
          <path d="M0 22Q22.5 12 45 22T90 22T135 22T180 22T225 22T270 22T315 22T360 22T405 22T450 22T495 22T540 22T585 22T630 22T675 22T720 22T765 22T810 22T855 22T900 22T945 22T990 22T1035 22T1080 22T1125 22T1170 22T1215 22T1260 22T1305 22T1350 22T1395 22T1440 22T1485 22T1530 22T1575 22T1620 22T1665 22T1710 22T1755 22T1800 22T1845 22T1890 22T1935 22T1980 22T2025 22T2070 22T2115 22T2160 22T2205 22T2250 22T2295 22T2340 22T2385 22T2430 22V40H0Z" fill="#FFFFFF" fillOpacity=".22" />
        </svg>
      </span>
      {scene === "rain" && <Umbrella />}
      <div className="hs-sec hs-date">
        <svg className="hs-cal" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
          <g fill="#FFFFFF" stroke="none">
            <circle cx="8" cy="14" r="0.9" />
            <circle cx="12" cy="14" r="0.9" />
            <circle cx="16" cy="14" r="0.9" />
            <circle cx="8" cy="17.2" r="0.9" />
            <circle cx="12" cy="17.2" r="0.9" />
            <circle cx="16" cy="17.2" r="0.9" />
          </g>
        </svg>
        <div className="hs-txt">
          <span className="hs-d1">{format(now, "EEEE")}</span>
          <span className="hs-d2">{format(now, "MMM d, yyyy")}</span>
        </div>
      </div>
      <span className="hs-div" aria-hidden="true" />
      <div className="hs-sec hs-mid">
        <div className="hs-time">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5B3FD4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.2 2" />
          </svg>
          <span className="hs-tm">
            <b>{format(clock, "h:mm:ss a")}</b>
            <small>{zoneLabel(timezone)}</small>
          </span>
        </div>
      </div>
      <span className="hs-div" aria-hidden="true" />
      <div className="hs-sec hs-wx">
        {weather ? (
          <>
            <WeatherIcon scene={scene} night={night} />
            <div className="hs-txt">
              <span className="hs-t1">{Math.round(weather.celsius)}°C</span>
              <span className="hs-t2">{label}</span>
            </div>
          </>
        ) : (
          <Skeleton className="h-10 w-28 rounded-2xl bg-white/40" />
        )}
      </div>
    </div>
  );
}


// The class tile of the hero card (mockup: a 52px dark rounded square with the course icon in white). Science is the
// mockup's green flask; every other subject gets the same tile in its own colour.
const TILE_COLORS = {
  science: ["#2E7D5B", "#1E5E43", "#123D2C"],
  math: ["#3B7DE8", "#2358B8", "#17407F"],
  language: ["#D9568A", "#B03A6B", "#7E2549"],
  computer: ["#7C5CE0", "#5A3FB8", "#3E2A85"],
  civics: ["#C9930A", "#9C700A", "#6E4E08"],
  art: ["#E8762E", "#BF5A1B", "#8A3F10"],
  pe: ["#1E9E96", "#157871", "#0D5550"],
  book: ["#2E7D5B", "#1E5E43", "#123D2C"],
};
function ClassTile({ name }) {
  const { icon } = subjectStyle(name);
  const [from, to, rim] = TILE_COLORS[icon] || TILE_COLORS.book;
  return (
    <span aria-hidden="true" className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl" style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 3px 0 ${rim}` }}>
      {icon === "science" ? (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3M7 15h10" />
        </svg>
      ) : (
        <SubjectIcon name={name} className="h-[30px] w-[30px] text-white" />
      )}
    </span>
  );
}

/** The little animated door at the end of the Join class button (mockup .lmjg): a student walks into the class. */
function JoinDoor() {
  return (
    <svg className="lmjg" width="57" height="38" viewBox="16 0 48 32" aria-hidden="true">
      <rect x="16" y="29" width="48" height="1.4" rx=".7" fill="#1E2242" opacity=".18" />
      <path d="M43.5 29V13a7.5 7.5 0 0 1 15 0v16z" fill="#C3CFEA" />
      <path d="M45.2 29V13.2a5.8 5.8 0 0 1 11.6 0V29z" fill="#3FA2FF" />
      <path d="M51 7.4a5.8 5.8 0 0 1 5.8 5.8V29h-9.6z" fill="#FFFFFF" opacity=".24" />
      <g className="lmjg-crowd">
        <circle cx="47.6" cy="22.4" r="2" fill="#2380F5" />
        <circle cx="51" cy="21.8" r="2" fill="#2380F5" />
        <circle cx="54.4" cy="22.4" r="2" fill="#2380F5" />
        <rect x="45.2" y="23.4" width="11.6" height="5.6" fill="#2380F5" />
      </g>
      <path className="lmjg-tw" d="M48.4 11.2l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4z" fill="#FFFFFF" />
      <path className="lmjg-tw lmjg-tw2" d="M53.6 9.4l.3.9.9.3-.9.3-.3.9-.3-.9-.9-.3.9-.3z" fill="#FFFFFF" />
      <path className="lmjg-glow" d="M45.2 29V13.2a5.8 5.8 0 0 1 11.6 0V29z" fill="#FFFFFF" opacity="0" />
      <g className="lmjg-hero">
        <g className="lmjg-wad">
          <circle cx="21" cy="16.6" r="2.9" fill="#14A8FF" />
          <path d="M18 29v-5.6a3 3 0 0 1 6 0V29z" fill="#14A8FF" />
        </g>
      </g>
    </svg>
  );
}

/** The card on the right of the hero: the class that is live now (Join), else the next one, else a friendly note. */
function ClassCard({ live, next, doneAll, hasClasses, onJoin, classesHref }) {
  const event = live || next;
  if (!event) {
    return (
      <div className="dash-cont relative flex min-w-[210px] flex-[0_2_340px] flex-col gap-3 rounded-3xl bg-k5-card p-4 pb-4 text-k5-ink shadow-[0_5px_0_rgba(0,40,140,0.35)] max-[760px]:min-w-0 max-[760px]:flex-[1_1_100%] @max-[640px]/hero:min-w-0 @max-[640px]/hero:flex-[1_1_100%]">
        <p className="m-0 font-k5-display text-[19px] font-semibold leading-tight">
          {!hasClasses ? "No classes today!" : doneAll ? "All your classes are done!" : "Nothing live right now"}
        </p>
        <p className="m-0 text-sm font-bold text-k5-mut">{!hasClasses ? "A free day. Time to play a game or read a book." : doneAll ? "Great job today! Time to play." : "Check your classes for what is next."}</p>
        <ClassesLink href={classesHref} className="flex h-[46px] items-center justify-center rounded-[23px] bg-[#FDDC75] font-k5-display text-[17px] font-semibold text-[#1E2242] no-underline shadow-[0_4px_0_#D9A21E]">
          Go to my classes
        </ClassesLink>
      </div>
    );
  }
  const teacher = teacherName(event);
  return (
    <div className="dash-cont relative flex min-w-[210px] flex-[0_2_340px] flex-col gap-3 rounded-3xl bg-k5-card p-4 pb-4 text-k5-ink shadow-[0_5px_0_rgba(0,40,140,0.35)] max-[760px]:min-w-0 max-[760px]:flex-[1_1_100%] @max-[640px]/hero:min-w-0 @max-[640px]/hero:flex-[1_1_100%]">
      <div className="flex items-center gap-3">
        <ClassTile name={classTitle(event)} />
        <div className="min-w-0">
          <p className="dash-liveName m-0 text-[17px] font-semibold leading-[1.2]">{classTitle(event)}</p>
          <p className="dash-liveLine m-0 mt-[3px] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-semibold tracking-[0.05em] text-k5-gx">
            {live ? (
              <>
                <span aria-hidden="true" className="k5-live-dot block h-[9px] w-[9px] flex-none rounded-full bg-k5-gi" />
                <span className="whitespace-nowrap">LIVE NOW · {timeRange(event)}</span>
              </>
            ) : (
              <span className="whitespace-nowrap text-[0.9375rem] font-[700]">UP NEXT · {timeRange(event) || timeLabel(event)}</span>
            )}
            {teacher && <span className="dash-liveWith whitespace-nowrap text-[13px] tracking-normal text-k5-ink">with {teacher}</span>}
          </p>
        </div>
      </div>
      {live?.url ? (
        <button
          type="button"
          onClick={() => onJoin(live)}
          className="lmjoin relative flex h-[46px] cursor-pointer items-center justify-center gap-2.5 overflow-hidden rounded-[23px] border-none bg-[#FDDC75] font-k5-display text-[17px] font-semibold text-[#1E2242] shadow-[0_4px_0_#D9A21E]"
        >
          <span className="k5-shine" aria-hidden="true" />
          Join class
          <JoinDoor />
        </button>
      ) : (
        <ClassesLink href={classesHref} className="flex h-[46px] items-center justify-center rounded-[23px] bg-[#FDDC75] font-k5-display text-[17px] font-semibold text-[#1E2242] no-underline shadow-[0_4px_0_#D9A21E]">
          Go to my classes
        </ClassesLink>
      )}
    </div>
  );
}

/** A hummingbird flying across the sky (mockup .hb-fly). */
function Bird({ body, wing, cls }) {
  return (
    <span className={`hb-fly ${cls}`}>
      <span className="hb-bob">
        <svg width="38" height="28" viewBox="0 0 38 28" aria-hidden="true">
          <path d="M10.5 17 L4 14 L5.5 20Z" fill={wing} stroke="#1E2242" strokeWidth="1.3" strokeLinejoin="round" />
          <g className="hb-w2">
            <path d="M14 15 Q16 26 23 17Z" fill={wing} stroke="#1E2242" strokeWidth="1.3" strokeLinejoin="round" />
          </g>
          <ellipse cx="18.5" cy="16" rx="9" ry="6.4" fill={body} stroke="#1E2242" strokeWidth="1.5" />
          <circle cx="26.5" cy="12" r="5.4" fill={body} stroke="#1E2242" strokeWidth="1.5" />
          <g className="hb-w">
            <path d="M13.5 14 Q17 1.5 25 13Z" fill={wing} stroke="#1E2242" strokeWidth="1.3" strokeLinejoin="round" />
          </g>
          <path d="M31.4 11.2 L35.4 12.6 L31.4 14Z" fill="#FF9F1C" stroke="#1E2242" strokeWidth="1.1" strokeLinejoin="round" />
          <circle cx="28.3" cy="11.2" r="1.3" fill="#1E2242" />
          <circle cx="29" cy="14" r="1.2" fill="#FF9EB5" opacity=".85" />
        </svg>
      </span>
    </span>
  );
}

function Hero({ now, timezone, firstName, live, next, doneAll, hasClasses, onJoin, classesHref, look }) {
  // 25 December: Santa flies across the blue hero and the greeting is "Merry Christmas" (mockups).
  const { festive } = useChristmas();
  const weather = useK5Weather(timezone);
  const night = weather ? !weather.isDay : now.getHours() < 6 || now.getHours() >= 18;
  const scene = sceneOf(weather);
  return (
    <section
      aria-label="My Dashboard"
      className="dash-hero relative box-border flex min-h-[262px] min-w-[520px] flex-[2_1_0] flex-col justify-center gap-[18px] overflow-hidden rounded-[30px] border-[3px] border-[#00398F] bg-[linear-gradient(100deg,#0166FE_0%,#288AFE_45%,#7DDAE3_85%,#8BE6D8_100%)] p-6 text-white shadow-[0_6px_0_#00398F] [container-name:hero] [container-type:inline-size] max-[760px]:min-w-0 max-[760px]:basis-full max-[760px]:p-4"
    >
      <WeatherScene scene={scene} />
      {festive && (
        <span aria-hidden="true" className="k5-xm-santa">
          <Image src="/christmas/santa-flying.png" alt="" width={240} height={72} priority={false} />
        </span>
      )}
      <span className="hb-sky" aria-hidden="true">
        <Bird body="#FFFFFF" wing="#DCE6F5" cls="f1" />
        <Bird body="#FFD23F" wing="#F5B400" cls="f2" />
        <Bird body="#FFFFFF" wing="#DCE6F5" cls="f3" />
      </span>
      <span aria-hidden="true" className="k5-float pointer-events-none absolute -right-[46px] -top-[58px] block h-[190px] w-[190px] rounded-full bg-white/[0.13]" />
      <span aria-hidden="true" className="k5-float pointer-events-none absolute -bottom-16 -left-9 block h-[150px] w-[150px] rounded-full bg-white/10 [animation-delay:-2s]" />
      <svg aria-hidden="true" viewBox="0 0 800 60" preserveAspectRatio="none" className="dash-bottomWaves pointer-events-none absolute bottom-0 left-0 h-[58px] w-full">
        <path d="M0 34C90 10 180 52 290 30S500 8 610 30S740 50 800 24V60H0Z" fill="rgba(255, 255, 255, 0.10)" />
        <path d="M0 46C120 30 230 58 360 42S580 28 690 44S770 52 800 40V60H0Z" fill="rgba(255, 255, 255, 0.14)" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 74 48" width="74" height="48" className="dash-faceCloud k5-drift pointer-events-none absolute right-[26px] top-1.5">
        <path d="M18 44C8 44 2 37 2 29c0-8 6-14 14-14 2-8 9-13 18-13 9 0 16 6 18 13 1 0 2 0 3 0 9 0 17 7 17 15s-7 14-16 14Z" fill="#FFFFFF" />
        <ellipse cx="29" cy="27" rx="2.6" ry="3.2" fill="#1E2242" />
        <ellipse cx="45" cy="27" rx="2.6" ry="3.2" fill="#1E2242" />
        <circle cx="23" cy="33" r="3.4" fill="#FF9EB5" opacity="0.85" />
        <circle cx="51" cy="33" r="3.4" fill="#FF9EB5" opacity="0.85" />
        <path d="M33.5 33q3.5 3.5 7 0" stroke="#1E2242" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 74 44" width="40" height="24" className="dash-smallCloud k5-drift pointer-events-none absolute bottom-2.5 right-16 opacity-75 [animation-delay:-3s] [animation-direction:reverse]">
        <path d="M18 42C8 42 2 35 2 27c0-8 6-14 14-14 2-8 9-12 18-12 9 0 16 5 18 12h3c9 0 17 7 17 15s-7 14-16 14Z" fill="#FFFFFF" />
      </svg>
      <span aria-hidden="true" className="dash-bob k5-bob2 pointer-events-none absolute left-[56%] top-[72px] block h-3 w-3 rounded-full bg-[#FFD6E8]" />
      <span aria-hidden="true" className="dash-bob k5-bob2 pointer-events-none absolute left-[43%] top-[92px] block h-[9px] w-[9px] rounded-full bg-[#FFF1A8] [animation-delay:-1s]" />
      <span aria-hidden="true" className="dash-bob k5-bob2 pointer-events-none absolute bottom-[58px] left-[52%] block h-2.5 w-2.5 rounded-full bg-[#B9F5E1] [animation-delay:-2s]" />

      <DateStrip now={now} timezone={timezone} weather={weather} night={night} scene={scene} />

      <div className="hero-row relative flex flex-nowrap items-center gap-5 max-[760px]:flex-wrap @max-[640px]/hero:flex-wrap">
        <div className="hero-greet relative flex min-w-0 flex-[1_1_auto] items-center gap-3.5">
          {look === "high" ? (
            night ? (
              <svg width="42" height="42" viewBox="0 0 48 48" aria-hidden="true" className="flex-none self-center">
                <path d="M30 6a18 18 0 1 0 12 30A15 15 0 0 1 30 6z" fill="#FFE08A" />
              </svg>
            ) : (
              <svg width="46" height="46" viewBox="0 0 48 48" aria-hidden="true" className="flex-none self-center">
                <g stroke="#FFD25A" strokeWidth="3" strokeLinecap="round">
                  <path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2" />
                </g>
                <circle cx="24" cy="24" r="9.5" fill="#FFC531" />
              </svg>
            )
          ) : night ? (
            <HeroMoon />
          ) : (
            <K5ClockIcon kind="sun" night={false} className="hero-sun !-m-4 !-mr-3 !h-[72px] !w-[72px]" />
          )}
          <h1 className="dash-greet m-0 text-[32px] font-semibold leading-[38px]">
            <span className="whitespace-nowrap">{festive ? "Merry Christmas" : greeting(now.getHours())},</span>
            <br />
            {firstName}
          </h1>
        </div>
        <ClassCard live={live} next={next} doneAll={doneAll} hasClasses={hasClasses} onJoin={onJoin} classesHref={classesHref} />
      </div>
    </section>
  );
}

/** The small line under an item of Today's Goal: "Live now · time", "Done · time" or the time. */
const itemSub = (event) => {
  const time = timeRange(event) || timeLabel(event);
  if (event.k5Status === "live") return `Live now · ${time}`;
  return event.k5Status === "done" ? `Done · ${time}` : time;
};

/** Today's Goal: done / total ring over today's classes, activities and assignments due today, what is still to do (live class first), and a button to My Classes. */
function TodayGoal({ classes, activities = [], assignments = [], classesHref, playGames = false, gamesHref, holidayName = "" }) {
  // Everything of today: classes, school activities and the assignments due today (an assignment is done once it is handed in).
  const items = [
    ...classes.map((c) => ({ id: c.id, name: classTitle(c), sub: itemSub(c), live: c.k5Status === "live", done: c.k5Status === "done" })),
    ...activities.map((a) => ({ id: a.id, name: activityTitle(a), sub: itemSub(a), live: a.k5Status === "live", done: a.k5Status === "done" })),
    ...assignments.map((a) => ({
      id: a.id,
      name: a.title || a.eventTitle || "Assignment",
      sub: [a.subjectName ? cleanCourseLabel(a.subjectName) : "", a.k5Assignment?.status === "submitted" ? "Handed in" : "Due today"].filter(Boolean).join(" · "),
      live: false,
      done: a.k5Assignment?.status === "submitted",
    })),
  ];
  const total = items.length;
  const done = items.filter((g) => g.done).length;
  const todo = items.filter((g) => !g.done);
  // All of today's items stay in the list (the ones that are over get a tick), so the student sees the whole day; the part scrolls.
  const shown = items;
  // Classes and activities only (the empty-day line); the games card itself waits for today's assignments too (gameAccess).
  const planCount = classes.length + activities.length;
  return (
    <section aria-label="Today's Goal" className={`${SECTION_CARD} min-h-[262px] min-w-[300px] flex-[1_1_0] gap-4 rounded-[30px] py-[18px] pl-[22px] pr-4 max-[420px]:pl-4 max-[760px]:min-w-0 max-[760px]:basis-full @min-[844px]:[contain:size]`}>
      <h2 className="dash-h2 m-0 flex items-center gap-2 text-[21px] font-semibold max-[420px]:justify-center">
        <span className="dash-ico flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF1C7] text-[#C27C00]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
        </span>
        <span className="flex-1 font-semibold max-[420px]:flex-none">Today&apos;s Goal</span>
      </h2>
      {/* Side by side with the hero (desktop) the card keeps the hero's height: the ring stays, the list beside it scrolls; stacked it just grows. */}
      <div className="flex items-center gap-5 pl-0.5 max-[420px]:flex-col max-[420px]:items-center max-[420px]:pl-0 @min-[844px]:min-h-0 @min-[844px]:flex-1 @min-[844px]:items-stretch">
        <div className="relative h-[120px] w-[120px] flex-none @min-[844px]:self-center">
          <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`${done} of ${total} done today`} className="absolute left-0 top-0">
            <circle cx="60" cy="60" r="54" strokeWidth="12" className="fill-k5-card stroke-k5-soft" />
            <circle cx="60" cy="60" r="54" fill="none" stroke="#00CD89" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(RING * done / Math.max(1, total)).toFixed(1)} ${RING}`} transform="rotate(-90 60 60)" />
          </svg>
          <div className="absolute left-0 top-0 flex h-[120px] w-[120px] flex-col items-center justify-center">
            <span className="dash-ringN text-[26px] font-bold leading-none">{done}/{total}</span>
            <span className="mt-0.5 text-xs font-medium text-k5-mut">Done</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 max-[420px]:w-full @min-[844px]:min-h-0 @min-[844px]:overflow-y-auto @min-[844px]:[justify-content:safe_center]">
        {shown.length ? (
          <ul aria-label="Today's Goal" className="m-0 flex min-w-0 flex-1 list-none flex-col gap-2.5 p-0 max-[420px]:w-full">
            {shown.map((g, i) => (
              <li key={`${g.id}-${i}`} className="flex min-w-0 items-center gap-2.5">
                {g.done ? (
                  <span aria-hidden="true" className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[#00CD89] text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3.4} />
                  </span>
                ) : g.live ? (
                  <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-k5-gt">
                    <span aria-hidden="true" className="k5-live-dot block h-2.5 w-2.5 rounded-full bg-k5-gi" />
                  </span>
                ) : (
                  <span aria-hidden="true" className="dash-liCircle box-border h-[22px] w-[22px] flex-none rounded-full border-2 border-k5-line" />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className={`dash-liName text-[15px] font-semibold leading-[1.2] ${g.done ? "text-k5-mut" : "text-k5-ink"}`}>{g.name}</span>
                  <span className="dash-liSub font-k5-body text-xs font-bold leading-[1.2] text-k5-mut">{g.sub}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {playGames ? (
          // Every class and activity of the day is over (or there are none): the games are open. Tapping goes to My Classes, where Your Games slides open.
          <Link
            href={gamesHref}
            className="group flex min-w-0 flex-1 flex-col items-start gap-2 max-[420px]:w-full rounded-[20px] border-[3px] border-[#3FB76D] bg-gradient-to-br from-[#E6F8EC] to-[#BDEBCD] px-4 py-3 text-k5-ink no-underline shadow-[0_5px_0_#249A50] transition-transform hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="lmgi flex h-10 w-10 flex-none items-center justify-center rounded-full border-[3px] border-[#3FB76D] bg-white text-[#1F7A3A]">
                <Gamepad2 className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span className="flex flex-col leading-[1.15]">
                <span className="text-base font-semibold">{planCount ? "Classes done. Great job!" : holidayName || "No classes today!"}</span>
                <span className="font-k5-body text-xs font-bold text-k5-mut">Time to play a game</span>
              </span>
            </span>
            <span className="flex min-h-9 items-center gap-1.5 rounded-full bg-[#1F9D55] px-4 text-[15px] font-semibold text-white shadow-[0_3px_0_#145A29]">
              <Gamepad2 className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
              Play games
            </span>
          </Link>
        ) : null}
        {total > 0 && !todo.length && !playGames && <p className="m-0 text-[15px] font-semibold text-k5-mut">Everything for today is done. Great job!</p>}
        {!total && !playGames && <p className="m-0 flex-1 text-[15px] font-semibold text-k5-mut">Nothing planned for today.</p>}
        </div>
      </div>
      <ClassesLink href={classesHref} className="dash-btn mt-auto flex min-h-11 items-center justify-center gap-2 rounded-[22px] bg-k5-ac font-k5-display text-base font-semibold text-white no-underline shadow-[0_4px_0_var(--k5-acd)]">
        <CalendarDays className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
        Go to my classes
      </ClassesLink>
    </section>
  );
}

// The skeleton draws the dashboard's own shapes (hero with its date strip, greeting and class card; Today's Goal; My Performance;
// My Assignments) in the same sizes, rows and cards, so nothing jumps when the real page replaces it. The cards are built from the
// same classes as the real ones, so each look's skin (Playful / Balanced / Mature) shapes them the same way; the rows flip for a
// left-handed student exactly like the real rows (data-hand).
const ROW = "flex flex-wrap gap-6 in-data-[hand=left]:flex-row-reverse";
const SK_CARD = `${K5_CARD} box-border flex flex-col rounded-[30px]`;

function DashboardSkeleton({ look }) {
  return (
    <div data-dash={look} className="@container flex flex-col gap-6" aria-busy="true" aria-label="Loading your dashboard">
      <div className={ROW}>
        {/* Hero: date / clock / weather strip, the greeting, and the class card */}
        <Skeleton className="dash-skHero box-border flex min-h-[262px] min-w-[520px] flex-[2_1_0] flex-col justify-center gap-[18px] rounded-[30px] p-[18px] max-[760px]:min-w-0 max-[760px]:basis-full">
          <span className="block h-[72px] w-full rounded-[20px] bg-white/45" />
          <span className="flex flex-wrap items-center gap-4">
            <span className="flex min-w-[200px] flex-[1_1_240px] items-center gap-3">
              <span className="block h-14 w-14 flex-none rounded-full bg-white/45" />
              <span className="flex flex-col gap-2">
                <span className="block h-6 w-44 rounded-lg bg-white/45" />
                <span className="block h-6 w-28 rounded-lg bg-white/45" />
              </span>
            </span>
            <span className="block h-[118px] min-w-[210px] flex-[0_2_340px] rounded-[24px] bg-white/60 max-[760px]:min-w-0 max-[760px]:flex-[1_1_100%]" />
          </span>
        </Skeleton>
        {/* Today's Goal */}
        <div className={`${SK_CARD} min-h-[262px] min-w-[300px] flex-[1_1_0] gap-4 py-[18px] pl-[22px] pr-4 max-[420px]:pl-4 max-[760px]:min-w-0 max-[760px]:basis-full`}>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-lg" />
          </div>
          <div className="flex flex-1 items-center gap-4">
            <Skeleton className="h-[100px] w-[100px] flex-none rounded-full" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
              <Skeleton className="h-4 w-3/5 rounded-md" />
            </div>
          </div>
          <Skeleton className="mt-auto h-11 w-full rounded-[22px]" />
        </div>
      </div>
      <div className={ROW}>
        {/* My Performance */}
        <div className={`${SK_CARD} min-w-[520px] flex-[2_1_0] gap-3.5 px-[22px] pb-[22px] pt-5 max-[760px]:min-w-0 max-[760px]:basis-full`}>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-40 rounded-lg" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-32 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <Skeleton className="h-[68px] min-w-[190px] flex-[1_1_190px] rounded-[20px]" />
            <Skeleton className="h-[68px] min-w-[190px] flex-[1_1_190px] rounded-[20px]" />
          </div>
          <Skeleton className="h-[128px] w-full rounded-[20px]" />
        </div>
        {/* My Assignments */}
        <div className={`${SK_CARD} min-w-[300px] flex-[1_1_0] gap-[11px] px-[18px] py-5 max-[760px]:min-w-0 max-[760px]:basis-full`}>
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-36 rounded-lg" />
            </div>
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[62px] rounded-[20px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function K5Dashboard({ now, timezone, days, todayKey, isLoading, firstName, onJoin }) {
  const { school } = useParams();
  const { menu, isMiddle, isHigh } = useDashboardContext();
  // Which mockup the page follows: Playful (K-5), Balanced (Middle.dc.html) or Mature (High.dc.html); app/k5-theme.css restyles
  // the dash-* hooks for the last two.
  const look = isHigh ? "high" : isMiddle ? "mid" : "play";
  // My Classes is a database module: the links to it show only when the student's role has it (left menu item present).
  const classesHref = menu.some((item) => item.segment === "my-classes") ? `/${school}/student/my-classes` : null;
  if (isLoading) return <DashboardSkeleton look={look} />;
  const today = dayAt(days, todayKey);
  const classes = today.classes;
  // The class that is live now (Join shows when it has a join link, like the planner: see isJoinable in StudentHomeK5).
  const live = classes.find((c) => c.k5Status === "live" && c.url) || classes.find((c) => c.k5Status === "live") || null;
  const next = live ? null : classes.find((c) => c.k5Status === "next") || null;
  const doneAll = classes.length > 0 && classes.every((c) => c.k5Status === "done");
  // Games open when every class, activity and assignment of today is done (same rule as the planner: gameAccess in utils/k5Calendar.js).
  // "Time to play a game" (Today's Goal, every look): every class and school activity of today is over, or there are none (a free day).
  const activitiesDone = today.activities.every((a) => a.k5Status === "done");
  const playGames = Boolean(classesHref) && classes.every((c) => c.k5Status === "done") && activitiesDone && !gameAccess(days, todayKey, todayKey).locked;
  // A holiday today: the free-day card names it (like the planner and the month summary do).
  const holiday = today.holidays[0];
  const holidayName = holiday ? holiday.title || holiday.eventTitle || "Holiday" : "";
  const gamesHref = classesHref ? `${classesHref}?games=open` : null;
  // The mockup's dashboard (.lmd) is set in the display font (Fredoka) all the way down; only small captions use the body font.
  return (
    <div data-dash={look} className="k5-dash-rise @container flex flex-col gap-6 font-k5-display">
      <div className={ROW}>
        <Hero look={look} now={now} timezone={timezone} firstName={firstName} live={live} next={next} doneAll={doneAll} hasClasses={classes.length > 0} onJoin={onJoin} classesHref={classesHref} />
        <TodayGoal classes={classes} activities={today.activities} assignments={today.assignments} classesHref={classesHref} playGames={playGames} gamesHref={gamesHref} holidayName={holidayName} />
      </div>
      <div className={ROW}>
        <MyPerformanceCard firstInitial={firstName.charAt(0).toUpperCase()} />
        <MyAssignmentsCard days={days} todayKey={todayKey} isLoading={false} />
      </div>
    </div>
  );
}
