"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  Clock,
  CreditCard,
  Globe,
  Hourglass,
  Info,
  LoaderCircle,
  MapPin,
  Monitor,
  Network,
  TriangleAlert,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STATUS_SESSION_OUT } from "@/hooks/useStudentReview";
import { getSystemTimezone } from "@/utils/common";

const FALLBACK_TIME_ZONE = "Asia/Singapore";
// The backend's PaymentAttemptGate.OPEN_MINUTES: how long an open payment lasts, for the time-left bar.
const OPEN_MINUTES = 30;
const ALREADY_PAID_MESSAGE = "This fee is already paid. You don't need to pay again.";
const CANCELLED_MESSAGE = "The earlier payment was cancelled. You were not charged for it.";
const CANCEL_UNREACHABLE_MESSAGE =
  "We couldn't reach the server to cancel the earlier payment, so we haven't started a new payment. Please check your connection and try again.";

// Header badge per tone; every state also has its own icon and title, so colour is never the only signal.
const TONES = {
  amber: "bg-amber-100 text-amber-700 ring-amber-50",
  red: "bg-red-100 text-red-700 ring-red-50",
  green: "bg-emerald-100 text-emerald-700 ring-emerald-50",
  primary: "bg-primary/10 text-primary ring-primary/5",
};

function viewerTimeZone() {
  try {
    const zone = getSystemTimezone();
    if (zone) {
      new Intl.DateTimeFormat("en-GB", { timeZone: zone }); // throws on an invalid zone
      return zone;
    }
  } catch {
    // fall through to the fallback
  }
  return FALLBACK_TIME_ZONE;
}

function parseInstant(iso) {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

// "3 Nov 2026, 00:51" / "01:21" in the viewer's time zone (the API sends ISO-8601 UTC).
function formatInstant(date, options) {
  return new Intl.DateTimeFormat("en-GB", { ...options, hourCycle: "h23", timeZone: viewerTimeZone() }).format(date);
}

function expiryInfo(expiresAt, now) {
  const expires = parseInstant(expiresAt);
  if (!expires) return null;
  const minutesLeft = Math.ceil((expires.getTime() - now) / 60000);
  return {
    at: formatInstant(expires, { hour: "2-digit", minute: "2-digit" }),
    minutesLeft,
    ended: minutesLeft <= 0,
    fractionLeft: Math.min(1, Math.max(0, minutesLeft / OPEN_MINUTES)),
  };
}

function continueHref(attempt) {
  if (!attempt?.canContinue || typeof attempt.continueUrl !== "string") return null;
  return /^https?:\/\//i.test(attempt.continueUrl) ? attempt.continueUrl : null;
}

function Callout({ tone, Icon, title, children }) {
  const styles =
    tone === "warning"
      ? { box: "border-orange-200 bg-orange-50 text-orange-950", icon: "text-orange-700" }
      : { box: "border-sky-200 bg-sky-50 text-sky-950", icon: "text-sky-700" };
  return (
    <div className={`flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${styles.box}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${styles.icon}`} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? "mt-0.5" : ""}>{children}</p>
      </div>
    </div>
  );
}

/**
 * "A payment is already in progress" — shown when common/invoke-payment-gateway answers PAYMENT_IN_PROGRESS
 * (another device or tab has an open Stripe/Airwallex payment for one of this user's fees, possibly another
 * fee after a plan change) or ALREADY_PAID. Mount it with a fresh `key` per response.
 *
 * request: { attempt, autoCancel } with invoke-payment-gateway's `details` (attemptRef, paymentName, sameFee, replaced,
 *          sameBrowser, sameDevice, gateway,
 *          gatewayLabel, startedAt, expiresAt, device, browser, ipAddress, location, canContinue, continueUrl),
 *          or { alreadyPaidMessage } for ALREADY_PAID; plus `openedAt` (ms) for the expiry countdown.
 * onCancelAttempt(attemptRef) -> payment-attempt-cancel response (CANCELLED / ALREADY_PAID / CANCEL_FAILED).
 * onCancelled() re-runs the normal launch; onPaid() continues the app's paid-fee path.
 */
export function PaymentInProgressModal({ request, onClose, onCancelAttempt, onCancelled, onPaid, onSessionExpired }) {
  const attempt = request.attempt;
  // details -> confirm -> cancelling -> cancelled | paid | failed. autoCancel (the browser that started it is
  // back) goes straight to cancelling.
  const [view, setView] = useState(request.alreadyPaidMessage ? "paid" : request.autoCancel ? "cancelling" : "details");
  const autoCancelStarted = useRef(false);
  const [message, setMessage] = useState(request.alreadyPaidMessage || "");
  const [now, setNow] = useState(request.openedAt);

  useEffect(() => {
    if (!attempt?.expiresAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [attempt?.expiresAt]);

  const gatewayName = attempt?.gateway || "the payment gateway";
  const deviceName = attempt?.device || "another device";
  const continueUrl = continueHref(attempt);
  const started = parseInstant(attempt?.startedAt);
  const startedText = started
    ? formatInstant(started, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
  const payingWith = attempt?.gatewayLabel || attempt?.gateway;
  const deviceFacts = [
    { label: "Device", value: attempt?.device, Icon: Monitor },
    { label: "Browser", value: attempt?.browser, Icon: Globe },
    { label: "IP address", value: attempt?.ipAddress, Icon: Network },
    { label: "Location", value: attempt?.location, Icon: MapPin },
  ].filter(({ value }) => value);
  const expiry = expiryInfo(attempt?.expiresAt, now);
  // While the cancel call or the follow-up launch is running, the modal can't be dismissed.
  const locked = view === "cancelling" || view === "cancelled";

  async function cancelAttempt() {
    setView("cancelling");
    let response = null;
    try {
      response = await onCancelAttempt(attempt.attemptRef);
    } catch (err) {
      console.error("payment-attempt-cancel failed:", err);
    }
    if (response?.status === STATUS_SESSION_OUT) {
      onSessionExpired?.();
      return;
    }
    const statusCode = String(response?.statusCode ?? "").toUpperCase();
    if (statusCode === "CANCELLED") {
      setMessage(response.message || CANCELLED_MESSAGE);
      setView("cancelled");
      onCancelled();
      return;
    }
    if (statusCode === "ALREADY_PAID") {
      setMessage(response.message || ALREADY_PAID_MESSAGE);
      setView("paid");
      return;
    }
    // CANCEL_FAILED (the gateway didn't respond), or no usable reply at all.
    setMessage(
      response?.message ||
        (response
          ? `We couldn't cancel the earlier payment because ${gatewayName} didn't respond, so we haven't started a new payment. Please try again in a minute.`
          : CANCEL_UNREACHABLE_MESSAGE)
    );
    setView("failed");
  }

  const header = {
    details: {
      tone: "amber",
      Icon: Hourglass,
      title: "A payment is already in progress",
      description: `Closed that payment page, or switched to this device? ${
        continueUrl ? "Continue it here, or start again here." : "Start again here."
      } If someone else is paying on another device, let them finish.`,
    },
    confirm: {
      tone: "red",
      Icon: TriangleAlert,
      title: "Start again here?",
      description: `The payment page opened on ${deviceName} will stop working, and a new payment will start here. A cancelled payment is never charged.`,
    },
    cancelling: {
      tone: "primary",
      Icon: LoaderCircle,
      spin: true,
      title: `Cancelling the payment with ${gatewayName}…`,
      description: "Please keep this page open.",
    },
    cancelled: { tone: "green", Icon: CircleCheck, title: "Earlier payment cancelled", description: message },
    paid: {
      tone: "green",
      Icon: CircleCheck,
      title: attempt?.sameFee === false ? "That payment went through" : "This fee is already paid",
      description: message,
    },
    failed: { tone: "red", Icon: CircleAlert, title: "We couldn't cancel the earlier payment", description: message },
  }[view];

  // What the payment in progress is: shown on the details step, and in short on the confirm step.
  const paymentSummary = (attempt?.paymentName || payingWith || startedText) && (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
      {attempt?.paymentName && <p className="text-[15px] leading-snug font-semibold text-slate-900">{attempt.paymentName}</p>}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-700">
        {payingWith && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 font-medium text-slate-800">
            <CreditCard className="size-3.5 text-slate-600" aria-hidden="true" />
            {payingWith}
          </span>
        )}
        {startedText && (
          <span>
            Started {startedText} <span className="text-slate-600">(your time)</span>
          </span>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    if (request.autoCancel && !autoCancelStarted.current) {
      autoCancelStarted.current = true;
      cancelAttempt();
    }
  });

  // Same device and network as the earlier payment: no second "are you sure".
  const startAgain = () => (attempt?.sameDevice ? cancelAttempt() : setView("confirm"));

  let body = null;
  if (view === "cancelled") {
    body = (
      <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700">
        <LoaderCircle className="size-4 text-primary motion-safe:animate-spin" aria-hidden="true" />
        Starting your new payment now…
      </p>
    );
  } else if (view === "paid") {
    body = (
      <Button type="button" onClick={onPaid} className="h-11 w-full text-[15px] font-semibold hover:bg-primary/90">
        Continue
      </Button>
    );
  } else if (view === "failed") {
    body = (
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={cancelAttempt} className="h-11 w-full text-[15px] font-semibold hover:bg-primary/90">
          Try again
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="h-10 w-full font-medium text-slate-700">
          Back
        </Button>
      </div>
    );
  } else if (view === "confirm") {
    body = (
      <div className="space-y-4">
        {paymentSummary && <div className="overflow-hidden rounded-xl border border-slate-200">{paymentSummary}</div>}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={cancelAttempt}
            className="h-11 w-full bg-red-600 text-[15px] font-semibold text-white hover:bg-red-700"
          >
            Yes, start again
          </Button>
          {/* The safe choice gets the focus in a destructive confirmation. */}
          <Button
            type="button"
            variant="outline"
            autoFocus
            onClick={() => setView("details")}
            className="h-11 w-full text-[15px] font-semibold text-slate-800"
          >
            Keep it
          </Button>
        </div>
      </div>
    );
  } else if (view === "details") {
    body = (
      <div className="space-y-3">
        <section aria-label="The payment in progress" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {paymentSummary}
          {deviceFacts.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-3 px-4 py-3.5 sm:gap-x-4">
              {deviceFacts.map(({ label, value, Icon }) => (
                <div key={label} className="flex min-w-0 gap-2.5">
                  {/* Icons only from sm up: on a phone the two columns need the room (an IP must not wrap). */}
                  <Icon className="mt-0.5 hidden size-4 shrink-0 text-slate-500 sm:block" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-600">{label}</dt>
                    <dd className="text-[13px] font-medium break-words text-slate-900 tabular-nums sm:text-sm">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </section>

        {!continueUrl && attempt?.replaced && (
          <Callout tone="warning" Icon={TriangleAlert} title="This payment plan has been changed">
            This payment is for a plan that has since been changed, so it can&apos;t be finished. Start again here to pay.
          </Callout>
        )}
        {!continueUrl && !attempt?.replaced && attempt?.gateway === "Airwallex" && (
          <Callout tone="info" Icon={Info}>
            Airwallex payments can only be finished on the device where they were started.
          </Callout>
        )}

        {expiry && (
          <div className={`rounded-lg border px-3.5 py-3 ${expiry.ended ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex gap-2.5">
              <Clock className={`mt-0.5 size-4 shrink-0 ${expiry.ended ? "text-red-700" : "text-amber-700"}`} aria-hidden="true" />
              <p className={`text-sm ${expiry.ended ? "text-red-950" : "text-amber-950"}`}>
                {expiry.ended ? (
                  <>
                    Its time limit ended at <strong>{expiry.at}</strong>. Choose &ldquo;Start again here&rdquo; to start a new payment.
                  </>
                ) : (
                  <>
                    If it isn&apos;t finished, it will be cancelled automatically at <strong>{expiry.at}</strong> (in {expiry.minutesLeft} min).
                    After that you can pay from any device.
                  </>
                )}
              </p>
            </div>
            {!expiry.ended && (
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-amber-200/80" aria-hidden="true">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${expiry.fractionLeft * 100}%` }} />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          {continueUrl && (
            <Button
              type="button"
              onClick={() => window.location.assign(continueUrl)}
              className="h-11 w-full text-[15px] font-semibold hover:bg-primary/90"
            >
              Continue that payment here
            </Button>
          )}
          <Button
            type="button"
            variant={continueUrl ? "outline" : "default"}
            onClick={startAgain}
            className={`h-11 w-full text-[15px] font-semibold ${
              continueUrl ? "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" : "hover:bg-primary/90"
            }`}
          >
            Start again here
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} className="h-10 w-full font-medium text-slate-700">
            Back
          </Button>
        </div>
      </div>
    );
  }

  const HeaderIcon = header.Icon;
  return (
    <Dialog open onOpenChange={(open) => !open && !locked && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl p-0 shadow-2xl sm:max-w-md"
      >
        {/* aria-live: the title and text change as the cancel runs (cancelling -> cancelled / failed). */}
        <DialogHeader className={`items-center gap-0 px-6 pt-7 text-center ${body ? "pb-5" : "pb-7"}`} aria-live="polite">
          <span className={`flex size-14 items-center justify-center rounded-full ring-8 ${TONES[header.tone]}`} aria-hidden="true">
            <HeaderIcon className={`size-7 ${header.spin ? "motion-safe:animate-spin" : ""}`} />
          </span>
          <DialogTitle className="mt-4 text-lg leading-snug font-bold text-slate-900">{header.title}</DialogTitle>
          {header.description && (
            <DialogDescription className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600">{header.description}</DialogDescription>
          )}
        </DialogHeader>
        {body && <div className="px-6 pb-6">{body}</div>}
      </DialogContent>
    </Dialog>
  );
}
