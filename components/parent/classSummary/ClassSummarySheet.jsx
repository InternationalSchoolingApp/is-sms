"use client";

import { BookOpen, CalendarDays, Clock, Hourglass, UserRound } from "lucide-react";
import { ChildAvatar } from "@/components/parent/ChildAvatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { eventMeta } from "@/components/parent/classSchedule/scheduleRows";
import { useParentClassSummaryDetail } from "@/hooks/parent/useParentClassSummary";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { resolveTimeZone } from "@/utils/attendanceDates";

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[10px] border border-slate-200 p-2">
      <div className="mb-1.5 flex items-center gap-1 text-xs text-black/60">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="break-words font-semibold text-black">{value || "N/A"}</div>
    </div>
  );
}

/**
 * The "Student Class Summary" right-hand sheet (legacy right-slide modal) of one attended class: the child, an
 * attendance badge, Course / Teacher / Date / Time / Duration from the schedule row, and the generated summary
 * sections (POST student-class-summary by meetingId). The backend may still be generating the summary.
 */
export function ClassSummarySheet({ event, onClose }) {
  const { selectedChild } = useSelectedChild();
  const detail = useParentClassSummaryDetail(event?.meetingId);
  const meta = event ? eventMeta(event, resolveTimeZone(selectedChild?.studentTimezone)) : null;
  const attending = Boolean(event?.attending);

  return (
    <Sheet open={Boolean(event)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <SheetHeader className="bg-gradient-to-r from-[#007FFF] to-[#02b9cc] px-4 py-3 pr-14 sm:px-6">
          <SheetTitle className="text-lg font-bold text-white">Student Class Summary</SheetTitle>
          <SheetDescription className="text-white/80">Detailed attendance and session report</SheetDescription>
        </SheetHeader>

        {meta && (
          <div className="space-y-4 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ChildAvatar child={selectedChild} size={56} />
                <h3 className="truncate text-xl font-bold text-black">{String(selectedChild?.studentName ?? "").trim() || "N/A"}</h3>
              </div>
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  attending ? "border-amber-400 bg-amber-50 text-amber-800" : "border-green-600 bg-green-50 text-green-700"
                }`}
              >
                {attending ? "Attending" : "Present"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Fact icon={BookOpen} label="Course" value={meta.course} />
              <Fact icon={UserRound} label="Teacher" value={meta.teacher} />
              <Fact icon={CalendarDays} label="Date" value={meta.date} />
              <Fact icon={Clock} label="Time" value={meta.time} />
              <Fact icon={Hourglass} label="Duration" value={meta.duration} />
            </div>

            <hr className="border-slate-200" />
            <h3 className="text-lg font-bold text-black">Class Summary</h3>

            {detail.isLoading ? (
              <p className="py-8 text-center text-black/60">Loading class summary...</p>
            ) : detail.sessionOut ? (
              <p className="py-8 text-center text-black/60">Your session has expired. Please log in again.</p>
            ) : detail.failed ? (
              <div className="py-8 text-center text-black/60">
                <p>Unable to load class summary.</p>
                <button type="button" onClick={detail.retry} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                  Try again
                </button>
              </div>
            ) : detail.sections.length === 0 ? (
              <p className="py-8 text-center text-black/60">{detail.generating && detail.message ? detail.message : "No summary available."}</p>
            ) : (
              detail.sections.map((section, index) => (
                <div key={`${section.title}-${index}`} className="mb-3">
                  <h4 className="text-base font-bold text-black">{section.title}</h4>
                  {/* Plain text (never HTML): the backend text keeps its line breaks. */}
                  <p className="mt-1 whitespace-pre-line break-words text-sm text-black">{section.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
