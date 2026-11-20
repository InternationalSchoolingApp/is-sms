"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Copy, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { eventDisplayTime } from "@/utils/calendarEvents";
import { CalendarModal, DetailRow } from "@/components/dashboard/calendar/CalendarModal";
import { getClassJoinDetails } from "@/services/dashboardApi";

// `t`: useTranslations("calendar").
function statusLabel(dateStatus, t) {
  if (dateStatus === "between") return t("join.status.live");
  if (dateStatus === "future") return t("join.status.upcoming");
  if (dateStatus === "past") return t("join.status.ended");
  return t("join.status.unavailable");
}

/**
 * Join-class flow (legacy classDetailsOnModal -> getActualURL ->
 * proceedwithControll -> calendarMeetingLinkValidateStudent): shows the
 * "Almost there, please wait…" loader while the join-validation call is in
 * flight, then — once it comes back live — opens the real meeting in a new
 * tab, exactly like the legacy flow (loader first, redirect only once the
 * API responds; no pre-opened blank tab).
 */
export function JoinClassModal({ event, schoolUUID, courseRegistry, onClose }) {
  const [details, setDetails] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // The backend's own refusal (legacy classDetailsOnModal: status 0 / 2 / 3 shows its message).
  const [refusal, setRefusal] = useState("");
  const [copied, setCopied] = useState(false);
  const linkRef = useRef(null);
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const dateLocale = useDateFnsLocale();

  useEffect(() => {
    let cancelled = false;
    getClassJoinDetails({ schoolUUID, url: event.url }).then((data) => {
      if (cancelled) return;
      if (data?.dateStatus) {
        setDetails(data);
        const url = data.redirectUrl || data.commonJoinUrlOfSMS;
        if (data.dateStatus === "between" && url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } else {
        if (data && ["0", "2", "3"].includes(String(data.status)) && data.message) setRefusal(String(data.message));
        setLoadFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [schoolUUID, event.url]);

  const title = event.title || event.eventTitle || details?.className || t("join.title");
  // Verified live: the real field is `redirectUrl` — `commonJoinUrlOfSMS`
  // exists on the response too but is empty for joinType "A" (student join).
  const joinUrl = details?.redirectUrl || details?.commonJoinUrlOfSMS;
  const course = courseRegistry?.[event.courseId]?.label || details?.subjectName || event.subjectName;
  const isLive = details?.dateStatus === "between";

  const handleCopy = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      linkRef.current?.select();
    }
  };

  // Manual re-trigger (e.g. the auto-opened tab was blocked, or the user
  // closed it) — this click is itself a direct user gesture, so it isn't.
  const handleJoin = () => {
    if (joinUrl) window.open(joinUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <CalendarModal title={title} onClose={onClose}>
      {!details && !loadFailed && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-black">{t("join.almostThere")}</p>
        </div>
      )}

      {loadFailed && <p className="text-sm text-black/70">{refusal || t("join.couldNotOpen")}</p>}

      {details && details.classType === "SYS-TRAINING" && !isLive && (
        // Legacy calendarMeetingLinkValidateStudent: a School System Training that is not live is two lines (no Course /
        // Teacher rows — subjectName there is the participant, not a course).
        <div className="my-4 text-center text-base font-medium text-black">
          <p className="mb-2">
            {t("join.trainingScheduled", { className: details.className, subjectName: details.subjectName, date: details.classDate })}
          </p>
          <p className="m-0">{t("join.trainingJoinOn", { date: details.canJoindateStart })}</p>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-black hover:bg-black/5">
              {tc("actions.close")}
            </button>
          </div>
        </div>
      )}

      {details && !(details.classType === "SYS-TRAINING" && !isLive) && (
        <>
          <DetailRow label={t("detail.course")} value={course} />
          {/* The class's day in the student's own timezone (the calendar's startZoned), like the Time row below. The backend's
              classDate is a moment that new Date() read in the BROWSER's zone, so a 4:00 PM class of a student behind the
              browser (e.g. New York vs an India laptop) showed the next day. */}
          <DetailRow label={t("detail.date")} value={event.startZoned ? format(event.startZoned, "MMM d, yyyy", { locale: dateLocale }) : details.classDate || null} />
          <DetailRow label={t("detail.time")} value={eventDisplayTime(event, dateLocale)} />
          <DetailRow label={t("detail.teacher")} value={event.origName} />
          <DetailRow label={t("detail.status")} value={statusLabel(details.dateStatus, t)} />

          {joinUrl && (
            <>
              <p className="mt-3 text-center text-xs text-black/60">
                {t("join.joinIssues")}
              </p>
              <textarea
                ref={linkRef}
                readOnly
                value={joinUrl}
                rows={3}
                className="mt-2 w-full resize-y rounded-lg border border-slate-200 p-2 text-xs text-black"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? t("join.copied") : t("join.copyClassLink")}
              </button>
            </>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-black hover:bg-black/5">
              {tc("actions.close")}
            </button>
            {isLive && joinUrl && (
              <button type="button" onClick={handleJoin} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90">
                {t("join.joinClass")}
              </button>
            )}
          </div>
        </>
      )}
    </CalendarModal>
  );
}
