"use client";

import { Award, Clock, FileX } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentTranscriptStatus } from "@/hooks/useStudentTranscriptStatus";

/**
 * My Transcript — legacy student-transcript. Only the "Published" (stored
 * PDF) case is wired up; a "rendered-only" transcript (marks published but no
 * stored PDF yet, which legacy live-renders via a spawned Puppeteer process)
 * shows a "still being prepared" message instead of reproducing that flow —
 * deferred by design, see services/dashboardApi.js.
 */
export function Transcript() {
  const { context } = useDashboardContext();
  const { isLoading, status, fileUrl } = useStudentTranscriptStatus({ schoolUUID: context?.schoolUUID, userId: context?.userId });

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center gap-2 px-1 pb-4">
        <Award className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-extrabold text-black sm:text-xl">My Transcript</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        {isLoading ? (
          <div className="flex h-[500px] items-center justify-center text-sm text-black/60">Loading…</div>
        ) : status === "published" && fileUrl ? (
          <iframe src={fileUrl} title="Transcript" className="h-[500px] w-full rounded-lg border border-slate-200" />
        ) : status === "rendered-only" ? (
          <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
            <Clock className="h-8 w-8 text-black/30" aria-hidden="true" />
            <p className="text-sm text-black/60">Your transcript is still being prepared. Please check back soon.</p>
          </div>
        ) : (
          <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
            <FileX className="h-8 w-8 text-black/30" aria-hidden="true" />
            <p className="text-sm text-black/60">Your transcript has not been published yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
