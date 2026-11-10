"use client";

import { format } from "date-fns";
import { CalendarModal, DetailRow } from "@/components/dashboard/calendar/CalendarModal";
import {
  getAssignmentStatus,
  getClassCompletionStatus,
  getEventColor,
  getEventStatus,
} from "@/utils/calendarEvents";

function formatDuration(seconds) {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return minutes <= 1 ? "1 minute" : `${minutes} minutes`;
}

function statusLabel(status) {
  switch (status) {
    case "live":
      return "Live";
    case "upcoming":
      return "Upcoming";
    case "missed":
      return "Missed";
    case "lateJoin":
      return "Late Join";
    default:
      return "Expired";
  }
}

function ClassOrActivityDetail({ event, courseRegistry }) {
  const status = getEventStatus(event);
  const displayStatus = status === "completed" && event.eventKind === "class" ? getClassCompletionStatus(event) : status;
  const course = courseRegistry[event.courseId];

  return (
    <>
      <DetailRow label="Course" value={course?.label || event.subjectName} />
      <DetailRow label="Date" value={event.startZoned ? format(event.startZoned, "MMM d, yyyy") : null} />
      <DetailRow label="Status" value={statusLabel(displayStatus)} />
      <DetailRow label="Time" value={event.displayTime} />
      {event.lateSeconds > 0 && <DetailRow label="Late by" value={formatDuration(event.lateSeconds)} />}
      <DetailRow label={event.eventKind === "activity" ? "Teacher" : "With"} value={event.origName} />
      {event.batchName && <DetailRow label="Batch" value={event.batchName} />}
      {event.grade && <DetailRow label="Grade" value={event.grade} />}
    </>
  );
}

function AssignmentDetail({ event }) {
  const aStatus = getAssignmentStatus(event);
  return (
    <>
      <DetailRow label="Course" value={event.subjectName} />
      <DetailRow label="Due Date" value={event.dueDate ? format(new Date(event.dueDate), "MMM d, yyyy") : null} />
      <DetailRow label="Status" value={aStatus.label} />
      {aStatus.timingLabel && <DetailRow label="Timing" value={aStatus.timingLabel} />}
      {aStatus.status === "submitted" && <DetailRow label="Submitted" value={aStatus.dateDisplay} />}
    </>
  );
}

function HolidayOrEventDetail({ event }) {
  return (
    <>
      <DetailRow label="Date" value={event.startZoned ? format(event.startZoned, "MMM d, yyyy") : null} />
      {(event.activities || event.title) && <p className="pt-1 text-black/80">{event.activities || event.title}</p>}
    </>
  );
}

/**
 * Read-only event detail popup — the informational content from the legacy
 * openPastClassModal / openAssignmentModal / eventDetailsOnModal, minus the
 * join-class and feedback-submission actions (separate, larger pieces of
 * scope tracked for a follow-up pass).
 */
export function EventDetailModal({ event, courseRegistry, onClose }) {
  if (!event) return null;
  const title = event.title || event.eventTitle || "Event details";
  const accentColor = getEventColor(event, courseRegistry);

  return (
    <CalendarModal title={title} onClose={onClose}>
      <div className="mb-1 h-1 w-10 rounded-full" style={{ background: accentColor }} />
      {event.eventKind === "assignment" ? (
        <AssignmentDetail event={event} />
      ) : event.eventKind === "holiday" || event.eventKind === "schoolEvent" ? (
        <HolidayOrEventDetail event={event} />
      ) : (
        <ClassOrActivityDetail event={event} courseRegistry={courseRegistry} />
      )}
    </CalendarModal>
  );
}
