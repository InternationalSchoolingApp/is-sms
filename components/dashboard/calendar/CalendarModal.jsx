"use client";

import { X } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";

/**
 * Shared modal shell for the calendar's event-detail popups (class / activity / assignment / holiday).
 * The older shell keeps this project's Dialog convention (black/transparent overlay, red-bg white close button). In the grade
 * looks (Grade K–5, Grade 6–8, Grade 9–12: `isK5`) it is a K–5 dialog like the other popups of the mockup (Playful.dc.html): the
 * dark overlay, a card with a 3px ink border and a chunky shadow, the round red close button, the display font for the title and
 * the body font of the student's look. It is not portalled out of the page, so the look (font, text size of the band, colours)
 * reaches it from the K–5 shell around it. The title, rows, notes, countdown and buttons below share that one look.
 */
export function CalendarModal({ title, onClose, children }) {
  const { isK5 } = useDashboardContext();
  if (isK5) {
    return (
      <div data-blocking-popup="" className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,16,34,0.55)] p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === "string" ? title : undefined}
          className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[480px] overflow-y-auto rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-[22px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3.5 top-3.5 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-[#E5243B] p-0 shadow-[0_4px_0_#B3172B]"
          >
            <X className="h-[18px] w-[18px] text-white" strokeWidth={3.4} aria-hidden="true" />
          </button>
          <h2 className="m-0 pr-14 font-k5-display text-2xl font-semibold leading-[1.15]">{title}</h2>
          <div className="mt-3.5 flex flex-col gap-2 font-k5-body text-base font-extrabold">{children}</div>
        </div>
      </div>
    );
  }
  return (
    <div data-blocking-popup="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="pr-6 text-base font-extrabold text-black">{title}</h2>
        <div className="mt-3 space-y-2 text-sm text-black">{children}</div>
      </div>
    </div>
  );
}


export function DetailRow({ label, value }) {
  const { isK5 } = useDashboardContext();
  if (value === null || value === undefined || value === "") return null;
  if (isK5) {
    return (
      <div className="flex items-start justify-between gap-4 border-b-2 border-k5-line py-2 last:border-b-0">
        <span className="text-k5-mut">{label}</span>
        <span className="text-right font-black text-k5-ink">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-1.5 last:border-b-0">
      <span className="text-black/50">{label}</span>
      <span className="text-right font-semibold text-black">{value}</span>
    </div>
  );
}

const PILL_K5 = "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 font-k5-display text-[17px] font-semibold no-underline disabled:cursor-default disabled:opacity-60";
const PILL_OLD = "rounded-full px-4 py-2 text-sm font-semibold";

/**
 * The popup's buttons, one look per shell. kind: "primary" (View Attachment / Attempt / Rate), "join" (Join Event),
 * "close" (the quiet one).
 */
export function calendarButtonClass(k5, kind) {
  if (k5) {
    if (kind === "join") return `${PILL_K5} border-none bg-k5-grn text-white shadow-[0_4px_0_var(--k5-grnd)]`;
    if (kind === "close") return `${PILL_K5} border-[3px] border-k5-line bg-k5-card text-k5-ink shadow-[0_4px_0_var(--k5-line)]`;
    return `${PILL_K5} border-none bg-k5-ac text-white shadow-[0_4px_0_var(--k5-acd)]`;
  }
  if (kind === "join") return `${PILL_OLD} bg-green-600 text-white`;
  if (kind === "close") return `${PILL_OLD} bg-slate-100 text-black`;
  return `${PILL_OLD} bg-primary text-white`;
}

/** A note line of the popup ("Your activity has been completed."). */
export function calendarNoteClass(k5) {
  return k5 ? "rounded-2xl bg-k5-act px-4 py-2.5 font-extrabold text-k5-acx" : "rounded-lg bg-slate-100 px-3 py-2 font-semibold text-black/70";
}
