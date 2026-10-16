"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";
import { getClassJoinDetails } from "@/services/dashboardApi";

/**
 * Join-class flow (legacy classDetailsOnModal -> getActualURL ->
 * proceedwithControll). Fetches the event's join-validation response on open
 * and, when the class is actually live ("between"), opens the real meeting
 * link in a new tab — mirroring the legacy "Almost there, please wait…"
 * loader before the redirect.
 */
export function JoinClassModal({ event, schoolUUID, onClose }) {
  const [state, setState] = useState("loading"); // loading | joined | future | past | error

  useEffect(() => {
    let cancelled = false;
    getClassJoinDetails({ schoolUUID, url: event.url }).then((details) => {
      if (cancelled) return;
      const dateStatus = details?.dateStatus;
      // Verified live: the real field is `redirectUrl` — `commonJoinUrlOfSMS`
      // exists on the response too but is empty for joinType "A" (student
      // join), only `redirectUrl` is populated. Keep the fallback in case
      // another joinType behaves differently.
      const joinUrl = details?.redirectUrl || details?.commonJoinUrlOfSMS;
      if (dateStatus === "between" && joinUrl) {
        window.open(joinUrl, "_blank", "noopener,noreferrer");
        setState("joined");
      } else if (dateStatus === "future") {
        setState("future");
      } else if (dateStatus === "past") {
        setState("past");
      } else {
        setState("error");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [schoolUUID, event.url]);

  const title = event.title || event.eventTitle || "Join class";

  return (
    <CalendarModal title={title} onClose={onClose}>
      {state === "loading" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-black">Almost there, please wait…</p>
        </div>
      )}
      {state === "joined" && <p className="text-sm text-black/70">Your class opened in a new tab.</p>}
      {state === "future" && <p className="text-sm text-black/70">This class hasn&apos;t started yet. Come back closer to the start time.</p>}
      {state === "past" && <p className="text-sm text-black/70">This class has already ended.</p>}
      {state === "error" && <p className="text-sm text-black/70">Couldn&apos;t open this class right now. Please try again shortly.</p>}
    </CalendarModal>
  );
}
