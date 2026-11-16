"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Copy, Eye, EyeOff, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useClassLive } from "@/hooks/useClassLive";
import { activateOutlook, isOutlookActivated, loadOutlookReminder } from "@/services/outlookReminderApi";
import { callServer } from "@/utils/serverCall";

/**
 * "Activate your school email" reminder on the dashboard (legacy studentDashboardContent.js renderOutlookModalOnDashboard,
 * outlookUserCreatedModal): for a student who skipped the school e-mail (Outlook) setup. It
 *   - asks the backend first and never opens when the setup is done or the password is already set,
 *   - waits for the contact check, a live class and any other open popup, and opens once per page load,
 *   - "Do It Later" hides it for 5 minutes (it comes back after that),
 *   - while open, checks every 30 s whether the student has activated it elsewhere and closes itself,
 *   - "Activate" creates the account when needed (showing the new email / temporary password), else marks the
 *     credentials seen, then opens Outlook in a new tab.
 * Not in dummy mode.
 */
const SNOOZE_MS = 5 * 60 * 1000;
const ACTIVE_CHECK_MS = 30 * 1000;
const OTHER_POPUPS = '[data-blocking-popup], [data-slot="dialog-content"], dialog[open]';
const OUTLOOK_URL = "https://outlook.office.com";
const WHATSAPP_URL = "https://wa.me/15854990662";

const BTN = "min-h-11 cursor-pointer rounded-xl border px-5 text-base font-semibold disabled:cursor-default disabled:opacity-60";

function Credential({ label, value, secret = false }) {
  const [shown, setShown] = useState(!secret);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy. Please copy it by hand.");
    }
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-left">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-black/60">{label}</div>
        <div className={`break-all ${secret ? "font-mono" : "font-semibold"}`}>{value ? (shown ? value : "•".repeat(15)) : "—"}</div>
      </div>
      {value && secret && (
        <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} className="cursor-pointer border-none bg-transparent p-2 text-primary">
          {shown ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
        </button>
      )}
      {value && (
        <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="cursor-pointer border-none bg-transparent p-2 text-primary">
          <Copy className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

/** `hold`: the contact check goes first. */
export function OutlookReminder({ hold = false }) {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const classLive = useClassLive();
  const userId = context?.userId;
  const isStudent = String(context?.role).toLowerCase() === "student";

  const reminder = useQuery({
    queryKey: ["outlook-reminder", userId],
    queryFn: () => callServer(loadOutlookReminder),
    enabled: Boolean(userId && isStudent && dummy.settled && !dummy.enabled),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const pending = reminder.data?.pending === true;

  const [open, setOpen] = useState(false);
  const [shownOnce, setShownOnce] = useState(false);
  const [done, setDone] = useState(false);
  const [snoozeUntil, setSnoozeUntil] = useState(0);
  const [creds, setCreds] = useState(null);
  const [busy, setBusy] = useState(false);

  // Open once, when nothing else is in the way.
  const waiting = pending && !done && !hold && classLive.known && !open && !shownOnce;
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(() => {
      const live = classLive.live ?? Boolean(document.querySelector(".calendar-live-dashed"));
      if (live || document.querySelector(OTHER_POPUPS) || Date.now() < snoozeUntil) return;
      clearInterval(timer);
      setShownOnce(true);
      setOpen(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [waiting, classLive.live, snoozeUntil]);

  // "Do It Later": back after the snooze.
  useEffect(() => {
    if (open || !shownOnce || done || snoozeUntil <= Date.now()) return undefined;
    const timer = setTimeout(() => setShownOnce(false), snoozeUntil - Date.now());
    return () => clearTimeout(timer);
  }, [open, shownOnce, done, snoozeUntil]);

  // While open: stop once the password has been set (activated in another tab).
  useEffect(() => {
    if (!open) return undefined;
    const timer = setInterval(async () => {
      const answer = await isOutlookActivated();
      if (answer?.data?.activated) {
        setDone(true);
        setOpen(false);
      }
    }, ACTIVE_CHECK_MS);
    return () => clearInterval(timer);
  }, [open]);

  if (!pending || done) return null;

  const email = creds?.email || reminder.data.email;
  const password = creds?.password || reminder.data.password;
  const needsCreation = reminder.data.needsAzureCreation && !creds?.created;

  const activate = async () => {
    setBusy(true);
    try {
      const result = await callServer(() => activateOutlook({ needsAzureCreation: needsCreation }));
      if (result.created) {
        setCreds({ email: result.email, password: result.password, created: true });
      }
      setTimeout(() => window.open(OUTLOOK_URL, "_blank", "noopener,noreferrer"), 1200);
    } catch (error) {
      toast.error(String(error?.message || "").replace(/^[A-Z0-9_]+:\s*/, "") || "Unable to proceed");
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    setSnoozeUntil(Date.now() + SNOOZE_MS);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && later()}>
      <DialogContent showCloseButton={false} className="gap-3 text-center sm:max-w-md">
        <span aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-8 w-8" />
        </span>
        <DialogTitle className="m-0 text-2xl font-bold">Activate your school email</DialogTitle>
        <DialogDescription className="m-0 text-black/70">
          This is your official school email on Outlook. We will send class schedules, payment updates and announcements to this email. Log in and
          activate it immediately.
        </DialogDescription>
        <div className="divide-y rounded-xl border">
          <div className="px-3 py-2 text-left">
            <div className="font-bold">{context?.userName}</div>
            <div className="break-all">School Email: {email || "—"}</div>
          </div>
          <Credential label="Temporary Password" value={password} secret />
        </div>
        <p className="m-0 text-black/60">Log in once with these details, then choose your own password.</p>
        <button type="button" onClick={activate} disabled={busy} className={`${BTN} border-primary bg-primary text-white`}>
          {busy ? "Please wait…" : "Activate your school email"}
        </button>
        <button type="button" onClick={later} disabled={busy} className={`${BTN} border-primary bg-white text-primary`}>
          Do It Later
        </button>
        <p className="m-0 border-t pt-3 text-black/60">
          Need help?{" "}
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-bold text-primary">
            WhatsApp us
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
