"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppDownloadDialog } from "@/components/k5/AppDownloadDialog";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useClassLive } from "@/hooks/useClassLive";
import { getAppInstallPromptEligible } from "@/services/dashboardApi";

/**
 * "Install the app" popup (legacy appInstallNotification.js initAppInstallNotification), student role:
 *   - only school 1 (the one school whose app is published), not inside an installed app / PWA window,
 *   - the server says this student has not used the app (app-last-activity),
 *   - not within 7 days of the last close (localStorage, per user),
 *   - never over a live class or another open popup (waits for them),
 *   - the close controls unlock after a 10 s countdown.
 * Closing it hides it for 7 days; the "Get the App" header button stays available any time.
 */
const DISMISS_DAYS = 7;
const COUNTDOWN_SECONDS = 10;
const SCHOOL_ID = 1;

const storageKey = (userId) => `appInstallNotifDismissUntil_${userId || "anonymous"}`;

function dismissedUntilNow(userId) {
  try {
    return Number.parseInt(window.localStorage.getItem(storageKey(userId)) || "", 10) > Date.now();
  } catch {
    return false;
  }
}

function rememberDismissed(userId) {
  try {
    window.localStorage.setItem(storageKey(userId), String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    // Storage blocked: the popup simply comes back on the next page load.
  }
}

function runsAsInstalledApp() {
  try {
    return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
  } catch {
    return false;
  }
}

const subscribeNothing = () => () => {};

/** `hold`: something else (the contact check) goes first. */
export function AppInstallPrompt({ hold = false }) {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const classLive = useClassLive();
  const userId = context?.userId;
  const isStudent = String(context?.role).toLowerCase() === "student";
  const candidate = Boolean(
    userId && isStudent && Number(context?.schoolNumericId) === SCHOOL_ID && context?.uniqueId && dummy.settled && !dummy.enabled,
  );
  // Browser-only gates, read after mount (never on the server render).
  const browserOk = useSyncExternalStore(
    subscribeNothing,
    () => !runsAsInstalledApp() && !dismissedUntilNow(userId),
    () => false,
  );

  const eligible = useQuery({
    queryKey: ["app-install-eligible", userId],
    queryFn: () => getAppInstallPromptEligible({ uniqueId: context.uniqueId }),
    enabled: candidate && browserOk,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const [open, setOpen] = useState(false);
  const [settled, setSettled] = useState(false);
  const ready = eligible.data === true && !hold && classLive.known && !settled;
  useEffect(() => {
    if (!ready) return undefined;
    // Legacy: a live class (or any other popup) suppresses it; wait for the page to be free.
    const timer = setInterval(() => {
      const live = classLive.live ?? Boolean(document.querySelector(".calendar-live-dashed"));
      if (live || document.querySelector('[role="dialog"]')) return;
      clearInterval(timer);
      setSettled(true);
      setOpen(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [ready, classLive.live]);

  if (!open) return null;
  return (
    <AppDownloadDialog
      open
      lockSeconds={COUNTDOWN_SECONDS}
      schoolName={context?.schoolName}
      onClose={() => {
        rememberDismissed(userId);
        setOpen(false);
      }}
    />
  );
}
