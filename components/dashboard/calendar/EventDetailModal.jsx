"use client";

import DOMPurify from "dompurify";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { ActivityDetailsModal } from "@/components/dashboard/calendar/ActivityDetailsModal";
import { CalendarModal, DetailRow, calendarButtonClass } from "@/components/dashboard/calendar/CalendarModal";
import { RateFeedbackButton } from "@/components/dashboard/calendar/RateFeedbackButton";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { openLmsLesson } from "@/utils/lmsCourseLink";
import { cleanCourseLabel } from "@/utils/k5Calendar";
import {
  eventDisplayTime,
  getAssignmentStatus,
  getClassCompletionStatus,
  getEventColor,
  getEventStatus,
} from "@/utils/calendarEvents";

// `t`: useTranslations("calendar").
function formatDuration(seconds, t) {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return t("duration.minutes", { count: minutes <= 1 ? 1 : minutes });
}

const STATUS_KEYS = { live: "live", upcoming: "upcoming", missed: "missed", lateJoin: "lateJoin" };

function statusLabel(status, t) {
  return t(`status.${STATUS_KEYS[status] || "expired"}`);
}

// "1 hour 30 mins" (legacy openPastClassModal's Duration).
function formatSpan(totalMinutes, t) {
  if (!(totalMinutes > 0)) return null;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours > 0 && t("duration.hours", { count: hours }), minutes > 0 && t("duration.mins", { count: minutes })].filter(Boolean).join(" ");
}

// "1 hour 2 mins 5 secs" (legacy Late row).
function formatLate(seconds, t) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [
    hours > 0 && t("duration.hours", { count: hours }),
    minutes > 0 && t("duration.mins", { count: minutes }),
    secs > 0 && t("duration.secs", { count: secs }),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * A class that has ended (legacy openPastClassModal): batch name, Date, Status "Expired", start Time, Duration, Late and
 * the teacher (not for a batch class), and the "Rate this class" button when the class has a feedback form.
 */
function PastClassDetail({ event, onClose }) {
  const t = useTranslations("calendar");
  const dateLocale = useDateFnsLocale();
  const minutes = event.startZoned && event.endZoned ? Math.round((event.endZoned - event.startZoned) / 60000) : 0;
  const teacher = event.category !== "BATCH" && event.origName && event.origName !== "Teacher" ? event.origName : null;
  return (
    <>
      {event.category === "BATCH" && event.batchName && <p className="m-0 text-center text-base font-extrabold">{event.batchName}</p>}
      <DetailRow label={t("detail.date")} value={event.startZoned ? format(event.startZoned, "MMM d, yyyy", { locale: dateLocale }) : null} />
      <DetailRow label={t("detail.status")} value={t("status.expired")} />
      <DetailRow label={t("detail.time")} value={event.startZoned ? format(event.startZoned, "h:mm a", { locale: dateLocale }) : null} />
      <DetailRow label={t("detail.duration")} value={formatSpan(minutes, t)} />
      {event.lateSeconds > 0 && <DetailRow label={t("detail.late")} value={formatLate(event.lateSeconds, t)} />}
      <DetailRow label={t("detail.teacher")} value={teacher} />
      <div className="flex justify-end pt-2">
        <RateFeedbackButton event={event} onBeforeOpen={onClose} />
      </div>
    </>
  );
}

function ClassOrActivityDetail({ event, courseRegistry, onClose }) {
  const t = useTranslations("calendar");
  const dateLocale = useDateFnsLocale();
  const status = getEventStatus(event);
  if (event.eventKind === "class" && status === "completed") return <PastClassDetail event={event} onClose={onClose} />;
  const displayStatus = status === "completed" && event.eventKind === "class" ? getClassCompletionStatus(event) : status;
  const course = courseRegistry[event.courseId];

  return (
    <>
      <DetailRow label={t("detail.course")} value={course?.label || event.subjectName} />
      <DetailRow label={t("detail.date")} value={event.startZoned ? format(event.startZoned, "MMM d, yyyy", { locale: dateLocale }) : null} />
      <DetailRow label={t("detail.status")} value={statusLabel(displayStatus, t)} />
      <DetailRow label={t("detail.time")} value={eventDisplayTime(event, dateLocale)} />
      {event.lateSeconds > 0 && <DetailRow label={t("detail.lateBy")} value={formatDuration(event.lateSeconds, t)} />}
      <DetailRow label={event.eventKind === "activity" ? t("detail.teacher") : t("detail.with")} value={event.origName} />
      {event.batchName && <DetailRow label={t("detail.batch")} value={event.batchName} />}
      {event.grade && <DetailRow label={t("detail.grade")} value={event.grade} />}
    </>
  );
}

function AssignmentDetail({ event }) {
  const { lmsProviderURL, isPayLmsPaymentPending, isK5 } = useDashboardContext();
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const dateLocale = useDateFnsLocale();
  const aStatus = getAssignmentStatus(event, new Date(), { locale: dateLocale });
  return (
    <>
      <DetailRow label={t("detail.course")} value={cleanCourseLabel(event.subjectName)} />
      {/* A due date is a plain day ("2026-11-16"): read as that day, never as UTC midnight (which is the day before west of UTC). */}
      <DetailRow label={t("detail.dueDate")} value={event.startZoned ? format(event.startZoned, "MMM d, yyyy", { locale: dateLocale }) : event.dueDate || null} />
      <DetailRow label={t("detail.status")} value={t(`assignmentStatus.${aStatus.status}`)} />
      {aStatus.timing && <DetailRow label={t("detail.timing")} value={t(`assignmentTiming.${aStatus.timing.kind}`, { count: aStatus.timing.days })} />}
      {aStatus.status === "submitted" && <DetailRow label={t("detail.submitted")} value={aStatus.dateDisplay} />}
      {/* Legacy openAssignmentModal: a pending assignment gets an Attempt button that opens the LMS. */}
      {aStatus.label === "Pending" && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => openLmsLesson({ isPayLmsPaymentPending, lmsProviderUrl: lmsProviderURL }, { couldNotOpen: tc("lms.couldNotOpen"), notAvailable: tc("lms.notAvailable") })}
            className={calendarButtonClass(isK5, "primary")}
          >
            {t("attempt")}
          </button>
        </div>
      )}
    </>
  );
}

function HolidayOrEventDetail({ event }) {
  const t = useTranslations("calendar");
  const dateLocale = useDateFnsLocale();
  const text = event.activities || event.title;
  return (
    <>
      <DetailRow label={t("detail.date")} value={event.startZoned ? format(event.startZoned, "MMM d, yyyy", { locale: dateLocale }) : null} />
      {/* The description is HTML written by the school (<p>, <strong>...): render it, sanitized; inline colours are dropped so it follows the look. */}
      {text && (/<[a-z][sS]*>/i.test(text) ? (
        <div className="pt-1 leading-relaxed [&_p]:m-0 [&_p]:mb-2 [&_strong]:font-black [&_a]:underline" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text, { FORBID_ATTR: ["style", "class"] }) }} />
      ) : (
        <p className="m-0 pt-1">{text}</p>
      ))}
    </>
  );
}

/**
 * Read-only event detail popup — the informational content from the legacy
 * openPastClassModal / openAssignmentModal / eventDetailsOnModal, plus the
 * "Rate this class" button of a finished class (class feedback).
 */
export function EventDetailModal({ event, courseRegistry, onClose }) {
  const t = useTranslations("calendar");
  if (!event) return null;
  // A school activity opens its own popup: purpose, attachment, countdown and the timed Join Event (legacy renderViewActitifyDetails).
  if (event.eventKind === "activity") return <ActivityDetailsModal event={event} onClose={onClose} />;
  const title = event.title || event.eventTitle || t("eventDetails");
  const accentColor = getEventColor(event, courseRegistry);

  return (
    <CalendarModal title={title} onClose={onClose}>
      <div className="mb-1 h-1 w-10 rounded-full" style={{ background: accentColor }} />
      {event.eventKind === "assignment" ? (
        <AssignmentDetail event={event} />
      ) : event.eventKind === "holiday" || event.eventKind === "schoolEvent" ? (
        <HolidayOrEventDetail event={event} />
      ) : (
        <ClassOrActivityDetail event={event} courseRegistry={courseRegistry} onClose={onClose} />
      )}
    </CalendarModal>
  );
}
