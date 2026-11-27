"use client";

import { useLayoutEffect, useRef } from "react";
import { CalendarDays } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { VIEWS, attendanceLabel, eventStatus } from "@/components/parent/classSchedule/scheduleRows";
import { clockInZone } from "@/utils/parentHome";
import { parseYmd, pickerDateToYmd, todayYmd, ymdToPickerDate } from "@/utils/attendanceDates";
import "@/components/parent/classSchedule/classSchedule.css";

const CATEGORIES = [
  { key: "ALL", label: "All", count: "all" },
  { key: "CLASS", label: "Classes", count: "classes" },
  { key: "ACTIVITY", label: "Activity", count: "activities" },
];
const STATUS_CLASS = { live: "l", muted: "d", danger: "x", warning: "" };
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Jane Doe" -> "JD" (a leading salutation is ignored). */
function initials(name) {
  const parts = String(name ?? "").replace(/^(Mr|Ms|Mrs|Miss|Dr)\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return parts.length ? (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase() : "";
}

/** The day tile: weekday, day of month, month (and "Today"), from a plain calendar date. */
function dateParts(ymd) {
  const p = parseYmd(ymd);
  if (!p) return { dow: "", day: ymd, mon: "" };
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
  return { dow: DOW[d.getUTCDay()], day: d.getUTCDate(), mon: MON[d.getUTCMonth()] };
}

/** The Daily / Weekly / Custom switch with the sliding pill. */
function Segmented({ view, onView }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const seg = ref.current;
    if (!seg) return undefined;
    const move = () => {
      const pill = seg.querySelector("i");
      const on = seg.querySelector('[aria-selected="true"]');
      if (!pill || !on) return;
      pill.style.width = `${on.offsetWidth}px`;
      pill.style.transform = `translateX(${on.offsetLeft - 4}px)`;
    };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [view]);
  return (
    <div className="sc-seg" ref={ref} role="tablist" aria-label="Schedule range">
      <i aria-hidden="true" />
      {VIEWS.map((item) => (
        <button key={item.key} type="button" role="tab" aria-selected={view === item.key} onClick={() => onView(item.key)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function EventCard({ event, now, timeZone, onViewSummary }) {
  const status = eventStatus(event, now);
  const cls = STATUS_CLASS[status.tone] ?? "";
  const isLive = status.tone === "live";
  const attendance = attendanceLabel(event);
  const hasTeacher = event.teacher && event.teacher !== "N/A";
  const canView = Boolean(onViewSummary && event.attended && event.meetingId);
  return (
    <div className={`sc-it${event.category === "ACTIVITY" ? " act" : ""}${isLive ? " scLive" : ""}${onViewSummary ? " vs" : ""}`}>
      <div className="sc-tm">
        <b>{clockInZone(event.start, timeZone)}</b>
        <span>
          to {clockInZone(event.end, timeZone)} · {event.minutes} min
        </span>
      </div>
      <div className="sc-nm">
        <b>{event.courseName}</b>
        <span>
          {hasTeacher && <em>{initials(event.teacher)}</em>}
          {event.teacher}
        </span>
      </div>
      <span className={`sc-p sc-ty${event.category === "ACTIVITY" ? " a" : ""}`}>{event.category === "ACTIVITY" ? "Activity" : "Class"}</span>
      <span className={`sc-p s sc-st ${cls}`}>{status.label}</span>
      <span className={`sc-at${attendance === "N/A" ? " n" : ""}`}>{attendance}</span>
      {onViewSummary && (
        <span className="sc-vw">
          {canView ? (
            <button type="button" className="fbtn o" onClick={() => onViewSummary(event)}>
              View
            </button>
          ) : (
            <span className="sc-at n">N/A</span>
          )}
        </span>
      )}
    </div>
  );
}

/**
 * The shared body of the parent Class Schedule and Class Summary pages: hero, Daily/Weekly/Custom switch, All /
 * Classes / Activity chips, the custom range form and the day-by-day list. Presentational: the page owns the view,
 * the custom range, the data and the clock.
 *  - days: groupByDay result; counts: countByCategory of the shown range (before the category filter)
 *  - custom: { from, to, onFrom, onTo, onSearch, error, bounds {min, max} } (ymd strings)
 *  - state: { isLoading, sessionOut, failed, retry, idle } — idle = a custom range not applied yet
 *  - onViewSummary(event): when given, a "View Summary" column is added
 */
export function ClassCalendarPanel({
  title,
  timeZone,
  clock,
  view,
  onView,
  category,
  onCategory,
  counts,
  days,
  now,
  custom,
  state,
  emptyDay = "No Class / Activity",
  onViewSummary,
}) {
  const message = state.isLoading
    ? "Loading…"
    : state.sessionOut
      ? "Your session has expired. Please log in again."
      : state.failed
        ? "Unable to load the schedule."
        : state.idle
          ? "Select a start date and an end date, then press Search."
          : null;
  const today = todayYmd(timeZone, now);
  const subtitle = days.length === 0 ? "" : days.length === 1 ? days[0].heading : `${days[0].heading} – ${days[days.length - 1].heading}`;

  return (
    <section className="sch on" aria-label={title}>
      <div className="sc-hero">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="sc-clock">
          <small>{timeZone}</small>
          {clock && <b className="sc-clock-t">{clock}</b>}
        </div>
      </div>

      <div className="sc-bar">
        <Segmented view={view} onView={onView} />
        <div className="sc-chips" role="group" aria-label="Show">
          {CATEGORIES.map((item) => (
            <button key={item.key} type="button" className="sc-chip" aria-pressed={category === item.key} onClick={() => onCategory(item.key)}>
              {item.label} <b>{counts[item.count]}</b>
            </button>
          ))}
        </div>
      </div>

      {view === "custom" && (
        <form
          className="sc-rng on"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            custom.onSearch();
          }}
        >
          <div className="sc-dp">
            <DatePicker
              icon={CalendarDays}
              label="Start date"
              height="h-11"
              value={ymdToPickerDate(custom.from)}
              fromDate={ymdToPickerDate(custom.bounds.min)}
              toDate={ymdToPickerDate(custom.bounds.max)}
              onChange={(date) => custom.onFrom(pickerDateToYmd(date) ?? "")}
            />
          </div>
          <span className="sc-to" aria-hidden="true">
            to
          </span>
          <div className="sc-dp">
            <DatePicker
              icon={CalendarDays}
              label="End date"
              height="h-11"
              value={ymdToPickerDate(custom.to)}
              fromDate={ymdToPickerDate(custom.bounds.min)}
              toDate={ymdToPickerDate(custom.bounds.max)}
              onChange={(date) => custom.onTo(pickerDateToYmd(date) ?? "")}
            />
          </div>
          <button type="submit" className="sc-go">
            Search
          </button>
          {custom.error && (
            <p role="alert" className="sc-err on">
              {custom.error}
            </p>
          )}
        </form>
      )}

      <div className="sc-list">
        {message ? (
          <div className="sc-empty">
            <p style={{ margin: 0 }}>{message}</p>
            {state.failed && !state.isLoading && (
              <button type="button" className="sc-go" onClick={state.retry}>
                Try again
              </button>
            )}
          </div>
        ) : (
          days.map((day, index) => {
            const parts = dateParts(day.ymd);
            const isToday = day.ymd === today;
            return (
              <div key={day.ymd} className={`sc-day${isToday ? " today" : ""}`} style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}>
                <div className="sc-dt">
                  <small>{parts.dow}</small>
                  <b>{parts.day}</b>
                  <span>
                    {parts.mon}
                    {isToday ? " · Today" : ""}
                  </span>
                </div>
                <div className="sc-dl">
                  {day.rows.length === 0 ? (
                    <div className="sc-no">{emptyDay}</div>
                  ) : (
                    day.rows.map((event) => <EventCard key={event.key} event={event} now={now} timeZone={timeZone} onViewSummary={onViewSummary} />)
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
