"use client";

import { useEffect, useRef } from "react";
import { format, getDay, isSameMonth } from "date-fns";
import { BookOpen, CalendarRange, Check, ChevronRight, Flag, PartyPopper, Smile, Sun } from "lucide-react";
import { CLUE_RING, K5_PRIMARY_BTN, PlanHeader, PlanTile, StatusPills } from "@/components/k5/home/k5Bits";
import { getCourseColor, getMonthGridDays } from "@/utils/calendarEvents";
import {
  CLUE_COLORS as C,
  WEEKDAY_HEAD,
  WEEKDAY_SHADOW,
  WEEKDAY_TEXT,
  activityTitle,
  classTitle,
  countStatuses,
  dayAt,
  dayKey,
  daySummary,
  keyToDate,
  timeLabel,
} from "@/utils/k5Calendar";
import { revealElement } from "@/utils/k5Scroll";

const CHIP_STATE = {
  done: { border: `2px solid ${C.done}`, background: "var(--k5-card)" },
  live: { border: `2px dashed ${C.live}`, background: C.liveTint },
  next: { border: `2px solid ${C.upcoming}`, background: C.upcomingTint },
};
const CLUE_FOR_STATUS = { done: "done", live: "live", next: "upcoming" };

// A class in the week grid. Tapping it does what tapping the class card does in the Day plan:
// a live / upcoming class with a join link opens the join flow, anything else its details.
function ClassChip({ event, courseRegistry, clue, onOpen }) {
  const live = event.k5Status === "live";
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      aria-label={`${classTitle(event)}, ${timeLabel(event)}${live ? ", live now — join class" : ""}`}
      className={`flex w-full cursor-pointer items-center gap-1.5 rounded-xl px-1.5 py-[5px] text-left ${clue === CLUE_FOR_STATUS[event.k5Status] ? "outline outline-[3px] outline-offset-2 outline-[#FFC531]" : ""}`}
      style={CHIP_STATE[event.k5Status]}
    >
      <span aria-hidden="true" className="block h-2.5 w-2.5 flex-none rounded-full" style={{ background: getCourseColor(courseRegistry, event.courseId) }} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-black text-k5-ink">{classTitle(event)}</span>
        <span className="text-xs font-extrabold text-k5-mut">{timeLabel(event)}</span>
      </span>
      {event.k5Status === "done" && <Check className="h-4 w-4 flex-none text-k5-acx" strokeWidth={3} aria-label="Done" />}
      {live && <span className="flex-none rounded-full px-1.5 py-0.5 text-[11px] font-black text-white" style={{ background: C.liveText }}>LIVE</span>}
    </button>
  );
}

// A holiday / activity / assignment pill. With `onClick` it is a button (week grid, month
// summary); without it a plain label (inside a month cell, which is itself a button).
function SmallPill({ icon: Icon, children, style, className = "", highlighted, onClick, label }) {
  const cls = `flex max-w-full items-center gap-1 overflow-hidden whitespace-nowrap rounded-full px-2 py-[3px] text-xs font-black text-white ${
    highlighted ? "outline outline-[3px] outline-offset-2 outline-[#FFC531]" : ""
  } ${className}`;
  const content = (
    <>
      <Icon className="h-3 w-3 flex-none" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </>
  );
  if (!onClick) {
    return (
      <span className={cls} style={style}>
        {content}
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`${cls} cursor-pointer border-none text-left`} style={style}>
      {content}
    </button>
  );
}

/**
 * A day's holidays, school activities and assignments. With `onOpenEvent` each one opens its
 * details like in the Day plan (several assignments: the pill opens the day instead).
 */
function DayExtras({ day, clue, onOpenEvent, onOpenDay }) {
  const open = (event) => (onOpenEvent ? () => onOpenEvent(event) : undefined);
  const nA = day.assignments.length;
  return (
    <>
      {day.holidays.map((h) => (
        <SmallPill key={h.id} icon={Flag} style={{ background: C.holiday }} highlighted={clue === "holiday"} onClick={open(h)}>
          {h.title || h.eventTitle || "Holiday"}
        </SmallPill>
      ))}
      {day.activities.map((a) => (
        <SmallPill
          key={a.id}
          icon={PartyPopper}
          style={{ background: C.activityText, boxShadow: `0 3px 0 ${C.activityShadow}` }}
          highlighted={clue === "activity"}
          onClick={open(a)}
          label={`School activity: ${activityTitle(a)}`}
        >
          {activityTitle(a)}
        </SmallPill>
      ))}
      {nA > 0 && (
        <SmallPill
          icon={BookOpen}
          style={{ background: C.assignment }}
          highlighted={clue === "assignment"}
          onClick={onOpenEvent ? (nA === 1 ? open(day.assignments[0]) : onOpenDay) : undefined}
          label={nA === 1 ? `Assignment: ${day.assignments[0].title || "Assignment"}` : `${nA} assignments — open this day`}
        >
          {nA === 1 ? day.assignments[0].title || "1 assignment" : `${nA} assignments`}
        </SmallPill>
      )}
    </>
  );
}

/** Week plan: five school-day columns plus a Sat · Sun column; tap a day to open it. */
export function WeekPlan({ keys, todayKey, days, courseRegistry, clue, isSelfStudy, onOpenDay, onOpenEvent }) {
  const all = keys.flatMap((k) => dayAt(days, k).classes);
  const first = keyToDate(keys[0]);
  const last = keyToDate(keys[6]);
  const weekend = [keys[5], keys[6]];
  const weekendDays = weekend.map((k) => dayAt(days, k));
  const weekendBusy = weekendDays.some((d) => d.classes.length || d.activities.length || d.assignments.length || d.holidays.length);

  return (
    <div className="flex flex-col gap-4">
      <PlanHeader
        tile={
          <PlanTile top="WEEK" className="bg-[#0F766E] shadow-[0_5px_0_#0B5E58]">
            <CalendarRange className="mt-1 h-7 w-7 text-white" aria-hidden="true" />
          </PlanTile>
        }
        title="My Week"
        subtitle={`${format(first, "MMMM d")} – ${format(last, first.getMonth() === last.getMonth() ? "d" : "MMMM d")} · tap a day to open it`}
      >
        <StatusPills counts={countStatuses(all)} />
      </PlanHeader>

      <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,0.8fr)] gap-2 @max-[700px]:grid-cols-3 @max-[420px]:grid-cols-2">
        {keys.slice(0, 5).map((key) => {
          const date = keyToDate(key);
          const day = dayAt(days, key);
          const isToday = key === todayKey;
          const empty = !day.classes.length && !day.activities.length && !day.holidays.length;
          return (
            <div key={key} className="flex min-w-0 flex-col gap-2">
              <button
                type="button"
                onClick={() => onOpenDay(date)}
                className="relative cursor-pointer rounded-2xl border-none px-1 py-2 text-center text-white"
                style={{
                  background: isToday ? "var(--k5-ac)" : WEEKDAY_HEAD[getDay(date)],
                  boxShadow: `0 4px 0 ${isToday ? "var(--k5-acd)" : WEEKDAY_SHADOW[getDay(date)]}`,
                }}
              >
                <span className="block text-[13px] font-black">{isToday ? "Today" : format(date, "EEE")}</span>
                <span className="block font-k5-display text-[26px] font-semibold leading-[1.1]">{format(date, "d")}</span>
              </button>
              <div
                className={`flex flex-1 flex-col gap-1.5 rounded-[18px] border-[3px] p-2 ${isToday ? "border-k5-ac bg-k5-act" : "border-transparent bg-k5-soft"}`}
              >
                {day.classes.map((c) => (
                  <ClassChip key={c.id} event={c} courseRegistry={courseRegistry} clue={clue} onOpen={onOpenEvent} />
                ))}
                <DayExtras day={day} clue={clue} onOpenEvent={onOpenEvent} onOpenDay={() => onOpenDay(date)} />
                {empty && (
                  <button
                    type="button"
                    onClick={() => onOpenDay(date)}
                    className="flex min-h-40 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[3px] border-dashed border-k5-gi bg-k5-gt px-1.5 py-3 text-center text-[15px] font-black text-k5-gx"
                  >
                    {isSelfStudy ? <BookOpen className="h-7 w-7" aria-hidden="true" /> : <Smile className="h-7 w-7" aria-hidden="true" />}
                    No classes!
                    <span className="text-xs font-extrabold">{isSelfStudy ? "Course work day" : "Free day"}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex min-w-0 flex-col gap-2">
          <div className="rounded-2xl bg-[#6A3FC4] px-1 py-2 text-center text-white shadow-[0_4px_0_#4C2A94]">
            <span className="block text-[13px] font-black">Sat · Sun</span>
            <span className="block font-k5-display text-[26px] font-semibold leading-[1.1]">
              {format(keyToDate(weekend[0]), "d")}-{format(keyToDate(weekend[1]), "d")}
            </span>
          </div>
          {weekendBusy ? (
            <div className="flex flex-1 flex-col gap-1.5 rounded-[18px] bg-k5-yt p-2">
              {weekend.map((key, i) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => onOpenDay(keyToDate(key))} className="cursor-pointer self-start border-none bg-transparent p-0 text-left text-xs font-black text-k5-yx underline">
                    {format(keyToDate(key), "EEE d")}
                  </button>
                  {weekendDays[i].classes.map((c) => (
                    <ClassChip key={c.id} event={c} courseRegistry={courseRegistry} clue={clue} onOpen={onOpenEvent} />
                  ))}
                  <DayExtras day={weekendDays[i]} clue={clue} onOpenEvent={onOpenEvent} onOpenDay={() => onOpenDay(keyToDate(key))} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[18px] bg-k5-yt p-2 text-center text-[15px] font-black text-k5-yx">
              <Sun className="h-11 w-11 fill-[#FFC531] text-[#C9930A]" aria-hidden="true" />
              Weekend!
              <span className="text-[13px] font-extrabold">No school</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const WEEK_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Mockup legend: one dot per course colour, "= your N classes". Hidden in a narrow plan. */
function MonthLegend({ courseRegistry }) {
  const courses = Object.values(courseRegistry || {});
  if (!courses.length) return null;
  return (
    <div className="flex items-center gap-1 text-[13px] font-extrabold text-k5-mut @max-[640px]:hidden">
      {courses.map((c) => (
        <span key={c.id} aria-hidden="true" className="block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
      ))}
      <span className="ml-1">
        = your {courses.length} class{courses.length === 1 ? "" : "es"}
      </span>
    </div>
  );
}

/** Month plan: a 6-week grid with class dots and day pills, plus a summary of the picked day. */
export function MonthPlan({ selectedDate, selectedKey, todayKey, days, courseRegistry, clue, isSelfStudy, onSelect, onOpenDay, onOpenEvent }) {
  const cells = getMonthGridDays(selectedDate);
  // Picking a day fills the summary panel under the grid: scroll it into view when it is off-screen.
  const panelRef = useRef(null);
  const revealPanel = useRef(false);
  useEffect(() => {
    if (!revealPanel.current) return;
    revealPanel.current = false;
    revealElement(panelRef.current);
  }, [selectedKey]);
  const selectedDay = dayAt(days, selectedKey);
  const liveClass = selectedDay.classes.find((c) => c.k5Status === "live" && c.url);
  const selectedEvents = [...selectedDay.classes, ...selectedDay.holidays, ...selectedDay.activities, ...selectedDay.assignments];

  return (
    <div className="flex flex-col gap-3.5">
      <PlanHeader
        tile={<PlanTile top={format(selectedDate, "MMM").toUpperCase()} big={format(selectedDate, "yyyy")} className="bg-[#6A3FC4] shadow-[0_5px_0_#4C2A94] [&>span:last-child]:text-[26px]" />}
        title="My Month"
        subtitle="Tap any day to see what's planned"
      >
        <MonthLegend courseRegistry={courseRegistry} />
      </PlanHeader>

      <div className="grid grid-cols-7 gap-2 text-center font-k5-display text-base font-semibold">
        {WEEK_SHORT.map((d, i) => (
          <span key={d} className={WEEKDAY_TEXT[i]}>
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((date) => {
          const key = dayKey(date);
          if (!isSameMonth(date, selectedDate)) {
            return (
              <div key={key} className="box-border min-h-[104px] w-full rounded-2xl bg-k5-soft px-2.5 py-1.5 text-base font-bold text-k5-mut @max-[640px]:min-h-16">
                {date.getDate()}
              </div>
            );
          }
          const day = dayAt(days, key);
          const isToday = key === todayKey;
          const isSel = key === selectedKey;
          const weekend = [0, 6].includes(getDay(date));
          const allDone = day.classes.length > 0 && day.classes.every((c) => c.k5Status === "done");
          const free = !day.classes.length && !day.holidays.length && !day.activities.length && !weekend && !isSelfStudy;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSel}
              aria-label={`${format(date, "EEEE, MMMM d")}: ${daySummary(key, day, todayKey, { isSelfStudy })}`}
              onClick={() => {
                if (key === selectedKey) revealElement(panelRef.current);
                else revealPanel.current = true;
                onSelect(date);
              }}
              className={`relative box-border flex min-h-[104px] w-full min-w-0 cursor-pointer flex-col items-start gap-1 rounded-2xl border-[3px] px-[7px] pb-[7px] pt-1 text-left @max-[640px]:min-h-16 ${
                isSel ? "border-[#FFC531]" : isToday ? "border-k5-acd" : "border-k5-line"
              } ${isToday ? "bg-k5-ac" : isSel ? "bg-k5-yt" : weekend ? "bg-k5-soft" : "bg-k5-card"}`}
            >
              <span className={`font-k5-display text-xl font-semibold ${isToday ? "text-white" : "text-k5-ink"}`}>{date.getDate()}</span>
              {day.classes.length > 0 && (
                <span className={`flex flex-col gap-[3px] rounded-lg ${["done", "live", "upcoming"].includes(clue) ? "outline outline-[3px] outline-offset-2 outline-[#FFC531]" : ""}`}>
                  <span className="flex flex-wrap gap-[3px]">
                    {day.classes.slice(0, 5).map((c) => (
                      <span
                        key={c.id}
                        aria-hidden="true"
                        className="block h-[9px] w-[9px] rounded-full border-[1.5px] border-white"
                        style={{ background: getCourseColor(courseRegistry, c.courseId) }}
                      />
                    ))}
                  </span>
                  <span className={`text-xs font-black @max-[640px]:hidden ${isToday ? "text-white" : key < todayKey ? "text-k5-acx" : "text-k5-mut"}`}>
                    {allDone ? "All done" : `${day.classes.length} class${day.classes.length === 1 ? "" : "es"}`}
                  </span>
                </span>
              )}
              <span className="flex max-w-full flex-col gap-1 @max-[640px]:hidden">
                {free && (
                  <span className="flex items-center gap-1 rounded-full bg-k5-gt px-2 py-[3px] text-xs font-black text-k5-gx">
                    <Smile className="h-3 w-3" aria-hidden="true" />
                    Free day
                  </span>
                )}
                <DayExtras day={day} clue={clue} />
              </span>
            </button>
          );
        })}
      </div>

      <div ref={panelRef} aria-live="polite" className="move_to_today flex scroll-mb-6 flex-wrap items-center gap-3.5 rounded-[24px] border-[3px] border-k5-yb bg-k5-yt px-[18px] py-4">
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[18px] bg-k5-card font-k5-display text-[26px] font-semibold text-k5-ink">
          {format(keyToDate(selectedKey), "d")}
        </span>
        <div className="flex flex-[1_1_220px] flex-col">
          <span className="font-k5-display text-[22px] font-semibold">{format(keyToDate(selectedKey), "EEEE, MMMM d")}</span>
          <span className="text-base font-extrabold text-k5-yx">{daySummary(selectedKey, selectedDay, todayKey, { isSelfStudy })}</span>
        </div>
        {/* A live class on the picked day can be joined right here, like in the Day plan. */}
        {liveClass && (
          <button
            type="button"
            onClick={() => onOpenEvent(liveClass)}
            className="flex min-h-[50px] cursor-pointer items-center gap-2 rounded-full border-none bg-k5-grn px-5 font-k5-display text-[19px] font-semibold text-white shadow-[0_5px_0_var(--k5-grnD)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            Join {classTitle(liveClass)}
          </button>
        )}
        <button type="button" onClick={() => onOpenDay(keyToDate(selectedKey))} className={K5_PRIMARY_BTN}>
          Open this day
          <ChevronRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>
        {/* The picked day's events, each one tappable (month cells are buttons themselves, so
            their pills only show — here they open the class / activity / assignment). */}
        {selectedEvents.length > 0 && (
          <ul aria-label="Events on this day" className="m-0 flex basis-full list-none flex-wrap gap-2 p-0">
            {selectedDay.classes.map((c) => (
              <li key={c.id} className="w-[230px] max-w-full">
                <ClassChip event={c} courseRegistry={courseRegistry} clue={clue} onOpen={onOpenEvent} />
              </li>
            ))}
            {selectedDay.holidays.map((h) => (
              <li key={h.id} className="flex">
                <SmallPill icon={Flag} style={{ background: C.holiday }} highlighted={clue === "holiday"} onClick={() => onOpenEvent(h)} className="py-1.5 text-[13px]">
                  {h.title || h.eventTitle || "Holiday"}
                </SmallPill>
              </li>
            ))}
            {selectedDay.activities.map((a) => (
              <li key={a.id} className="flex">
                <SmallPill
                  icon={PartyPopper}
                  style={{ background: C.activityText, boxShadow: `0 3px 0 ${C.activityShadow}` }}
                  highlighted={clue === "activity"}
                  onClick={() => onOpenEvent(a)}
                  label={`School activity: ${activityTitle(a)}`}
                  className="py-1.5 text-[13px]"
                >
                  {activityTitle(a)}
                </SmallPill>
              </li>
            ))}
            {selectedDay.assignments.map((a) => (
              <li key={a.id} className="flex">
                <SmallPill
                  icon={BookOpen}
                  style={{ background: C.assignment }}
                  highlighted={clue === "assignment"}
                  onClick={() => onOpenEvent(a)}
                  label={`Assignment: ${a.title || "Assignment"}`}
                  className="py-1.5 text-[13px]"
                >
                  {a.title || "Assignment"}
                </SmallPill>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
