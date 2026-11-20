"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getStudentProgressReportDetail } from "@/services/dashboardApi";
import { PerformanceGradeHistoryModal } from "@/components/student/PerformanceGradeHistoryModal";
import { MobileTableCard } from "@/components/student/MobileTableCard";
import { useLabelTranslator } from "@/i18n/labels";

// label: performance.progress.tiles.<label>.
const TILES = [
  { key: "totalAssignment", label: "total" },
  { key: "submiteAssign", label: "submitted" },
  { key: "pendingAssign", label: "pending" },
  { key: "upcomingAssign", label: "upcoming" },
  { key: "passesAssign", label: "passed" },
  { key: "failedAssign", label: "failed" },
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
  const t = useTranslations("performance.progress");
  const tc = useTranslations("common");
  // LMS submission states (SUBMITTED, LATE, BEFORE TIME, EXCUSED): performance.progress.itemStatuses.<labelKey>.
  const itemStatus = useLabelTranslator("performance.progress.itemStatuses");
  const { context } = useDashboardContext();
  const { schoolUUID, uniqueId } = context ?? {};
  const [historyItem, setHistoryItem] = useState(null);
  const dummy = useDummyStudent();

  const { data, isLoading } = useQuery({
    queryKey: ["student-progress-report-detail", schoolUUID, course.lmsEnrollmentId, course.lmsCourseId, dummy.key],
    queryFn: () =>
      dummy.enabled
        ? dummy.student.academicProgressDetail(course.lmsEnrollmentId, course.lmsCourseId)
        : getStudentProgressReportDetail({
            schoolUUID,
            uniqueId,
            studentUserId: course.studentUserId,
            lmsEnrollmentId: course.lmsEnrollmentId,
            lmsCourseId: course.lmsCourseId,
          }),
    enabled: Boolean(schoolUUID && uniqueId && course.lmsEnrollmentId && dummy.settled),
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
            aria-label={tc("actions.close")}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
          >
            ×
          </button>
          <h2 className="pr-6 text-base font-extrabold text-black">{course.courseName}</h2>

          {isLoading ? (
            <p className="py-6 text-center text-black/50">{tc("status.loading")}</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {TILES.map((tile) => (
                  <div key={tile.key} className="rounded-lg border border-slate-100 p-2 text-center">
                    <div className="text-lg font-extrabold text-black">{data?.[tile.key] ?? 0}</div>
                    <div className="text-[11px] text-black/50">{t(`tiles.${tile.label}`)}</div>
                  </div>
                ))}
              </div>

              {/* Phone: one tappable card per assignment (column title beside each value). */}
              <div className="mt-4 sm:hidden">
                {items.length === 0 ? (
                  <p className="py-4 text-center text-black/50">{t("empty")}</p>
                ) : (
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li key={item.itemid}>
                        <button type="button" onClick={() => setHistoryItem(item)} className="block w-full cursor-pointer text-left">
                          <MobileTableCard
                            rows={[
                              { label: t("assignment"), value: item.title },
                              { label: t("due"), value: item.duedate || "—" },
                              { label: t("status"), value: itemStatus([item.submissionStatus, item.status].find((s) => s && s !== "0")) || "—" },
                              { label: t("score"), value: item.unitPercent || item.unitPercent === 0 ? `${item.unitPercent}%` : "—" },
                            ]}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-black/50">
                      <th className="py-2 pr-3 font-semibold">{t("assignment")}</th>
                      <th className="py-2 pr-3 font-semibold">{t("due")}</th>
                      <th className="py-2 pr-3 font-semibold">{t("status")}</th>
                      <th className="py-2 font-semibold">{t("score")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-black/50">
                          {t("empty")}
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
                            {itemStatus([item.submissionStatus, item.status].find((s) => s && s !== "0")) || "—"}
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
