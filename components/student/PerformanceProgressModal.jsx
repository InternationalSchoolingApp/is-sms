"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getStudentProgressReportDetail } from "@/services/dashboardApi";
import { PerformanceGradeHistoryModal } from "@/components/student/PerformanceGradeHistoryModal";

const TILES = [
  { key: "totalAssignment", label: "Total" },
  { key: "submiteAssign", label: "Submitted" },
  { key: "pendingAssign", label: "Pending" },
  { key: "upcomingAssign", label: "Upcoming" },
  { key: "passesAssign", label: "Passed" },
  { key: "failedAssign", label: "Failed" },
];

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Progress-detail modal opened by clicking a course row in Performance —
 * legacy's assignment-count tiles + items table. Clicking an item opens the
 * grade-history sub-modal.
 */
export function PerformanceProgressModal({ course, onClose }) {
  const { context } = useDashboardContext();
  const { schoolUUID, uniqueId } = context ?? {};
  const [historyItem, setHistoryItem] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["student-progress-report-detail", schoolUUID, course.lmsEnrollmentId, course.lmsCourseId],
    queryFn: () =>
      getStudentProgressReportDetail({
        schoolUUID,
        uniqueId,
        studentUserId: course.studentUserId,
        lmsEnrollmentId: course.lmsEnrollmentId,
        lmsCourseId: course.lmsCourseId,
      }),
    enabled: Boolean(schoolUUID && uniqueId && course.lmsEnrollmentId),
  });

  const enrollments = asArray(data?.response?.enrollments?.enrollment);
  const items = asArray(enrollments[0]?.grades?.items?.item);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div
          className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
          >
            ×
          </button>
          <h2 className="pr-6 text-base font-extrabold text-black">{course.courseName}</h2>

          {isLoading ? (
            <p className="py-6 text-center text-black/50">Loading…</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {TILES.map((tile) => (
                  <div key={tile.key} className="rounded-lg border border-slate-100 p-2 text-center">
                    <div className="text-lg font-extrabold text-black">{data?.[tile.key] ?? 0}</div>
                    <div className="text-[11px] text-black/50">{tile.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-black/50">
                      <th className="py-2 pr-3 font-semibold">Assignment</th>
                      <th className="py-2 pr-3 font-semibold">Due</th>
                      <th className="py-2 pr-3 font-semibold">Status</th>
                      <th className="py-2 font-semibold">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-black/50">
                          No assignments found.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr
                          key={item.itemid}
                          className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                          onClick={() => setHistoryItem(item)}
                        >
                          <td className="py-2 pr-3 font-semibold text-black">{item.title}</td>
                          <td className="py-2 pr-3 text-black/70">{item.duedate || "—"}</td>
                          <td className="py-2 pr-3 text-black/70">
                            {[item.submissionStatus, item.status].find((s) => s && s !== "0") || "—"}
                          </td>
                          <td className="py-2 text-black/70">{item.unitPercent || item.unitPercent === 0 ? `${item.unitPercent}%` : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {historyItem && (
        <PerformanceGradeHistoryModal
          itemId={historyItem.itemid}
          enrollId={course.lmsEnrollmentId}
          itemTitle={historyItem.title}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </>
  );
}
