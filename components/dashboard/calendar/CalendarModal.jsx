"use client";

import { X } from "lucide-react";

/**
 * Shared modal shell for the calendar's event-detail popups, following this
 * project's Dialog convention (black/transparent overlay, red-bg white close
 * button).
 */
export function CalendarModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
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
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-1.5 last:border-b-0">
      <span className="text-black/50">{label}</span>
      <span className="text-right font-semibold text-black">{value}</span>
    </div>
  );
}
