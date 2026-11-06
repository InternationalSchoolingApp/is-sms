"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, CreditCard, Info, LoaderCircle, RefreshCw, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STATUS_SESSION_OUT } from "@/hooks/useStudentReview";
import { getSystemTimezone } from "@/utils/common";

const FALLBACK_TIME_ZONE = "Asia/Singapore";
const ALREADY_PAID_MESSAGE = "This fee is already paid. You don't need to pay again.";
const CANCEL_UNREACHABLE_MESSAGE =
  "We couldn't reach the server, so the old payment is still open and we haven't started a new one. Please check your internet connection and try again.";

// Round icon above the title, per tone. Every state also has its own icon and title, so colour is never the only signal.
const TONES = {
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  green: "bg-emerald-100 text-emerald-700",
  primary: "bg-[var(--plc)] text-primary",
};

// The school's primary colour, darkened so text on the light primary tint stays readable.
const PRIMARY_TEXT = "text-[color-mix(in_oklab,var(--pc),black_25%)]";

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

// "1:21 PM" in the viewer's time zone (the API sends ISO-8601 UTC). A no-break space keeps "PM" with the time.
function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: viewerTimeZone() })
    .format(date)
    .replace(/\s(?=[AP]M$)/i, " ");
}

// "3 Nov 2026" in the viewer's time zone.
function formatDay(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: viewerTimeZone() }).format(date);
}

// "a Mac (Chrome)" / "an iPhone (Safari)"; "" when the device is unknown.
function devicePhrase(attempt) {
  const device = (attempt?.device || "").trim();
  if (!device) return "";
  const browserName = (attempt?.browser || "").trim().split(" ")[0];
  return `${/^[aeiou]/i.test(device) ? "an" : "a"} ${device}${browserName ? ` (${browserName})` : ""}`;
}

// "Started at 1:21 PM on a Mac (Chrome)", or "Started on 3 Nov 2026 at 1:21 PM …" for an earlier day.
function startedLine(attempt, now) {
  const started = parseInstant(attempt?.startedAt);
  const device = devicePhrase(attempt);
  let line = "";
  if (started) {
    line = formatDay(started) === formatDay(new Date(now))
      ? `Started at ${formatTime(started)}`
      : `Started on ${formatDay(started)} at ${formatTime(started)}`;
  }
  if (device) line += line ? ` on ${device}` : `Started on ${device}`;
  return line;
}

function expiryLine(expiresAt, now) {
  const expires = parseInstant(expiresAt);
  if (!expires) return "";
  const minutesLeft = Math.ceil((expires.getTime() - now) / 60000);
  if (minutesLeft <= 0) {
    return "It has reached its time limit and will close by itself in a moment. Then you can pay from any device.";
  }
  return `If it isn't finished, it closes by itself at ${formatTime(expires)} (in ${minutesLeft} min).`;
}

function continueHref(attempt) {
  if (!attempt?.canContinue || typeof attempt.continueUrl !== "string") return null;
  return /^https?:\/\//i.test(attempt.continueUrl) ? attempt.continueUrl : null;
}

// One choice on the details step: a card with an icon, a title, a line of text and its button.
function Option({ id, highlighted, Icon, title, text, children }) {
  return (
    <section
      aria-labelledby={id}
      className={`rounded-2xl border px-4 pt-3.5 pb-4 text-left ${
        highlighted
          ? "border-[color-mix(in_oklab,var(--pc)_45%,white)] bg-[var(--plc)]"
          : "border-slate-300 bg-white"
      }`}
    >
      <h3 id={id} className={`flex items-center gap-2.5 text-base font-semibold ${highlighted ? PRIMARY_TEXT : "text-slate-900"}`}>
        <Icon className="size-[18px] shrink-0" aria-hidden="true" />
        {title}
      </h3>
      <p className="mt-1 mb-3 text-sm leading-relaxed text-slate-600">{text}</p>
      {children}
    </section>
  );
}

/**
 * "You already started this payment" — shown when common/invoke-payment-gateway answers PAYMENT_IN_PROGRESS
 * (another device or tab has an open Stripe/Airwallex payment for one of this user's fees, possibly another
 * fee after a plan change) or ALREADY_PAID. Mount it with a fresh `key` per response. Same design and wording
 * as the dashboard pop-up (is-rest-api commonPaymentGateway.js).
 *
 * request: { attempt, autoCancel } with invoke-payment-gateway's `details` (attemptRef, paymentName, sameFee, replaced,
 *          sameBrowser, sameDevice, gateway, gatewayLabel, startedAt, expiresAt, device, browser, canContinue,
 *          continueUrl), or { alreadyPaidMessage } for ALREADY_PAID; plus `openedAt` (ms) for the expiry countdown.
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
  const device = devicePhrase(attempt);
  const continueUrl = continueHref(attempt);
  // sameFee false: the open payment is for another of the user's fees (one payment at a time per user).
  const otherFee = attempt?.sameFee === false;
  const started = startedLine(attempt, now);
  const expiry = expiryLine(attempt?.expiresAt, now);
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
          ? `${gatewayName} didn't respond, so we haven't started a new payment. Starting one now could charge you twice. Please try again in a minute.`
          : CANCEL_UNREACHABLE_MESSAGE)
    );
    setView("failed");
  }

  const header = {
    details: {
      tone: "amber",
      Icon: CreditCard,
      title: otherFee ? "You already started another payment" : "You already started this payment",
      description: otherFee
        ? "Only one payment can be open at a time, and this one is still open on another page or device. What would you like to do?"
        : "It is still open on another page or device. What would you like to do?",
    },
    confirm: {
      tone: "amber",
      Icon: RefreshCw,
      title: "Start a new payment?",
      description: `The payment page opened ${device ? `on ${device}` : "earlier"} will stop working, and a new payment will start here. You are never charged for a payment that is closed.`,
    },
    cancelling: {
      tone: "primary",
      Icon: LoaderCircle,
      spin: true,
      title: "Closing the old payment…",
      description: `Checking with ${gatewayName}. Please don't close this page.`,
    },
    cancelled: { tone: "green", Icon: CircleCheck, title: "The old payment is closed", description: "You were not charged for it." },
    paid: {
      tone: "green",
      Icon: CircleCheck,
      title: otherFee ? "That payment went through" : "This fee is already paid",
      description: message,
    },
    failed: { tone: "red", Icon: CircleAlert, title: "We couldn't close the old payment", description: message },
  }[view];

  useEffect(() => {
    if (request.autoCancel && !autoCancelStarted.current) {
      autoCancelStarted.current = true;
      cancelAttempt();
    }
  });

  // Same device and network as the earlier payment: no second "are you sure".
  const startAgain = () => (attempt?.sameDevice ? cancelAttempt() : setView("confirm"));

  const notNow = (
    <Button type="button" variant="ghost" onClick={onClose} className="mx-auto mt-1 h-10 px-5 text-[15px] font-medium text-slate-600 hover:text-slate-900">
      Not now
    </Button>
  );
  const whyNot = attempt?.replaced
    ? "This payment is for a plan that has since been changed, so it can't be finished."
    : attempt?.gateway === "Airwallex"
      ? "Airwallex payments can only be finished on the device where they were started."
      : "This payment can only be finished on the device where it was started.";

  let body = null;
  if (view === "cancelled") {
    body = (
      <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700">
        <LoaderCircle className="size-4 text-primary motion-safe:animate-spin" aria-hidden="true" />
        Taking you to the payment page now…
      </p>
    );
  } else if (view === "paid") {
    body = (
      <Button type="button" autoFocus onClick={onPaid} className="h-11 w-full rounded-xl text-[15px] font-semibold hover:bg-primary/90">
        Continue
      </Button>
    );
  } else if (view === "failed") {
    body = (
      <div className="flex flex-col">
        <Button type="button" autoFocus onClick={cancelAttempt} className="h-11 w-full rounded-xl text-[15px] font-semibold hover:bg-primary/90">
          Try again
        </Button>
        {notNow}
      </div>
    );
  } else if (view === "confirm") {
    body = (
      <div className="flex flex-col gap-2.5">
        <Button type="button" onClick={cancelAttempt} className="h-11 w-full rounded-xl text-[15px] font-semibold hover:bg-primary/90">
          Yes, start a new payment
        </Button>
        {/* The safe choice gets the focus in a destructive confirmation. */}
        <Button
          type="button"
          variant="outline"
          autoFocus
          onClick={() => setView("details")}
          className="h-11 w-full rounded-xl border-slate-500 text-[15px] font-medium text-slate-900"
        >
          Keep the old payment
        </Button>
      </div>
    );
  } else if (view === "details") {
    body = (
      <div className="flex flex-col gap-3">
        {(attempt?.paymentName || started || expiry) && (
          <div className="rounded-xl bg-slate-100 px-4 py-3 text-left">
            {attempt?.paymentName && <p className="text-base leading-snug font-semibold break-words text-slate-900">{attempt.paymentName}</p>}
            {started && <p className="mt-0.5 text-[13.5px] leading-snug text-slate-600">{started}</p>}
            {expiry && <p className="mt-0.5 text-[13.5px] leading-snug text-slate-600">{expiry}</p>}
          </div>
        )}

        {continueUrl ? (
          <Option id="pipOptionContinue" highlighted Icon={Undo2} title="Go back to my payment" text="Carry on from where you stopped. Nothing is lost.">
            <Button
              type="button"
              autoFocus
              onClick={() => window.location.assign(continueUrl)}
              className="h-11 w-full rounded-xl text-[15px] font-semibold hover:bg-primary/90"
            >
              Continue my payment
            </Button>
          </Option>
        ) : (
          <div className="flex gap-2.5 rounded-xl bg-[var(--plc)] px-3.5 py-3 text-left text-[13.5px] leading-snug text-slate-800">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p>{whyNot}</p>
          </div>
        )}

        <Option
          id="pipOptionRestart"
          highlighted={!continueUrl}
          Icon={RefreshCw}
          title="Start a new payment"
          text={`${
            continueUrl
              ? "The old payment will be closed. Use this only if you cannot open the old one."
              : "The old payment will be closed, and a new one will start here."
          } If someone else is paying on another device, let them finish.`}
        >
          <Button
            type="button"
            variant={continueUrl ? "outline" : "default"}
            autoFocus={!continueUrl}
            onClick={startAgain}
            className={`h-11 w-full rounded-xl text-[15px] ${
              continueUrl ? "border-slate-500 font-medium text-slate-900" : "font-semibold hover:bg-primary/90"
            }`}
          >
            Start a new payment
          </Button>
        </Option>

        {notNow}
      </div>
    );
  }

  const HeaderIcon = header.Icon;
  return (
    <Dialog open onOpenChange={(open) => !open && !locked && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-[20px] p-0 shadow-2xl sm:max-w-[460px]"
      >
        {/* aria-live: the title and text change as the cancel runs (cancelling -> cancelled / failed). */}
        <DialogHeader className={`items-center gap-0 px-5 pt-7 text-center sm:px-6 ${body ? "pb-4" : "pb-7"}`} aria-live="polite">
          <span className={`flex size-16 items-center justify-center rounded-full ${TONES[header.tone]}`} aria-hidden="true">
            <HeaderIcon className={`size-7 ${header.spin ? "motion-safe:animate-spin" : ""}`} />
          </span>
          <DialogTitle className="mt-3.5 text-xl leading-snug font-semibold text-slate-900">{header.title}</DialogTitle>
          {header.description && (
            <DialogDescription className="mt-1.5 max-w-[22rem] text-[15px] leading-relaxed text-slate-600">{header.description}</DialogDescription>
          )}
        </DialogHeader>
        {body && <div className="px-5 pb-5 sm:px-6">{body}</div>}
      </DialogContent>
    </Dialog>
  );
}
