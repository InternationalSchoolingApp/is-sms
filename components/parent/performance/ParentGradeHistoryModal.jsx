"use client";

import { useQuery } from "@tanstack/react-query";
import { PerfDialog } from "@/components/parent/performance/PerfDialog";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getProgressReportGradeHistory } from "@/services/dashboardApi";
import { asArray } from "@/components/parent/performance/performanceHelpers";

/**
 * "Grade History" of one assignment (legacy parentAcademicPerformanceOpenGradeHistoryPopup): Date, Visits, Time,
 * Score, By. The call sends the Buzz enrollment and item ids (both from the child's own rows) and the child's id, which
 * the backend checks against the signed-in parent.
 */
export function ParentGradeHistoryModal({ childUserId, enrollId, itemId, onClose }) {
  const { context } = useDashboardContext();
  const { schoolUUID, uniqueId, userId: parentUserId } = context ?? {};
  const { data, isPending } = useQuery({
    queryKey: ["parent-grade-history", schoolUUID, parentUserId, childUserId, enrollId, itemId],
    queryFn: () => getProgressReportGradeHistory({ schoolUUID, uniqueId, itemId, enrollId, studentUserId: childUserId }),
    enabled: Boolean(schoolUUID && uniqueId && childUserId && enrollId && itemId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const grades = asArray(data?.response?.grades?.grade);
  const records = grades.map((grade) => {
    const by = [grade.user?.firstname, grade.user?.lastname].filter(Boolean).join(" ");
    return [
      { label: "Date", value: grade.lastactivitydate ?? "-" },
      { label: "Visits", value: grade.attempts || 0 },
      { label: "Time", value: grade.expTime || "N/A" },
      { label: "Score", value: `${grade.achieved ?? "0"}/${grade.possible ?? "0"} ${grade.percent || "0"}` },
      { label: "By", value: by },
    ];
  });

  return (
    <PerfDialog title="Grade History" onClose={onClose}>
      {isPending ? (
        <p className="pop-msg">Loading…</p>
      ) : records.length === 0 ? (
        <p className="pop-msg">No Record</p>
      ) : (
        <div className="ftw">
          <table className="ftbl rp-t pop-tbl">
            <thead>
              <tr>
                {records[0].map(({ label }) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rows, index) => (
                <tr key={index}>
                  {rows.map(({ label, value }) => (
                    <td key={label} data-l={label}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PerfDialog>
  );
}
