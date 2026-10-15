"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Entry point to the AI Suggester on Step 3. Rendered only when the backend
 * says so (course-details aiAdvisor.visible, driven by SETTINGS); clicking it
 * is the first moment anything AI-related runs.
 *
 * Two layouts, swapped at the md breakpoint (768px): the full card (icon +
 * copy + button) at md and up, and a compact single-line "Not sure? Start
 * here" row below it — same `onOpen` action either way.
 */
export function AiSuggesterCard({ onOpen, disabled }) {
  return (
    <>
      <div className="ai-pulse mt-3 hidden rounded-xl border border-[#cdf1cb] bg-[#e2f5f0] px-4 py-3 md:flex md:flex-row md:items-center md:gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3fa43c] text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-black">Not sure which courses to pick?</p>
          <p className="text-xs text-slate-700">Answer a few quick questions and let our smart course picker suggest courses for you.</p>
        </div>
        <Button type="button" onClick={onOpen} disabled={disabled} className="shrink-0 bg-[#3fa43c] hover:bg-[#3fa43c]/90">
          <Sparkles className="h-4 w-4" /> Smart Course Picker
        </Button>
      </div>

      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className="ai-pulse mt-3 flex w-full items-center gap-3 rounded-xl border border-[#cdf1cb] bg-[#e2f5f0] px-4 py-3 text-left disabled:opacity-60 md:hidden"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3fa43c] text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 text-black">
          <p className="text-sm font-bold">Not sure? Start here</p>
          <p className="text-xs font-medium">Help me choose courses</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-black" aria-hidden="true" />
      </button>
    </>
  );
}
