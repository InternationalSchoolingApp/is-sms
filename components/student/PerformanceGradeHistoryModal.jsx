"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CalendarModal, DetailRow } from "@/components/dashboard/calendar/CalendarModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getProgressReportGradeHistory } from "@/services/dashboardApi";

/**
 * Grade-history sub-modal, opened from an assignment row in
 * PerformanceProgressModal — legacy's nested "attempts" popup.
 */
export function PerformanceGradeHistoryModal({ itemId, enrollId, itemTitle, onClose }) {
  const t = useTranslations("performance.history");
  const tc = useTranslations("common");
  const { context } = useDashboardContext();
  const { schoolUUID, uniqueId } = context ?? {};
  const dummy = useDummyStudent();
  const { data, isLoading } = useQuery({
    queryKey: ["progress-report-grade-history", schoolUUID, itemId, enrollId, dummy.key],
    queryFn: () =>
      dummy.enabled
        ? dummy.student.academicGradeHistory(itemId)
        : getProgressReportGradeHistory({ schoolUUID, uniqueId, itemId, enrollId }),
    enabled: Boolean(schoolUUID && uniqueId && itemId && enrollId && dummy.settled),
  });

  const grades = data?.response?.grades?.grade;
  const gradeList = Array.isArray(grades) ? grades : grades ? [grades] : [];

  return (
    <CalendarModal title={itemTitle || t("title")} onClose={onClose}>
      {isLoading ? (
        <p className="py-4 text-center text-black/50">{tc("status.loading")}</p>
      ) : gradeList.length === 0 ? (
        <p className="py-4 text-center text-black/50">{t("empty")}</p>
      ) : (
        gradeList.map((grade, index) => (
          <div key={index} className="rounded-lg border border-slate-100 p-2">
            <DetailRow label={t("attempt")} value={index + 1} />
            <DetailRow label={t("score")} value={grade.achieved != null && grade.possible != null ? `${grade.achieved} / ${grade.possible}` : null} />
            {/* percent may already carry its "%" (dummy data: "88%"); add it only when missing */}
            <DetailRow label={t("percent")} value={grade.percent != null ? `${String(grade.percent).replace(/%$/, "")}%` : null} />
            <DetailRow label={t("submitted")} value={grade.lastactivitydate} />
          </div>
        ))
      )}
    </CalendarModal>
  );
}
