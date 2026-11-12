"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Bell, BookOpen, CalendarDays, Clock, MessagesSquare, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/constant/appLinks";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useParentAppInstallEligible } from "@/hooks/parent/useParentProfile";

/**
 * The "get the app" prompt (legacy appInstallNotification.js + appInstallNotificationContent.js), for the parent.
 *
 * Opens by itself (once per visit) only when ALL of these hold, as legacy initAppInstallNotification:
 *   - the school is the one the app is published for (school id 1);
 *   - the page is not already running as an installed app (display-mode: standalone);
 *   - the parent did not close it in the last 7 days (localStorage, per parent; closing starts the 7 days);
 *   - the backend says the app is not in use (app-last-activity: showInstallModal / appUsed === false).
 * Opened that way its close buttons stay disabled for 10 seconds (legacy countdown). `open` (a button on the page, the
 * legacy "Get App") opens it any time, closable at once. Store links open the stores in a new tab; phones show the
 * badge for their store, computers show both with QR codes. Nothing about the parent is sent anywhere.
 */

const APP_SCHOOL_ID = "1";
const DISMISS_DAYS = 7;
const COUNTDOWN_SECONDS = 10;
const FEATURES = [
  [Bell, "All notifications in one place: school announcements, class cancellations, class reschedules and every other update."],
  [Clock, "Class reminders: get notified before your class starts so you join on time."],
  [CalendarDays, "Class calendar: see all your upcoming and live classes at a glance."],
  [BookOpen, "Diary: view notes and homework shared by your teachers."],
  [MessagesSquare, "Chat: message students, teachers and admins directly in the app."],
];
const STEPS = ["Open the camera app on your mobile phone.", "Scan the QR code displayed on your computer.", "Open the link on your mobile device.", "Install the app using the appropriate Android or iOS instructions."];

const noopSubscribe = () => () => {};
const dismissKey = (userId) => `appInstallNotifDismissUntil_${userId || "anonymous"}`;

function isDismissed(userId) {
  try {
    return Number(window.localStorage.getItem(dismissKey(userId))) > Date.now();
  } catch {
    return false;
  }
}
function dismiss(userId) {
  try {
    window.localStorage.setItem(dismissKey(userId), String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    // storage unavailable: it simply opens again next visit
  }
}
function isInstalledApp() {
  try {
    return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);
  } catch {
    return false;
  }
}
/** "ios" | "android" | "desktop" (legacy detectAppInstallDevice; an iPad that poses as a Mac counts as iOS). */
function detectDevice() {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const STORES = [
  { key: "android", name: "Google Play", url: PLAY_STORE_URL, small: "Get it on", look: "bg-[#1F7A3A]" },
  { key: "ios", name: "App Store", url: APP_STORE_URL, small: "Download on the", look: "bg-black" },
];

function StoreLink({ store }) {
  return (
    <a href={store.url} target="_blank" rel="noopener noreferrer" className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 text-white no-underline ${store.look}`}>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] opacity-90">{store.small}</span>
        <span className="text-base font-semibold">{store.name}</span>
      </span>
    </a>
  );
}

export function ParentAppInstallPrompt({ open: manualOpen, onClose: onManualClose }) {
  const { context } = useDashboardContext();
  const userId = context?.userId;
  const [autoOpen, setAutoOpen] = useState(false);
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const tried = useRef(false);

  // Page-side gates and the device, read in the browser only (null / false while rendering on the server).
  const schoolNumericId = context?.schoolNumericId;
  const device = useSyncExternalStore(noopSubscribe, detectDevice, () => null);
  const gatesOk = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(userId) && String(schoolNumericId) === APP_SCHOOL_ID && !isInstalledApp() && !isDismissed(userId),
    () => false,
  );

  const eligible = useParentAppInstallEligible(gatesOk);
  useEffect(() => {
    if (eligible && gatesOk && !tried.current) {
      tried.current = true;
      setAutoOpen(true);
    }
  }, [eligible, gatesOk]);

  const open = autoOpen || Boolean(manualOpen);
  const counting = autoOpen && !manualOpen && seconds > 0;
  useEffect(() => {
    if (!autoOpen || manualOpen || seconds <= 0) return undefined;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [autoOpen, manualOpen, seconds]);

  const close = () => {
    if (counting) return;
    if (autoOpen) {
      dismiss(userId);
      setAutoOpen(false);
    }
    onManualClose?.();
  };

  if (!open) return null;
  const stores = device === "ios" ? STORES.filter((s) => s.key === "ios") : device === "android" ? STORES.filter((s) => s.key === "android") : STORES;
  const closeLabel = counting ? `Close (${seconds}s)` : "Close";

  return (
    <Dialog open onOpenChange={(next) => !next && close()}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto sm:max-w-[640px]">
        <button type="button" onClick={close} disabled={counting} aria-label={closeLabel} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="space-y-1 pr-10">
          <DialogTitle className="text-xl font-semibold">Stay connected with our app!</DialogTitle>
          <DialogDescription>Everything you need for school, right on your phone.</DialogDescription>
        </div>
        <ul className="space-y-2" aria-label="What you get">
          {FEATURES.map(([Icon, text]) => (
            <li key={text} className="flex items-start gap-2 text-sm text-black/80">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        {device === "desktop" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {stores.map((store) => (
                <div key={store.key} className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-3">
                  <QRCodeSVG value={store.url} size={112} level="M" bgColor="#FFFFFF" fgColor="#1C2640" marginSize={0} role="img" title={`QR code for ${store.name}`} />
                  <StoreLink store={store} />
                </div>
              ))}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-black">Easy Installation Guide</h3>
              <ol className="space-y-1.5">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex items-start gap-2 text-sm text-black/80">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <div className="grid gap-3">
            {stores.map((store) => (
              <StoreLink key={store.key} store={store} />
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={close} disabled={counting} className="min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-black hover:bg-slate-50 disabled:opacity-50">
            {counting ? closeLabel : autoOpen ? "Maybe Later" : "Close"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
