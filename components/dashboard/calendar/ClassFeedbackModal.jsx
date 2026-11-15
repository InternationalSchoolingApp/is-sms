"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The class feedback popup (legacy buildFeedbackModalShell + showFeedbackIframeModal): a blue header with the class date and
 * time, "Class with Teacher" and the tagline, a note for students that the answers are confidential, and the feedback form
 * (the backend's embed address) in an iframe. It cannot be closed by clicking outside, only with the X. `rightSlide` shows it
 * as a side panel (the weekly Pending Feedback list opens it that way).
 */
export function ClassFeedbackModal({ title, dateTime, teacher, url, rightSlide = false, onClose }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div data-blocking-popup="" className={`fixed inset-0 z-[60] bg-black/50 ${rightSlide ? "" : "flex items-center justify-center p-4"}`}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          rightSlide
            ? "fixed inset-y-0 right-0 flex w-[42%] min-w-[520px] max-w-[760px] flex-col overflow-hidden bg-white shadow-2xl max-[640px]:w-full max-[640px]:min-w-0"
            : "flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        }
      >
        <div className="relative bg-primary px-12 py-3 text-center text-white">
          {dateTime && (
            <div className="mb-2">
              <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">{dateTime}</span>
            </div>
          )}
          <h2 className="m-0 mb-1 text-lg font-bold">
            {title}
            {teacher && (
              <>
                {" "}
                <span className="font-normal opacity-95">with</span> {teacher}
              </>
            )}
          </h2>
          <p className="m-0 text-xs opacity-90">Help Us Improve Your Learning Experience</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="m-0 border-b bg-slate-50 px-3 py-2 text-center text-xs font-semibold leading-snug text-slate-500">
          We want to hear what you really think. Your responses are confidential, so please feel free to be honest.
        </p>
        <div className="relative min-h-[320px] flex-1">
          {!loaded && (
            <div className="absolute inset-0 flex flex-col gap-3 p-6" aria-hidden="true">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>
          )}
          <iframe
            src={url}
            title={title}
            onLoad={() => setLoaded(true)}
            className="block h-[calc(100vh-12rem)] w-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
