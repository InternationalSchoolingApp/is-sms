"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Legacy "View Attachment" preview: an image attachment opens in this dialog on the same tab
 * (header "Preview", the picture, red Close button); other files (PDF, ...) open in a new tab instead
 * (see AttachmentButton). `k5` gives it the Grade K–5 look. Shared by both announcement modals.
 */
export function AttachmentPreviewDialog({ url, onClose, k5 = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div role="presentation" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={(e) => {
        // The dialog sits inside the announcement modal in the React tree: do not let this click close that one too.
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Preview"
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-full w-full max-w-[1000px] flex-col overflow-hidden bg-white shadow-xl ${k5 ? "rounded-[26px] border-[3px] border-k5-ink" : "rounded-md"}`}
      >
        <div className={`px-4 py-3 text-xl text-white ${k5 ? "bg-k5-ac font-k5-display font-semibold" : "bg-primary"}`}>Preview</div>
        <div className="min-h-0 flex-1 overflow-auto">
          {/* An announcement picture uploaded to S3 (any size, any school): a plain <img>, no remote image config needed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Announcement attachment" className="mx-auto block h-auto max-w-full" />
        </div>
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border-none bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
