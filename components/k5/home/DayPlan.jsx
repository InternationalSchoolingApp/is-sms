"use client";

import { K5Games } from "@/components/k5/games/K5Games";
import { addDays, format } from "date-fns";
import { CalendarDays, Check, ChevronRight, Clock, Flag, PartyPopper, Smile, Star, Video } from "lucide-react";
import { CLUE_RING, K5_PRIMARY_BTN, PlanHeader, PlanTile, StatusPills, SubjectTile } from "@/components/k5/home/k5Bits";
import {
  CLUE_COLORS as C,
  activityTitle,
  classTitle,
  countStatuses,
  dayAt,
  dayKey,
  initials,
  isWeekendKey,
  keyToDate,
  noClassReason,
  teacherName,
  timeLabel,
  timeRange,
} from "@/utils/k5Calendar";

// Mockup card states: done = card + grey border, live = dashed blue on blue tint, next = yellow.
const CARD_STATE = {
  done: { border: `3px solid ${C.done}`, background: "var(--k5-card)" },
  live: { border: `3px dashed ${C.live}`, background: C.liveTint },
  next: { border: `3px solid ${C.upcoming}`, background: C.upcomingTint },
};
const CLUE_FOR_STATUS = { done: "done", live: "live", next: "upcoming" };

function Teacher({ event }) {
  const name = teacherName(event);
  if (!name) return null;
  return (
    <div className="mt-0.5 flex items-center gap-2">
      <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-k5-vt text-xs font-black text-k5-vi">{initials(name)}</span>
      <span className="text-[15px] font-extrabold">{name}</span>
    </div>
  );
}

/** One class in the Day plan: Done sticker / LIVE NOW + Join / Starts at. */
export function ClassCard({ event, clue, isPreK, onJoin, onOpen }) {
  const status = event.k5Status;
  const joinable = status !== "done" && Boolean(event.url);
  return (
    <article
      data-pin={status === "live" ? "live" : undefined}
      className={`flex flex-wrap items-center gap-4 rounded-[24px] px-[18px] py-3.5 ${status === "live" ? "shadow-[0_0_0_6px_rgba(47,123,245,0.18)]" : ""} ${
        clue === CLUE_FOR_STATUS[status] ? CLUE_RING : ""
      }`}
      style={CARD_STATE[status]}
    >
      <SubjectTile name={classTitle(event)} />
      <button type="button" onClick={() => onOpen(event)} className="flex flex-[1_1_220px] cursor-pointer flex-col gap-[3px] border-none bg-transparent p-0 text-left">
        <span className="flex items-center gap-1.5 self-start rounded-full bg-k5-card px-2.5 py-[3px] text-[13px] font-black text-k5-ink">
          <Video className="h-3.5 w-3.5" aria-hidden="true" />
          {status === "live" ? "Live Class" : "Class"}
        </span>
        <h3 className="m-0 font-k5-display text-[26px] font-semibold leading-[1.1]">{classTitle(event)}</h3>
        <p className="m-0 text-[17px] font-extrabold text-k5-mut">{timeRange(event)}</p>
        <Teacher event={event} />
      </button>

      {status === "done" && (
        <span className="flex flex-none -rotate-[5deg] items-center gap-2 rounded-[18px] bg-k5-ac px-4 py-2 font-k5-display text-[22px] font-semibold text-white shadow-[0_5px_0_var(--k5-acd)]">
          <Check className="h-[22px] w-[22px]" strokeWidth={3} aria-hidden="true" />
          Done!
        </span>
      )}
      {status === "live" && (
        <div className="flex flex-none flex-col items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-black text-k5-gx">
            <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-k5-gi" />
            LIVE NOW
          </span>
          {joinable && (
            <button
              type="button"
              onClick={() => onJoin(event)}
              className={`flex cursor-pointer items-center gap-2 rounded-full border-none bg-k5-grn px-[22px] font-k5-display font-semibold text-white shadow-[0_5px_0_var(--k5-grnD)] ${
                isPreK ? "min-h-[76px] text-[26px]" : "min-h-[54px] text-[21px]"
              }`}
            >
              <Video className="h-6 w-6" aria-hidden="true" />
              Join class
            </button>
          )}
        </div>
      )}
      {status === "next" && (
        <span className="flex flex-none items-center gap-1.5 rounded-full border-[3px] border-k5-yb bg-k5-card px-3.5 py-2 text-[15px] font-black text-k5-yx">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Starts {timeLabel(event)}
        </span>
      )}
    </article>
  );
}

function ActivityCard({ event, clue, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className={`flex w-full cursor-pointer flex-wrap items-center gap-4 rounded-[24px] border-[3px] border-solid px-[18px] py-3.5 text-left ${clue === "activity" ? CLUE_RING : ""}`}
      style={{ borderColor: C.activity, background: "var(--k5-vt)" }}
    >
      <span className="flex h-[66px] w-[66px] flex-none items-center justify-center rounded-[20px] bg-k5-card">
        <PartyPopper className="h-9 w-9" style={{ color: C.activityText }} aria-hidden="true" />
      </span>
      <span className="flex flex-[1_1_220px] flex-col gap-[3px]">
        <span className="self-start rounded-full px-2.5 py-[3px] text-[13px] font-black text-white" style={{ background: C.activityText }}>
          School Activity
        </span>
        <span className="font-k5-display text-[24px] font-semibold leading-[1.1] text-k5-ink">{activityTitle(event)}</span>
        <span className="text-[17px] font-extrabold text-k5-mut">{timeRange(event)}</span>
        <Teacher event={event} />
      </span>
      {event.k5Status === "live" && <span className="flex-none rounded-full bg-k5-gt px-3.5 py-2 text-[15px] font-black text-k5-gx">Happening now</span>}
    </button>
  );
}

const ASSIGNMENT_PILL = {
  submitted: "bg-k5-gt text-k5-gx",
  pending: "bg-k5-rt text-k5-ri",
  upcoming: "bg-k5-yt text-k5-yx",
};

function Assignments({ items, clue, onOpen }) {
  if (!items.length) return null;
  return (
    <div className={`flex flex-col gap-2 rounded-[24px] bg-k5-soft p-3.5 ${clue === "assignment" ? CLUE_RING : ""}`}>
      <h3 className="m-0 flex items-center gap-2 font-k5-display text-xl font-semibold">
        <span aria-hidden="true" className="block h-4 w-4 rounded-full" style={{ background: C.assignment }} />
        Assignments
      </h3>
      {items.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onOpen(a)}
          className="flex min-h-11 cursor-pointer flex-wrap items-center gap-3 rounded-2xl border-none bg-k5-card px-3 py-2 text-left"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-black text-k5-ink">{a.title || a.eventTitle || "Assignment"}</span>
            {a.subjectName && <span className="text-sm font-bold text-k5-mut">{a.subjectName}</span>}
          </span>
          <span className={`flex-none rounded-full px-3 py-1 text-[13px] font-black ${ASSIGNMENT_PILL[a.k5Assignment.status]}`}>{a.k5Assignment.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Reason card for a day without classes (holiday / weekend / free day / self-study day). */
export function NoClassDay({ reason, isToday }) {
  const Icon = reason.kind === "holiday" ? Flag : reason.kind === "study" ? Star : Smile;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[24px] bg-k5-gt px-5 py-[18px]">
      <span className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full bg-k5-ac">
        <Icon className="h-10 w-10 text-white" aria-hidden="true" />
      </span>
      <div className="flex flex-[1_1_220px] flex-col">
        <span className="font-k5-display text-[28px] font-semibold text-k5-ink">
          {reason.kind === "holiday" ? reason.title : isToday ? (reason.kind === "study" ? "No live classes today" : "No classes today!") : reason.title}
        </span>
        <span className="text-[17px] font-extrabold text-k5-gx">{reason.text}</span>
      </div>
    </div>
  );
}

function TomorrowCard({ dateKey, days, isSelfStudy, onPeek }) {
  const tomorrow = addDays(keyToDate(dateKey), 1);
  const day = dayAt(days, dayKey(tomorrow));
  const n = day.classes.length;
  const free = !n && !day.holidays.length && !isWeekendKey(dayKey(tomorrow));
  const title = n ? `Tomorrow: ${n} class${n === 1 ? "" : "es"}` : free && !isSelfStudy ? "Tomorrow: no classes! Free day!" : "Tomorrow: no classes";
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-3.5 max-[560px]:grid-cols-1">
      <div className="pt-[22px] text-right text-base font-black text-k5-mut max-[560px]:hidden">{format(tomorrow, "EEEE")}</div>
      <div className="flex flex-wrap items-center gap-3.5 rounded-[24px] border-[3px] border-k5-yb bg-k5-yt px-[18px] py-4">
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[18px] bg-k5-ac">
          <CalendarDays className="h-7 w-7 text-white" aria-hidden="true" />
        </span>
        <div className="flex flex-[1_1_200px] flex-col">
          <span className="font-k5-display text-[22px] font-semibold">{title}</span>
          <span className="text-[15px] font-extrabold text-k5-yx">{format(tomorrow, "EEEE, MMMM d")}</span>
        </div>
        <button type="button" onClick={() => onPeek(tomorrow)} className={K5_PRIMARY_BTN}>
          Peek
          <ChevronRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Day plan: date tile + "{Day}'s Plan", status pills, a timeline of classes and school
 * activities (with a "now" line on today), the day's assignments, a reason card when there
 * are no classes, and a "Tomorrow" card that peeks at the next day.
 */
export function DayPlan({ dateKey, todayKey, now, days, clue, isPreK, isSelfStudy, firstName, onJoin, onOpen, onPeek, onShowCalendar }) {
  const day = dayAt(days, dateKey);
  const date = keyToDate(dateKey);
  const isToday = dateKey === todayKey;
  const items = [...day.classes.map((e) => ({ kind: "class", e })), ...day.activities.map((e) => ({ kind: "activity", e }))].sort(
    (a, b) => (a.e.startZoned?.getTime() || 0) - (b.e.startZoned?.getTime() || 0),
  );
  const nClasses = day.classes.length;
  // Games are locked only while one of today's classes is live (the student must go to it): a free day picked
  // from the calendar then shows them locked. With no live class right now — nothing today, classes still to come,
  // or all done — they stay open. (The Middle mockup locks every day but today; the product rule is "live class".)
  const gamesLocked = dayAt(days, todayKey).classes.some((c) => c.k5Status === "live");
  const subtitle = nClasses ? `${nClasses} class${nClasses === 1 ? "" : "es"}${isToday ? " today" : ""}` : "No classes";
  // The dotted "now" line goes right before the first item that has not finished yet.
  const nowIndex = isToday ? items.findIndex((it) => it.e.k5Status !== "done") : -1;

  return (
    <div className="flex flex-col gap-4">
      <PlanHeader
        tile={
          <PlanTile top={format(date, "EEE").toUpperCase()} big={format(date, "d")}>
            {isToday && <Star className="absolute -right-3 -top-3 h-[30px] w-[30px] fill-[#FFC531] text-[#C9930A]" aria-hidden="true" />}
          </PlanTile>
        }
        title={isToday ? "Today's Plan" : `${format(date, "EEEE")}'s Plan`}
        subtitle={subtitle}
      >
        {/* Mobile only (mockup .calbtn): the mini calendar is hidden there, this opens it. */}
        {onShowCalendar && (
          <button
            type="button"
            onClick={onShowCalendar}
            aria-label="Show calendar"
            title="Show calendar"
            className="hidden h-[52px] w-[52px] flex-none cursor-pointer items-center justify-center rounded-2xl border-[3px] border-k5-line bg-k5-card text-k5-acx shadow-k5-btn max-[760px]:flex"
          >
            <CalendarDays className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
          </button>
        )}
        {isToday && <StatusPills counts={countStatuses(day.classes)} />}
      </PlanHeader>

      {day.holidays.map((h) => (
        <div
          key={h.id}
          className={`flex items-center gap-2 self-start rounded-full px-4 py-2 text-base font-black text-white ${clue === "holiday" ? CLUE_RING : ""}`}
          style={{ background: C.holiday }}
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          {h.title || h.eventTitle || "Holiday"}
        </div>
      ))}

      {items.length > 0 ? (
        <div className="flex flex-col gap-3.5">
          {items.map((it, i) => (
            <div key={it.e.id} className="flex flex-col gap-3.5">
              {i === nowIndex && (
                <div className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3.5 max-[560px]:grid-cols-1">
                  <div className="text-right text-base font-black text-[#9A3412] max-[560px]:text-left">{format(now, "h:mm a")}</div>
                  <span aria-hidden="true" className="block h-0 flex-1 border-t-4 border-dotted border-[#E8875A]" />
                </div>
              )}
              <div className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-3.5 max-[560px]:grid-cols-1">
                <div className="pt-[22px] text-right text-base font-black text-k5-mut max-[560px]:pt-0 max-[560px]:text-left">{timeLabel(it.e)}</div>
                {it.kind === "class" ? (
                  <ClassCard event={it.e} clue={clue} isPreK={isPreK} onJoin={onJoin} onOpen={onOpen} />
                ) : (
                  <ActivityCard event={it.e} clue={clue} onOpen={onOpen} />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <NoClassDay reason={noClassReason(dateKey, day, { isSelfStudy, firstName })} isToday={isToday} />
          <K5Games locked={gamesLocked} />
        </>
      )}

      <Assignments items={day.assignments} clue={clue} onOpen={onOpen} />

      {isToday && <TomorrowCard dateKey={dateKey} days={days} isSelfStudy={isSelfStudy} onPeek={onPeek} />}
    </div>
  );
}
