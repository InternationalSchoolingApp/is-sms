"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useK5CalendarModel } from "@/hooks/useK5CalendarModel";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { JoinClassModal } from "@/components/dashboard/calendar/JoinClassModal";
import { LiveClassAlert } from "@/components/k5/home/LiveClassAlert";
import { picoSay, setPicoLive } from "@/components/k5/pico/picoEvents";
import { resolveTimezone } from "@/utils/calendarEvents";
import { classTitle, dayAt } from "@/utils/k5Calendar";
import { LIVE_ALERT_KEY } from "@/utils/liveAlertMemory";

const noSubscribe = () => () => {};
function readSession(key) {
  if (!key) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * The "LIVE NOW - Join class now" dialog on every page except the home page (the home planner shows it itself).
 * A student working on My Performance, Attendance... when the class starts gets the same dialog as on the home page:
 * the day's classes are read with the same calendar request (shared cache with the home page) and `now` ticks every 15
 * seconds, so the dialog opens within seconds of the start time. The student's answer is remembered per class in the
 * same place as on the home page (utils/liveAlertMemory.js): answering it on one page never asks again on another.
 * Not shown in dummy / demo mode (the dummy home plan has its own dummy classes).
 */
export function K5LiveClassWatcher() {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  if (!context?.userId || !dummy.settled || dummy.enabled || dashboardData.isLoading) return null;
  const timezone = resolveTimezone(dashboardData.userTimezone);
  return <Watcher key={timezone} timezone={timezone} />;
}

function Watcher({ timezone }) {
  const { context } = useDashboardContext();
  const model = useK5CalendarModel({ schoolUUID: context?.schoolUUID, userId: context?.userId, timezone });
  const [joiningEvent, setJoiningEvent] = useState(null);
  const firstName = String(context?.userName || "").split(" ")[0];

  const liveNow = dayAt(model.days, model.todayKey).classes.find((c) => c.k5Status === "live" && c.url);
  const alertKey = liveNow ? `${LIVE_ALERT_KEY}${context?.userId}:${liveNow.id}` : null;
  const alertSeen = useSyncExternalStore(noSubscribe, () => readSession(alertKey), () => "1");
  const [answeredAlertId, setAnsweredAlertId] = useState(null);
  const alertEvent = liveNow && !model.isLoading && !alertSeen && answeredAlertId !== liveNow.id ? liveNow : null;
  const answerAlert = () => {
    setAnsweredAlertId(liveNow?.id ?? null);
    try {
      if (alertKey) window.sessionStorage.setItem(alertKey, "1");
    } catch {
      // storage unavailable: the alert may show again on the next load
    }
  };

  // The buddy stays quiet while the dialog waits for an answer.
  const alertPending = Boolean(alertEvent);
  useEffect(() => {
    setPicoLive({ pending: alertPending });
    return () => setPicoLive({ pending: false });
  }, [alertPending]);

  return (
    <>
      <LiveClassAlert
        event={alertEvent}
        now={model.now}
        firstName={firstName}
        onJoin={(event) => {
          answerAlert();
          picoSay(`Off you go to ${classTitle(event)} class! Have fun learning${firstName ? `, ${firstName}` : ""}!`);
          setJoiningEvent(event);
        }}
        onClose={() => {
          const name = alertEvent ? classTitle(alertEvent) : "";
          answerAlert();
          picoSay(`Okay! Your ${name ? `${name} ` : ""}class is still live. You can join it from your dashboard when you are ready.`);
        }}
      />
      {joiningEvent && (
        <JoinClassModal event={joiningEvent} schoolUUID={context?.schoolUUID} courseRegistry={model.courseRegistry} onClose={() => setJoiningEvent(null)} />
      )}
    </>
  );
}
