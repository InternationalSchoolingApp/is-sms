"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CalendarModal, DetailRow } from "@/components/dashboard/calendar/CalendarModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { getActivityDetails, getClassJoinDetails } from "@/services/dashboardApi";
import { getBrowserTimezone, resolveTimezone } from "@/utils/calendarEvents";

const pad = (value) => String(value).padStart(2, "0");

/** Days / hours / minutes / seconds left (legacy "Time Remaining" boxes). */
function Countdown({ ms }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const parts = [
    [Math.floor(total / 86400), "Days"],
    [Math.floor((total % 86400) / 3600), "Hours"],
    [Math.floor((total % 3600) / 60), "Minutes"],
    [total % 60, "Seconds"],
  ];
  return (
    <div className="my-3 text-center">
      <p className="mb-1 text-black/60">Time Remaining</p>
      <div className="flex justify-center gap-2" role="timer">
        {parts.map(([value, label]) => (
          <div key={label} className="min-w-14 rounded-lg bg-slate-100 px-2 py-1.5">
            <div className="text-xl font-bold tabular-nums">{pad(value)}</div>
            <div className="text-[11px] text-black/50">{label}</div>
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
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const timezone = dummy.enabled ? getBrowserTimezone() : resolveTimezone(dashboardData.userTimezone);
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
      setJoinMessage("This could not be opened just now. Please try again in a minute.");
    } else if (["0", "2", "3"].includes(String(answer.status))) {
      setJoinMessage(answer.message || "You cannot join this event right now.");
    } else if (answer.redirectUrl) {
      window.open(answer.redirectUrl, "_blank", "noopener,noreferrer");
    }
  };

  const title = details?.categoryName || event.title || event.eventTitle || "Activity details";
  return (
    <CalendarModal title={title} onClose={onClose}>
      {over && <p className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-black/70">Your activity has been completed.</p>}
      {details?.activityPurpose && <p className="font-semibold">{details.activityPurpose}</p>}
      <DetailRow label="Date" value={start ? format(start, "MMM d, yyyy") : null} />
      <DetailRow label="Time" value={event.displayTime} />
      <DetailRow label="Details" value={details?.activityTitle || event.title} />
      <DetailRow label="Teacher" value={event.origName} />
      {query.isLoading && <p className="py-2 text-center text-black/50">Loading details…</p>}
      {details && !over && <Countdown ms={untilStart} />}
      {details?.joiningLink && !over && !joinOpen && (
        <p className="text-center text-xs text-black/60">Your joining link will be displayed {leadMinutes} minutes before the scheduled time.</p>
      )}
      {joinMessage && (
        <p role="alert" className="text-center font-semibold text-red-600">
          {joinMessage}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {attachment && (
          <a href={attachment} target="_blank" rel="noreferrer" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white no-underline">
            View Attachment
          </a>
        )}
        {joinOpen && (
          <button type="button" onClick={join} disabled={joining} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {joining ? "Opening…" : "Join Event"}
          </button>
        )}
        <button type="button" onClick={onClose} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-black">
          Close
        </button>
      </div>
    </CalendarModal>
  );
}
