"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { CalendarModal, DetailRow, calendarButtonClass, calendarNoteClass } from "@/components/dashboard/calendar/CalendarModal";
import { RateFeedbackButton } from "@/components/dashboard/calendar/RateFeedbackButton";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { getActivityDetails, getClassJoinDetails } from "@/services/dashboardApi";
import { DUMMY_STUDENT_TIMEZONE, eventDisplayTime, resolveTimezone } from "@/utils/calendarEvents";

const pad = (value) => String(value).padStart(2, "0");

/** Days / hours / minutes / seconds left (legacy "Time Remaining" boxes). */
function Countdown({ ms, k5 }) {
  const t = useTranslations("calendar");
  const total = Math.max(0, Math.floor(ms / 1000));
  // [value, unit] - the unit's label is calendar.activity.countdown.<unit>.
  const parts = [
    [Math.floor(total / 86400), "days"],
    [Math.floor((total % 86400) / 3600), "hours"],
    [Math.floor((total % 3600) / 60), "min"],
    [total % 60, "sec"],
  ];
  return (
    <div className="my-3 text-center">
      <p className={k5 ? "mb-1.5 text-k5-mut" : "mb-1 text-black/60"}>{t("activity.timeRemaining")}</p>
      <div className="flex justify-center gap-2" role="timer">
        {parts.map(([value, unit]) => (
          <div key={unit} className={k5 ? "min-w-14 rounded-2xl border-2 border-k5-line bg-k5-soft px-2 py-1.5" : "min-w-14 rounded-lg bg-slate-100 px-2 py-1.5"}>
            <div className={k5 ? "font-k5-display text-2xl font-semibold tabular-nums" : "text-xl font-bold tabular-nums"}>{unit === "days" ? value : pad(value)}</div>
            <div className={k5 ? "text-xs font-extrabold text-k5-mut" : "text-[11px] text-black/50"}>{t(`activity.countdown.${unit}`)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Activity details popup (legacy renderViewActitifyDetails / viewActivityContentModal): category, purpose, date, time,
 * details, a "Time Remaining" countdown, the attachment, and a "Join Event" button that appears `showLinkBeforeMinutes`
 * before the start (a student) until the end. An activity that is over says so instead of opening.
 * The facts come from the calendar event; the purpose, attachment, join link and lead time from view-extra-activity.
 */
export function ActivityDetailsModal({ event, onClose }) {
  const { context, isK5 } = useDashboardContext();
  const dummy = useDummyStudent();
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const dateLocale = useDateFnsLocale();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const timezone = dummy.enabled ? DUMMY_STUDENT_TIMEZONE : resolveTimezone(dashboardData.userTimezone);
  const activityId = event.eventId ?? event.activityId ?? event.id;
  const occurrenceDate = event.occurrenceDate || event.localDateKey || "";

  const query = useQuery({
    queryKey: ["activity-details", context?.userId, activityId, occurrenceDate],
    queryFn: () => getActivityDetails({ schoolUUID: context.schoolUUID, userId: context.userId, activityId, occurrenceDate }),
    enabled: Boolean(context?.schoolUUID && context?.userId && activityId && dummy.settled && !dummy.enabled),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const details = query.data?.status == 1 ? query.data : null;

  const [now, setNow] = useState(() => toZonedTime(new Date(), timezone));
  useEffect(() => {
    const id = setInterval(() => setNow(toZonedTime(new Date(), timezone)), 1000);
    return () => clearInterval(id);
  }, [timezone]);

  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  // Legacy: "View Attachment" opens the file in a dialog of this tab; "Join Event" opens the class in a new tab and leaves a
  // "Join Class Now / copy the link" dialog here.
  const [view, setView] = useState("details");
  const [classLink, setClassLink] = useState("");

  const start = event.startZoned;
  const end = event.endZoned;
  const over = Boolean(end && now >= end);
  const leadMinutes = Number(details?.showLinkBeforeMinutes ?? 30);
  const untilStart = start ? start.getTime() - now.getTime() : 0;
  const joinOpen = Boolean(details?.joiningLink) && !over && untilStart <= leadMinutes * 60000;
  const attachment = details?.filePath || "";

  const join = async () => {
    setJoining(true);
    setJoinMessage("");
    const answer = await getClassJoinDetails({ schoolUUID: context.schoolUUID, url: details.joiningLink });
    setJoining(false);
    if (!answer) {
      setJoinMessage(t("activity.couldNotOpen"));
    } else if (["0", "2", "3"].includes(String(answer.status))) {
      setJoinMessage(answer.message || t("activity.cannotJoin"));
    } else if (answer.redirectUrl) {
      window.open(answer.redirectUrl, "_blank", "noopener,noreferrer");
      setClassLink(answer.redirectUrl);
      setView("joined");
    }
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(classLink);
      toast.success(t("activity.linkCopied"));
    } catch {
      toast.error(t("activity.copyFailed"));
    }
  };

  const title = details?.categoryName || event.title || event.eventTitle || t("activity.title");
  const activityName = details?.activityTitle || event.title || title;

  if (view === "attachment" && attachment) {
    return (
      <CalendarModal title={title} onClose={onClose} wide>
        <iframe src={attachment} title={t("activity.attachment")} className="h-[60dvh] w-full rounded-xl border-0 bg-white" />
        <div className="flex justify-end pt-2">
          <button type="button" onClick={() => setView("details")} className={calendarButtonClass(isK5, "close")}>
            {tc("actions.close")}
          </button>
        </div>
      </CalendarModal>
    );
  }
  if (view === "joined" && classLink) {
    return (
      <CalendarModal title={title} onClose={onClose}>
        <p className="m-0 text-center">
          {t("activity.scheduledFor", { name: activityName, date: start ? format(start, "MMM d, yyyy hh:mm a", { locale: dateLocale }) : "" })}
        </p>
        <div className="flex justify-center">
          <a href={classLink} target="_blank" rel="noreferrer" className={`${calendarButtonClass(isK5, "primary")} no-underline`}>
            {t("activity.joinClassNow")}
          </a>
        </div>
        <hr className={isK5 ? "m-0 border-0 border-t-2 border-dashed border-k5-line" : "m-0 border-0 border-t border-dashed border-slate-300"} />
        <p className="m-0 text-center">{t("join.joinIssues")}</p>
        <textarea readOnly value={classLink} rows={3} className={isK5 ? "w-full resize-none rounded-2xl border-2 border-k5-line bg-k5-soft p-2.5 font-k5-body text-sm text-k5-ink" : "w-full resize-none rounded-lg border border-slate-300 p-2 text-sm"} />
        <div className={isK5 ? "flex flex-wrap justify-end gap-3 pt-1" : "flex flex-wrap justify-end gap-2 pt-1"}>
          <button type="button" onClick={onClose} className={calendarButtonClass(isK5, "close")}>
            {tc("actions.close")}
          </button>
          <button type="button" onClick={copyLink} className={calendarButtonClass(isK5, "primary")}>
            {t("join.copyClassLink")}
          </button>
        </div>
      </CalendarModal>
    );
  }
  return (
    <CalendarModal title={title} onClose={onClose}>
      {over && <p className={calendarNoteClass(isK5)}>{t("activity.completed")}</p>}
      {details?.activityPurpose && <p className={isK5 ? "m-0" : "font-semibold"}>{details.activityPurpose}</p>}
      <DetailRow label={t("detail.date")} value={start ? format(start, "MMM d, yyyy", { locale: dateLocale }) : null} />
      <DetailRow label={t("detail.time")} value={eventDisplayTime(event, dateLocale)} />
      <DetailRow label={t("detail.details")} value={details?.activityTitle || event.title} />
      <DetailRow label={t("detail.teacher")} value={event.origName} />
      {query.isLoading && <p className={isK5 ? "m-0 py-2 text-center text-k5-mut" : "py-2 text-center text-black/50"}>{t("activity.loadingDetails")}</p>}
      {/* Legacy: the "Time Remaining" title and boxes disappear when the countdown reaches zero. */}
      {details && !over && untilStart > 0 && <Countdown ms={untilStart} k5={isK5} />}
      {details?.joiningLink && !over && !joinOpen && (
        <p className={isK5 ? "m-0 text-center text-sm text-k5-mut" : "text-center text-xs text-black/60"}>{t("activity.joinLinkNotice", { minutes: leadMinutes })}</p>
      )}
      {joinMessage && (
        <p role="alert" className={isK5 ? "m-0 text-center font-black text-k5-ri" : "text-center font-semibold text-red-600"}>
          {joinMessage}
        </p>
      )}
      <div className={isK5 ? "flex flex-wrap justify-end gap-3 pt-2" : "flex flex-wrap justify-end gap-2 pt-2"}>
        {attachment && (
          <button type="button" onClick={() => setView("attachment")} className={calendarButtonClass(isK5, "primary")}>
            {t("activity.viewAttachment")}
          </button>
        )}
        {joinOpen && (
          <button type="button" onClick={join} disabled={joining} className={`${calendarButtonClass(isK5, "join")} disabled:opacity-60`}>
            {joining ? t("activity.opening") : t("activity.joinEvent")}
          </button>
        )}
        {/* Legacy: "Rate this activity" sits before Close once the activity is over and has a feedback form. */}
        <RateFeedbackButton event={event} onBeforeOpen={onClose} />
        <button type="button" onClick={onClose} className={calendarButtonClass(isK5, "close")}>
          {tc("actions.close")}
        </button>
      </div>
    </CalendarModal>
  );
}
