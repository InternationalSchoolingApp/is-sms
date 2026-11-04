"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Slide-over drawer shell for the K–5 side panels (mockup .sldraw): dimmed backdrop, rounded
 * ink-bordered card, pastel header with a round icon, title / subtitle and a big red close button.
 * `accent` is the rim colour, `pastel` the header fill, `bg` the drawer fill.
 */
export function K5Drawer({ title, subtitle, icon, accent, pastel, bg, width = 480, onClose, leading, footer, bodyClassName = "", children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.classList.add("fixed");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("fixed");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);


  return (
    <div className="fixed inset-0 z-[85] box-border flex items-stretch justify-end p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default border-none bg-[rgba(10,16,34,0.55)] p-0" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative box-border flex h-full max-w-full flex-col overflow-hidden rounded-[28px] border-[3px] border-k5-ink text-k5-ink shadow-[0_8px_0_var(--k5-ink),-10px_0_30px_rgba(10,16,34,0.25)]"
        style={{ width, background: bg }}
      >
        <div className="relative flex items-center gap-3.5 border-b-4 py-[18px] pl-5 pr-[18px] text-[#0B2447]" style={{ background: pastel, borderColor: accent }}>
          {leading}
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-white" style={{ boxShadow: `0 4px 0 ${accent}` }}>
            {icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="m-0 truncate font-k5-display text-2xl font-semibold leading-[1.15]">{title}</h2>
            {subtitle && <span className="text-sm font-extrabold text-[#33415C]">{subtitle}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-k5-red"
          >
            <X className="h-4 w-4 text-white" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
        <div data-k5-drawer-body className={`flex min-h-0 flex-1 flex-col gap-3.5 ${bodyClassName}`}>
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

export function EmptyNote({ children }) {
  return <p className="m-0 rounded-[20px] bg-k5-soft px-4 py-7 text-center font-k5-display text-xl font-semibold text-k5-mut">{children}</p>;
}
