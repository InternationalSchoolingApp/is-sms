"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Entry point to the AI Suggester on Step 3. Rendered only when the backend
 * says so (course-details aiAdvisor.visible, driven by SETTINGS); clicking it
 * is the first moment anything AI-related runs.
 */
export function AiSuggesterCard({ onOpen, disabled }) {
  return (
    <div className="ai-pulse mt-3 flex flex-col gap-3 rounded-xl border border-[#0f8a74]/40 bg-[#e2f5f0] px-4 py-3 sm:flex-row sm:items-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f8a74] text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-black">Not sure which courses to pick?</p>
        <p className="text-xs text-slate-700">Answer a few quick questions and let AI suggest courses for you.</p>
      </div>
      <Button type="button" onClick={onOpen} disabled={disabled} className="shrink-0 bg-[#0f8a74] hover:bg-[#0f8a74]/90">
        <Sparkles className="h-4 w-4" /> AI Suggester
      </Button>
    </div>
  );
}
