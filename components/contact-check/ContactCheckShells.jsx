"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Contact check: the two looks of the popup. The steps (ContactCheckModal.jsx) are written once and drawn with a
 * "skin": { Shell, Btn, Field, Select, Check, ...class names }.
 *   k5Skin        Grade K-5 ("Playful") and, under data-k5-band="middle", Grade 6-8 ("Balanced"): the shell of
 *                 K5CompleteProfileModal and the code box / green button of K5ProfileOtp, K-5 theme tokens.
 *   standardSkin  Grade 9-12: the standard dashboard look (shadcn dialog / button / input / checkbox, primary header).
 *
 * Shell props: titleId, title, Icon, onDismiss (Esc / outside click: the flow decides, the popup never closes
 * itself), onClose (the header's X, only where the step has a way out), closeLabel, children.
 */

const cx = (...parts) => parts.filter(Boolean).join(" ");

/* ---------- K-5 / middle ---------- */

// A native modal <dialog>: the browser gives the inert page, focus containment and the top layer. It stays inside
// the K-5 shell in the DOM, so the theme tokens (and the middle band's skin) reach it without re-spreading them.
function K5DialogShell({ titleId, title, Icon, onDismiss, onClose, closeLabel, children }) {
  const ref = useRef(null);
  const unmounting = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    unmounting.current = false;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      unmounting.current = true;
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-contact-check=""
      closedby="none"
      onCancel={(e) => {
        e.preventDefault();
        onDismiss();
      }}
      onClose={() => {
        // The browser may close it on a repeated Esc: only the flow closes this popup, so it comes straight back.
        const dialog = ref.current;
        if (!unmounting.current && dialog && !dialog.open) dialog.showModal();
      }}
      className="fixed inset-0 z-[200] m-0 hidden h-full max-h-none w-full max-w-none items-center justify-center overscroll-contain border-none bg-black/40 p-4 backdrop:overflow-hidden backdrop:overscroll-contain backdrop:bg-transparent open:flex"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl border-[3px] border-k5-line bg-k5-card font-k5-body text-k5-ink shadow-xl">
        <div className="flex items-center gap-3 border-b-[3px] border-k5-line bg-k5-ac px-5 py-4">
          <Icon className="h-7 w-7 flex-none text-white" aria-hidden="true" />
          <h2 id={titleId} className="m-0 flex-1 font-k5-display text-xl font-semibold text-white">
            {title}
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-white/20 text-white hover:bg-white/30"
            >
              <X className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}

const K5_BTN = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 font-k5-display text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const K5_VARIANTS = {
  primary: "border-[3px] border-k5-ac bg-k5-ac text-white shadow-[0_3px_0_var(--k5-acd)] hover:brightness-105",
  quiet: "border-[3px] border-k5-line bg-k5-card text-k5-mut hover:bg-k5-soft",
  success: "border-none bg-k5-grn text-white shadow-[0_4px_0_var(--k5-grnD)] hover:brightness-105",
  send: "min-h-[46px] flex-none border-[3px] border-k5-ac bg-k5-act px-4 text-k5-acx",
  link: "min-h-0 self-start border-none bg-transparent p-0 font-k5-body text-[13px] font-black text-k5-acx underline",
};
const K5_INPUT =
  "min-h-[46px] w-full min-w-0 rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3.5 font-k5-body text-base font-extrabold text-k5-ink outline-none focus:border-k5-ac aria-invalid:border-k5-ri read-only:bg-k5-soft";

export const k5Skin = {
  Shell: K5DialogShell,
  Btn: ({ variant = "primary", className, ...props }) => <button type="button" {...props} className={cx(variant === "link" ? "cursor-pointer disabled:opacity-50" : K5_BTN, K5_VARIANTS[variant], className)} />,
  Field: ({ code, className, ...props }) => <input {...props} className={cx(K5_INPUT, code && "font-black tracking-[0.3em]", className)} />,
  Select: ({ className, ...props }) => <select {...props} className={cx(K5_INPUT, "w-[7.5rem] flex-none px-2", className)} />,
  Check: ({ id, checked, onChange, disabled, children }) => (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm font-extrabold text-k5-ink">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 flex-none accent-[var(--k5-ac)]" />
      {children}
    </label>
  ),
  body: "flex flex-col gap-4 overflow-y-auto p-5 [scrollbar-width:thin]",
  footer: "flex flex-wrap items-center justify-end gap-3 border-t-[3px] border-k5-line px-5 py-4",
  footNote: "me-auto text-[13px] font-extrabold text-k5-mut",
  notice: "flex items-start gap-2 rounded-2xl border-[3px] border-amber-400 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700",
  reason: "m-0 rounded-xl bg-k5-soft px-4 py-2.5 text-[13px] font-extrabold text-k5-mut",
  alert: "m-0 rounded-xl bg-k5-rt px-4 py-2.5 text-[13px] font-extrabold text-k5-ri",
  text: "m-0 text-sm font-extrabold text-k5-ink",
  muted: "m-0 text-[13px] font-extrabold text-k5-mut",
  value: "break-all font-black text-k5-acx",
  legend: "mb-2 p-0 text-sm font-black text-k5-ink",
  option:
    "flex cursor-pointer items-center gap-3 rounded-2xl border-[3px] border-k5-line bg-k5-card px-4 py-3 has-[:checked]:border-k5-ac has-[:checked]:bg-k5-act has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-k5-ac has-[:disabled]:opacity-60",
  optionIcon: "flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-k5-act text-k5-acx",
  optionTitle: "block text-[15px] font-black text-k5-ink",
  optionText: "block text-[13px] font-extrabold text-k5-mut",
  optionMark: "ms-auto flex h-6 w-6 flex-none items-center justify-center rounded-full border-[3px] border-k5-line text-transparent peer-checked:border-k5-ac peer-checked:bg-k5-ac peer-checked:text-white",
  label: "text-sm font-black text-k5-ink",
  error: "m-0 flex items-start gap-1.5 text-[13px] font-extrabold text-k5-ri",
  info: "m-0 flex items-start gap-2 rounded-2xl bg-k5-act px-4 py-2.5 text-[13px] font-extrabold text-k5-acx",
  help: "m-0 flex items-center gap-2 self-start rounded-full bg-k5-yt px-3 py-1.5 text-[13px] font-black text-k5-yi",
  step: "m-0 text-xs font-black uppercase tracking-[0.06em] text-k5-mut",
  sent: "m-0 flex items-center gap-1.5 text-[13px] font-black text-k5-gx",
  doneBox: "flex flex-col items-center gap-2 rounded-2xl bg-k5-gt px-4 py-5 text-center",
  doneIcon: "flex h-14 w-14 items-center justify-center rounded-full bg-k5-grn text-white",
  doneTitle: "m-0 font-k5-display text-xl font-semibold text-k5-ink",
};

/* ---------- Grade 9-12 ---------- */

function StandardShell({ titleId, title, Icon, onDismiss, onClose, closeLabel, children }) {
  return (
    // Controlled and always open while mounted: Esc and outside clicks only ask the flow (onDismiss).
    <Dialog open modal disablePointerDismissal onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent showCloseButton={false} data-contact-check="" className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-xl bg-white p-0 text-slate-800 sm:max-w-[520px]">
        <div className="flex items-center justify-between gap-3 bg-primary px-5 py-3.5 text-white">
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon className="h-5 w-5 flex-none" aria-hidden="true" />
            <DialogTitle id={titleId} className="m-0 text-base leading-snug font-bold">
              {title}
            </DialogTitle>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label={closeLabel} className="cursor-pointer border-none bg-transparent p-0 text-white hover:text-white/80">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

const STANDARD_VARIANTS = {
  primary: { variant: "default", className: "h-10 px-4 font-semibold" },
  quiet: { variant: "outline", className: "h-10 px-4" },
  success: { variant: "default", className: "h-10 px-4 font-semibold" },
  send: { variant: "outline", className: "h-10 flex-none border-primary px-3 text-primary" },
  link: { variant: "link", className: "h-auto p-0" },
};
const STANDARD_INPUT = "h-10 rounded-lg border-slate-300 bg-white px-3 text-base read-only:bg-slate-50";

export const standardSkin = {
  Shell: StandardShell,
  Btn: ({ variant = "primary", className, ...props }) => <Button type="button" {...props} variant={STANDARD_VARIANTS[variant].variant} className={cx(STANDARD_VARIANTS[variant].className, className)} />,
  Field: ({ code, className, ...props }) => <Input {...props} className={cx(STANDARD_INPUT, code && "font-semibold tracking-[0.3em]", className)} />,
  Select: ({ className, ...props }) => (
    <select
      {...props}
      className={cx("h-10 w-[7.5rem] flex-none rounded-lg border border-slate-300 bg-white px-2 text-base text-black outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive", className)}
    />
  ),
  Check: ({ id, checked, onChange, disabled, children }) => (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(value) => onChange(value === true)} />
      {children}
    </label>
  ),
  body: "flex flex-col gap-4 overflow-y-auto px-5 py-5",
  footer: "flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5",
  footNote: "me-auto text-xs text-slate-500",
  notice: "flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800",
  reason: "m-0 rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-600",
  alert: "m-0 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive",
  text: "m-0 text-sm text-slate-700",
  muted: "m-0 text-xs text-slate-500",
  value: "break-all font-semibold text-primary",
  legend: "mb-2 p-0 text-sm font-semibold text-slate-700",
  option:
    "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:opacity-60",
  optionIcon: "hidden",
  optionTitle: "block text-sm font-semibold text-slate-800",
  optionText: "block text-xs text-slate-500",
  optionMark: "order-first flex h-4 w-4 flex-none items-center justify-center rounded-full border border-slate-400 text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground [&>svg]:h-3 [&>svg]:w-3",
  label: "text-sm font-semibold text-slate-700",
  error: "m-0 flex items-start gap-1.5 text-xs font-medium text-destructive",
  info: "m-0 flex items-start gap-2 text-xs text-slate-500",
  help: "hidden",
  step: "m-0 text-xs font-semibold uppercase tracking-wide text-slate-500",
  sent: "m-0 flex items-center gap-1.5 text-xs font-semibold text-green-700",
  doneBox: "flex flex-col items-center gap-2 px-4 py-4 text-center",
  doneIcon: "flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700",
  doneTitle: "m-0 text-base font-bold text-slate-800",
};
