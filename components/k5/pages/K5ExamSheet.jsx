"use client";

import { CalendarClock, ExternalLink, FileX } from "lucide-react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { K5Loading, K5BlockSkeleton } from "@/components/k5/K5Skeletons";

/**
 * Grade-look "Examination Schedule" (legacy studentExaminationSheetContent.js): the admin-uploaded exam sheet
 * (a PDF) in a card, or the friendly "going to upload soon" note. Same file and rules as the standard page;
 * only the look differs (K-5 / Grade 6-8 / High share these classes, the skin supplies the colours).
 */
export function K5ExamSheet({ loading, fileUrl }) {
  usePicoContentReady(!loading);

  return (
    <div className="flex flex-col gap-4">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
        <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-bt">
          <CalendarClock className="h-12 w-12 text-k5-bi" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">Examination Schedule</h1>
          <p className="m-0 text-lg font-extrabold text-k5-mut">Your exam dates, set by your school.</p>
        </div>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center gap-2 rounded-full border-none bg-k5-ac px-6 font-k5-display text-lg font-semibold text-white no-underline shadow-[0_5px_0_var(--k5-acd)] max-[760px]:w-full max-[760px]:justify-center"
          >
            <ExternalLink className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
            Open in new tab
          </a>
        )}
      </div>

      {loading ? (
        <K5Loading label="Loading the exam schedule">
          <K5BlockSkeleton height={500} />
        </K5Loading>
      ) : fileUrl ? (
        <section aria-label="Examination Schedule" className={`${K5_CARD} p-3.5`}>
          <iframe src={fileUrl} title="Examination Schedule" className="block h-[70vh] min-h-[420px] w-full rounded-2xl border-none bg-white" />
        </section>
      ) : (
        <div className={`${K5_CARD} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-k5-soft text-k5-mut">
            <FileX className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="m-0 font-k5-display text-2xl font-semibold text-k5-mut">Your Examination Schedule is going to upload soon.</p>
        </div>
      )}
    </div>
  );
}
