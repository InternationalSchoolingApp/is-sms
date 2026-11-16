"use client";

import { format, isSameMonth } from "date-fns";
import { Check, ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { K5_CARD, K5_ROUND_BTN, SubjectIcon } from "@/components/k5/home/k5Bits";
import { getEventColor, getMonthGridDays } from "@/utils/calendarEvents";
import { CLUE_COLORS, WEEKDAY_TEXT, classTitle, courseTint, dayAt, dayKey, safeCourseColor, subjectStyle, timeLabel, timeRange } from "@/utils/k5Calendar";

const WEEK_LETTERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Mockup dot priority: holiday, then assignment, then activity, then classes.
function dotColor(day) {
  if (day.holidays.length) return CLUE_COLORS.holiday;
  if (day.assignments.length) return CLUE_COLORS.assignment;
  if (day.activities.length) return CLUE_COLORS.activity;
  if (day.classes.length) return "var(--k5-ac)";
  return null;
}

/** Mini month calendar: picking a day opens it in the Day plan. */
export function MiniCalendar({ selectedDate, todayKey, days, onPick, onMonth, onClose }) {
  const { isMiddle } = useDashboardContext();
  const cells = getMonthGridDays(selectedDate);
  const inPopup = Boolean(onClose);
  const titleId = inPopup ? "k5-calpop-title" : "k5-mini-title";
  const Title = inPopup ? DialogTitle : "h2";
  return (
    // Below 760px the left-column mini calendar is hidden; the plan's "Show calendar" button opens
    // the same calendar in a popup (`onClose` set) instead (mockup #minical / calOpen).
    <section
      id={inPopup ? undefined : "k5-minical"}
      aria-labelledby={titleId}
      data-pin={inPopup ? undefined : "mini"}
      className={inPopup ? "flex flex-col gap-2.5" : `${K5_CARD} flex flex-col gap-2.5 p-4 max-[760px]:hidden`}
    >
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous month" onClick={() => onMonth(-1)} className={`${K5_ROUND_BTN} !shadow-none`}>
          <ChevronLeft className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>
        <Title id={titleId} className="m-0 flex-1 text-center font-k5-display text-[22px] font-semibold leading-tight">
          {format(selectedDate, "MMMM yyyy")}
        </Title>
        <button type="button" aria-label="Next month" onClick={() => onMonth(1)} className={`${K5_ROUND_BTN} !shadow-none`}>
          <ChevronRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>
        {inPopup && (
          <button
            type="button"
            aria-label="Close calendar"
            onClick={onClose}
            className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-red bg-k5-red text-white"
          >
            <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-k5-display text-[15px] font-semibold">
        {WEEK_LETTERS.map((l, i) => (
          <span key={l} className={WEEKDAY_TEXT[i]}>
            {l}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const key = dayKey(date);
          if (!isSameMonth(date, selectedDate)) {
            return (
              <span key={key} className="flex h-[38px] items-center justify-center text-[15px] font-semibold text-k5-mut">
                {date.getDate()}
              </span>
            );
          }
          const isToday = key === todayKey;
          // The day open in the Day plan (when it is not today): a light tile with an accent ring (mockup selBg / selRing).
          const isSel = !isToday && key === dayKey(selectedDate);
          const color = dotColor(dayAt(days, key));
          return (
            <div key={key} className="flex justify-center">
              <button
                type="button"
                aria-current={isToday ? "date" : undefined}
                aria-pressed={isToday ? undefined : isSel}
                aria-label={format(date, "EEEE, MMMM d")}
                onClick={() => onPick(date)}
                className={`relative flex cursor-pointer items-center justify-center rounded-full border-none font-black ${
                  isToday ? "h-10 w-10 bg-k5-ac text-[17px] text-white shadow-[0_3px_0_var(--k5-acd)]" : isSel
                      ? `h-[38px] w-[38px] bg-k5-act text-base text-k5-acx ${isMiddle ? "shadow-[inset_0_0_0_2px_var(--k5-ac)]" : "shadow-[inset_0_0_0_3px_var(--k5-ac)]"}`
                      : "h-[38px] w-[38px] bg-transparent text-base text-k5-ink hover:bg-k5-soft"
                }`}
              >
                {date.getDate()}
                {isToday && <Star className="absolute -right-1.5 -top-1.5 h-4 w-4 fill-[#FFC531] text-[#C9930A]" aria-hidden="true" />}
                {color && !isToday && (
                  <span aria-hidden="true" className="absolute bottom-0.5 left-1/2 -ml-1 block h-2 w-2 rounded-full" style={{ background: color }} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Mobile calendar popup (mockup calOpen): the mini calendar in a dialog; picking a day opens it. */
export function CalendarPopup({ open, onClose, onPick, ...calendar }) {
  const themeProps = useK5ThemeProps(
    "w-[380px] max-w-[calc(100%-2rem)] gap-3 rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-4 text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[380px]",
  );
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {open && (
        <DialogContent showCloseButton={false} {...themeProps}>
          <MiniCalendar
            {...calendar}
            onClose={onClose}
            onPick={(date) => {
              onPick(date);
              onClose();
            }}
          />
          <DialogDescription className="m-0 flex items-center justify-center gap-2 text-sm font-extrabold text-k5-mut">
            <span aria-hidden="true" className="block h-2 w-2 rounded-full bg-k5-ac" />
            Dot = something planned
          </DialogDescription>
        </DialogContent>
      )}
    </Dialog>
  );
}

/** One event of the Today card: a quiet pill; a class is dashed; a live one blinks like the mockup (a fading dot and a pulsing ring). */
function TodayItem({ event, color, live, onOpen }) {
  const isClass = event.eventKind === "class";
  const title = isClass ? classTitle(event) : event.title || event.eventTitle;
  const time = event.displayTime || timeRange(event);
  return (
    <button
      type="button"
      onClick={() => onOpen?.(event)}
      className={`flex w-full cursor-pointer flex-col items-center rounded-[14px] bg-k5-card px-3 py-2 text-center text-k5-ink border-2 ${isClass ? "border-dashed" : "border-solid"} ${live ? "k5-live-pill" : ""}`}
      style={{ borderColor: color }}
    >
      {title && (
        <span className="flex items-center justify-center gap-2 text-[15px] font-black leading-tight">
          {live && <span aria-hidden="true" className="k5-live-dot block h-2.5 w-2.5 flex-none rounded-full bg-k5-gi" />}
          {title}
        </span>
      )}
      {time && <span className="text-sm font-bold text-k5-mut">{time}</span>}
    </button>
  );
}

function TodayGroup({ label, items, courseRegistry, live = false, onOpen }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="m-0 text-base font-black">{label}</h3>
      {items.length === 0 ? (
        <p className="m-0 text-[15px] font-bold text-k5-mut">No Class &amp; School Activity</p>
      ) : (
        items.map((event) => <TodayItem key={event.id} event={event} color={getEventColor(event, courseRegistry)} live={live} onOpen={onOpen} />)
      )}
    </div>
  );
}

/**
 * Today at a glance, like the legacy Today panel: Live, Upcoming and Completed "Class & School Activity" (the day's timed
 * classes and school activities). The live ones blink (mockup liveDot / liveRing). Tapping one opens its details.
 */
export function TodayCard({ todayKey, days, courseRegistry, onOpen }) {
  const day = dayAt(days, todayKey);
  const timed = [...day.classes, ...day.activities].filter((event) => !event.allDay && event.startZoned).sort((x, y) => x.startZoned.getTime() - y.startZoned.getTime());
  const group = (status) => timed.filter((event) => event.k5Status === status);
  return (
    <section aria-labelledby="k5-today-title" className={`${K5_CARD} flex flex-col gap-3 p-4`}>
      <h2 id="k5-today-title" className="m-0 font-k5-display text-[22px] font-semibold">
        Today
      </h2>
      <TodayGroup label="Live Class & School Activity" items={group("live")} courseRegistry={courseRegistry} live onOpen={onOpen} />
      <TodayGroup label="Upcoming Class & School Activity" items={group("next")} courseRegistry={courseRegistry} onOpen={onOpen} />
      <TodayGroup label="Completed Class & School Activity" items={group("done")} courseRegistry={courseRegistry} onOpen={onOpen} />
    </section>
  );
}

/** My Courses: every enrolled course, tap to show / hide its classes in the planner. */
export function MyCourses({ courseRegistry, courseVisibility, onToggle }) {
  const courses = Object.values(courseRegistry || {});
  if (!courses.length) return null;
  return (
    <section aria-labelledby="k5-courses-title" className={`${K5_CARD} flex flex-col gap-2 p-4`}>
      <h2 id="k5-courses-title" className="m-0 mb-1 font-k5-display text-[22px] font-semibold">
        My Courses
      </h2>
      {courses.map((course) => {
        const shown = courseVisibility[course.id] !== false;
        const { tile, ink, color: styleColor } = subjectStyle(course.label);
        // The course colour from the school calendar wins; the subject palette is only the fallback.
        const apiColor = safeCourseColor(course.color);
        const color = apiColor || styleColor;
        return (
          <button
            key={course.id}
            type="button"
            aria-pressed={shown}
            onClick={() => onToggle(course.id)}
            title={shown ? "Hide this course in my plan" : "Show this course in my plan"}
            className={`flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-[14px] border-none px-2 py-1 text-left ${shown ? (apiColor ? "" : tile) : "bg-k5-soft"}`}
            style={shown && apiColor ? { background: courseTint(apiColor) } : undefined}
          >
            <span className="k5h-ctile flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl bg-k5-card" style={apiColor ? { color: apiColor } : undefined}>
              <SubjectIcon name={course.label} className={`h-[22px] w-[22px] ${apiColor ? "" : ink}`} />
            </span>
            <span className={`flex-1 text-[15px] font-black ${shown ? "text-k5-ink" : "text-k5-mut"}`}>{course.label}</span>
            {/* Mockup checkbox: filled in the subject colour with a tick while the course is shown. */}
            <span
              aria-hidden="true"
              className={`k5h-cchk flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg ${shown ? "" : "border-[3px] border-k5-line bg-k5-card"}`}
              style={shown ? { background: color } : undefined}
            >
              {shown && <Check className="h-4 w-4 text-white" strokeWidth={3.5} />}
            </span>
          </button>
        );
      })}
    </section>
  );
}
