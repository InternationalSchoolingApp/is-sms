"use client";

import { getAssignmentStatus, getClassCompletionStatus, getEventColor, getEventStatus } from "@/utils/calendarEvents";

const STATUS_BADGE_STYLE = {
  live: { label: "LIVE", background: "#e53935" },
  missed: { label: "MISSED", background: "#d93025" },
  lateJoin: { label: "LATE JOIN", background: "#ff6d00" },
};

function Badge({ label, background }) {
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ background }}
    >
      {label}
    </span>
  );
}

function ClassOrActivityBadges({ event, color, now }) {
  const status = getEventStatus(event, now);
  if (status === "live") return <Badge {...STATUS_BADGE_STYLE.live} />;
  if (status === "upcoming") return <Badge label="UPCOMING" background={color} />;
  const completion = getClassCompletionStatus(event);
  return (
    <span className="flex flex-wrap gap-1">
      <Badge label="EXPIRED" background={color} />
      {completion === "missed" && <Badge {...STATUS_BADGE_STYLE.missed} />}
      {completion === "lateJoin" && <Badge {...STATUS_BADGE_STYLE.lateJoin} />}
    </span>
  );
}

function AssignmentBadge({ event, now }) {
  const aStatus = getAssignmentStatus(event, now);
  const color = aStatus.status === "submitted" ? "#1b5e20" : aStatus.status === "pending" ? "#f4b400" : "#1a73e8";
  return <Badge label={aStatus.label} background={color} />;
}

function getSubtitle(event, courseRegistry) {
  const course = courseRegistry[event.courseId];
  const parts = [];
  if (course?.label) parts.push(course.label);
  else if (event.eventKind === "holiday") parts.push("Holiday / Break");
  else if (event.eventKind === "schoolEvent") parts.push("School Event");
  else if (event.eventKind === "activity") parts.push("Activity");
  else if (event.subjectName) parts.push(event.subjectName);

  if (event.displayTime) parts.push(event.displayTime);
  if (event.origName) parts.push(event.origName);
  return parts.join(" · ");
}

/**
 * One event row in the Today view / week-day drilldown list. Faithful (minus
 * the join-class/feedback actions, which are tracked as separate follow-up
 * scope) port of the legacy renderCustomTodayEvent.
 */
export function EventCard({ event, courseRegistry, now = new Date(), onSelect }) {
  const color = getEventColor(event, courseRegistry);
  const isClass = event.eventKind === "class";
  const title = event.title || event.eventTitle || getSubtitle(event, courseRegistry).split(" · ")[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(event)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect?.(event)}
      className="flex min-h-[52px] cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 shadow-sm hover:shadow-md"
      style={isClass ? { borderStyle: "dashed", borderColor: color } : { borderColor: color }}
    >
      <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {event.eventKind === "assignment" ? (
            <AssignmentBadge event={event} now={now} />
          ) : (
            <ClassOrActivityBadges event={event} color={color} now={now} />
          )}
          <span className="truncate text-sm font-bold text-black">{title || "Untitled"}</span>
        </div>
        <p className="mt-1 truncate text-xs text-black/60">{getSubtitle(event, courseRegistry)}</p>
      </div>
    </div>
  );
}
