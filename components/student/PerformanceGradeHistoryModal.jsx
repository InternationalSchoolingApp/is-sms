"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarModal, DetailRow } from "@/components/dashboard/calendar/CalendarModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getProgressReportGradeHistory } from "@/services/dashboardApi";

/**
 * Grade-history sub-modal, opened from an assignment row in
 * PerformanceProgressModal — legacy's nested "attempts" popup.
 */
export function PerformanceGradeHistoryModal({ itemId, enrollId, itemTitle, onClose }) {
  const { context } = useDashboardContext();
  const { schoolUUID, uniqueId } = context ?? {};
  const { data, isLoading } = useQuery({
    queryKey: ["progress-report-grade-history", schoolUUID, itemId, enrollId],
    queryFn: () => getProgressReportGradeHistory({ schoolUUID, uniqueId, itemId, enrollId }),
    enabled: Boolean(schoolUUID && uniqueId && itemId && enrollId),
  });

  const grades = data?.response?.grades?.grade;
  const gradeList = Array.isArray(grades) ? grades : grades ? [grades] : [];

  return (
    <CalendarModal title={itemTitle || "Grade History"} onClose={onClose}>
      {isLoading ? (
        <p className="py-4 text-center text-black/50">Loading…</p>
      ) : gradeList.length === 0 ? (
        <p className="py-4 text-center text-black/50">No attempts yet.</p>
      ) : (
        gradeList.map((grade, index) => (
          <div key={index} className="rounded-lg border border-slate-100 p-2">
            <DetailRow label="Attempt" value={index + 1} />
            <DetailRow label="Score" value={grade.achieved != null && grade.possible != null ? `${grade.achieved} / ${grade.possible}` : null} />
            <DetailRow label="Percent" value={grade.percent != null ? `${grade.percent}%` : null} />
            <DetailRow label="Submitted" value={grade.lastactivitydate} />
          </div>
        ))
      )}
    </CalendarModal>
  );
}
