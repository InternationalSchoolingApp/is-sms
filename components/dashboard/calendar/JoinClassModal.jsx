"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Copy, Loader2 } from "lucide-react";
import { CalendarModal, DetailRow } from "@/components/dashboard/calendar/CalendarModal";
import { getClassJoinDetails } from "@/services/dashboardApi";

function statusLabel(dateStatus) {
  if (dateStatus === "between") return "Live Now";
  if (dateStatus === "future") return "Upcoming";
  if (dateStatus === "past") return "Ended";
  return "Unavailable";
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
  const [copied, setCopied] = useState(false);
  const linkRef = useRef(null);

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
        setLoadFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [schoolUUID, event.url]);

  const title = event.title || event.eventTitle || details?.className || "Join class";
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
          <p className="text-sm font-semibold text-black">Almost there, please wait…</p>
        </div>
      )}

      {loadFailed && <p className="text-sm text-black/70">Couldn&apos;t open this class right now. Please try again shortly.</p>}

      {details && (
        <>
          <DetailRow label="Course" value={course} />
          <DetailRow label="Date" value={details.classDate ? format(new Date(details.classDate), "MMM d, yyyy") : event.displayTime} />
          <DetailRow label="Time" value={event.displayTime} />
          <DetailRow label="Teacher" value={event.origName} />
          <DetailRow label="Status" value={statusLabel(details.dateStatus)} />

          {joinUrl && (
            <>
              <p className="mt-3 text-center text-xs text-black/60">
                If you are facing issues with joining, copy the class link below and paste it into a new tab on your browser:
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
                {copied ? "Copied!" : "Copy Class Link"}
              </button>
            </>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-black hover:bg-black/5">
              Close
            </button>
            {isLive && joinUrl && (
              <button type="button" onClick={handleJoin} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90">
                Join Class
              </button>
            )}
          </div>
        </>
      )}
    </CalendarModal>
  );
}
