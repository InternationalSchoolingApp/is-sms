"use client";

import { useMemo, useState } from "react";
import { ChartNoAxesColumn, ChevronLeft, ChevronRight } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentAcademicPerformance } from "@/hooks/useStudentAcademicPerformance";
import { PerformanceProgressModal } from "@/components/student/PerformanceProgressModal";

const PAGE_SIZE = 10;

/**
 * Performance ("My Performance") — legacy studentAcademicPerformance.js.
 * Only populated for Agilix Buzz LMS course providers; self-paced/other
 * providers show the empty state (not an error).
 */
export function Performance() {
  const { context } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const { isLoading, courses } = useStudentAcademicPerformance({ schoolUUID, userId });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  const pageCount = Math.max(1, Math.ceil(courses.length / PAGE_SIZE));
  const pageRows = useMemo(() => courses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [courses, page]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex items-center gap-2 px-1 pb-4">
        <ChartNoAxesColumn className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-extrabold text-black sm:text-xl">My Performance</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        {isLoading ? (
          <p className="py-8 text-center text-black/50">Loading…</p>
        ) : courses.length === 0 ? (
          <p className="py-8 text-center text-black/50">No course performance data available yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-black/50">
                    <th className="py-2 pr-3 font-semibold">Course</th>
                    <th className="py-2 pr-3 font-semibold">Score</th>
                    <th className="py-2 pr-3 font-semibold">Pace</th>
                    <th className="py-2 pr-3 font-semibold">Teacher</th>
                    <th className="py-2 pr-3 font-semibold">End Date</th>
                    <th className="py-2 font-semibold">Remaining Days</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((course) => (
                    <tr
                      key={course.lmsEnrollmentId}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                      onClick={() => setSelected({ ...course, studentUserId: userId })}
                    >
                      <td className="py-2 pr-3 font-semibold text-black">{course.courseName}</td>
                      <td className="py-2 pr-3 text-black/70">{course.score != null ? `${course.score}%` : "—"}</td>
                      <td className="py-2 pr-3 text-black/70">{course.progressPace || "—"}</td>
                      <td className="py-2 pr-3 text-black/70">{course.teacherName || "—"}</td>
                      <td className="py-2 pr-3 text-black/70">{course.endDate || "—"}</td>
                      <td className="py-2 text-black/70">{course.remainingDays ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-black/60">
                <span>
                  Page {page + 1} of {pageCount}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={page >= pageCount - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && <PerformanceProgressModal course={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
