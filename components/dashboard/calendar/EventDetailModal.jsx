"use client";

import { format } from "date-fns";
import { ActivityDetailsModal } from "@/components/dashboard/calendar/ActivityDetailsModal";
import { CalendarModal, DetailRow } from "@/components/dashboard/calendar/CalendarModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { openLmsLesson } from "@/utils/lmsCourseLink";
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

// "1 hour 30 mins" (legacy openPastClassModal's Duration).
function formatSpan(totalMinutes) {
  if (!(totalMinutes > 0)) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours > 0 && `${hours} ${hours === 1 ? "hour" : "hours"}`, minutes > 0 && `${minutes} ${minutes === 1 ? "min" : "mins"}`].filter(Boolean).join(" ");
}

// "1 hour 2 mins 5 secs" (legacy Late row).
function formatLate(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [
    hours > 0 && `${hours} ${hours === 1 ? "hour" : "hours"}`,
    minutes > 0 && `${minutes} ${minutes === 1 ? "min" : "mins"}`,
    secs > 0 && `${secs} ${secs === 1 ? "sec" : "secs"}`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * A class that has ended (legacy openPastClassModal): batch name, Date, Status "Expired", start Time, Duration, Late and
 * the teacher (not for a batch class). The "Rate this class" button belongs to class feedback, which is another team's.
 */
function PastClassDetail({ event }) {
  const minutes = event.startZoned && event.endZoned ? Math.round((event.endZoned - event.startZoned) / 60000) : 0;
  const teacher = event.category !== "BATCH" && event.origName && event.origName !== "Teacher" ? event.origName : null;
  return (
    <>
      {event.category === "BATCH" && event.batchName && <p className="text-center text-base font-extrabold">{event.batchName}</p>}
      <DetailRow label="Date" value={event.startZoned ? format(event.startZoned, "MMM d, yyyy") : null} />
      <DetailRow label="Status" value="Expired" />
      <DetailRow label="Time" value={event.startZoned ? format(event.startZoned, "h:mm a") : null} />
      <DetailRow label="Duration" value={formatSpan(minutes)} />
      {event.lateSeconds > 0 && <DetailRow label="Late" value={formatLate(event.lateSeconds)} />}
      <DetailRow label="Teacher" value={teacher} />
    </>
  );
}

function ClassOrActivityDetail({ event, courseRegistry }) {
  const status = getEventStatus(event);
  if (event.eventKind === "class" && status === "completed") return <PastClassDetail event={event} />;
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
  const { lmsProviderURL, isPayLmsPaymentPending } = useDashboardContext();
  const aStatus = getAssignmentStatus(event);
  return (
    <>
      <DetailRow label="Course" value={event.subjectName} />
      <DetailRow label="Due Date" value={event.dueDate ? format(new Date(event.dueDate), "MMM d, yyyy") : null} />
      <DetailRow label="Status" value={aStatus.label} />
      {aStatus.timingLabel && <DetailRow label="Timing" value={aStatus.timingLabel} />}
      {aStatus.status === "submitted" && <DetailRow label="Submitted" value={aStatus.dateDisplay} />}
      {/* Legacy openAssignmentModal: a pending assignment gets an Attempt button that opens the LMS. */}
      {aStatus.label === "Pending" && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => openLmsLesson({ isPayLmsPaymentPending, lmsProviderUrl: lmsProviderURL })}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Attempt
          </button>
        </div>
      )}
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
  // A school activity opens its own popup: purpose, attachment, countdown and the timed Join Event (legacy renderViewActitifyDetails).
  if (event.eventKind === "activity") return <ActivityDetailsModal event={event} onClose={onClose} />;
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
