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
 * proceedwithControll -> calendarMeetingLinkValidateStudent). Auto-opens the
 * meeting in the tab the caller already opened on click (see `popup` doc
 * below) once we know it's live, while this modal stays open as a
 * Course/Date/Time/Teacher/Status reference with a copyable link and a
 * manual "Join Class" fallback button.
 */
export function JoinClassModal({ event, schoolUUID, courseRegistry, popup, onClose }) {
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
        // `popup` is the blank tab opened synchronously in the click handler
        // (see CalendarCard's handleSelectEvent) — navigating it now still
        // counts as part of that original gesture, so it isn't blocked the
        // way a fresh window.open() after this async fetch would be.
        if (data.dateStatus === "between" && url && popup && !popup.closed) {
          popup.location.href = url;
        } else if (popup && !popup.closed) {
          popup.close();
        }
      } else {
        setLoadFailed(true);
        if (popup && !popup.closed) popup.close();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [schoolUUID, event.url, popup]);

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

  // Manual fallback (e.g. the auto-opened tab was itself blocked, or the
  // user closed it) — a fresh window.open here IS a direct result of this
  // click, so it isn't blocked.
  const handleJoin = () => {
    if (joinUrl) window.open(joinUrl, "_blank", "noopener,noreferrer");
  };

  // If the user dismisses this modal before the fetch resolves (or it never
  // turned out to be live), don't leave the pre-opened blank tab hanging.
  const handleClose = () => {
    if (!isLive && popup && !popup.closed) popup.close();
    onClose();
  };

  return (
    <CalendarModal title={title} onClose={handleClose}>
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
            <button type="button" onClick={handleClose} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-black hover:bg-black/5">
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
