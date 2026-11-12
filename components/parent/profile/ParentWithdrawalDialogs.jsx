"use client";

import { useRef, useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isOtp } from "@/components/parent/profile/withdrawalModel";

const SECONDARY = "min-h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-black hover:bg-slate-50 disabled:opacity-50";
const PRIMARY = "min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * "Verify it's you" (legacy withdrawalOpenOtpModal): six boxes for the code e-mailed to the parent. The code lives only
 * in this component's state while the dialog is open (never in a query key, URL or log) and is handed to onVerify(code)
 * once. Mounted only while open, so every opening starts empty. `error` = the last verify message.
 */
export function ParentOtpDialog({ email, busy, error, onVerify, onCancel }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef([]);
  const code = digits.join("");

  const setAt = (index, value) => setDigits((prev) => prev.map((d, i) => (i === index ? value : d)));
  const onInput = (index, raw) => {
    const clean = raw.replace(/\D/g, "");
    if (clean.length > 1) {
      // A pasted code: spread it over the boxes.
      const next = clean.slice(0, 6).split("");
      setDigits(Array.from({ length: 6 }, (_, i) => next[i] || ""));
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    setAt(index, clean);
    if (clean && index < 5) refs.current[index + 1]?.focus();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[440px]">
        <div className="space-y-1">
          <DialogTitle className="text-xl font-semibold">Verify it&apos;s you</DialogTitle>
          <DialogDescription>
            We&apos;ve sent a 6-digit code to <b className="break-all text-black">{email || "your registered email"}</b>.
          </DialogDescription>
        </div>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (isOtp(code) && !busy) onVerify(code);
          }}
          className="space-y-3"
        >
          <div className="flex justify-center gap-1.5 sm:gap-2" role="group" aria-label="One-time code">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (refs.current[index] = el)}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                autoFocus={index === 0}
                aria-label={`Digit ${index + 1}`}
                value={digit}
                onChange={(e) => onInput(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digit && index > 0) refs.current[index - 1]?.focus();
                }}
                className="h-12 w-10 rounded-lg border border-slate-300 text-center text-xl font-bold text-black outline-none focus:border-2 focus:border-primary sm:w-11"
              />
            ))}
          </div>
          {error && (
            <p role="alert" className="text-center text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              <b>This begins your child&apos;s enrollment cancellation.</b> Once verified, the withdrawal request is submitted and administration is notified. You can track its status here afterward.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onCancel} disabled={busy} className={SECONDARY}>
              Cancel
            </button>
            <button type="submit" disabled={busy || !isOtp(code)} className={PRIMARY}>
              {busy ? "Verifying…" : "Verify & submit"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Warning confirmation (legacy withdrawalShowWarn). */
export function ParentConfirmDialog({ title, message, confirmLabel = "Confirm", busy, onConfirm, onCancel }) {
  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[420px]">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" aria-hidden="true" />
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={SECONDARY}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="min-h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** "Withdrawal request submitted" (legacy withdrawalOkModal). */
export function ParentSubmittedDialog({ requestNo, email, onClose }) {
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[440px]">
        <div className="space-y-2 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
          <DialogTitle className="text-xl font-semibold">Withdrawal request submitted</DialogTitle>
          <DialogDescription>{requestNo ? `Reference ${requestNo} · Status: In Review` : "Status: In Review"}</DialogDescription>
        </div>
        <p className="text-sm text-black/70">
          Your child&apos;s withdrawal request has been submitted{email ? <> and a confirmation email has been sent to <b className="break-all text-black">{email}</b></> : null}.{" "}
          <b className="text-black">A representative from our school administration will be in touch.</b>
        </p>
        <p className="rounded-lg border border-[#bcd4fb] bg-[#f4f8ff] p-3 text-sm text-primary">
          Need help? You can contact us at <b className="break-all">admin.support@internationalschooling.org</b> for further clarification.
        </p>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={PRIMARY}>
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
