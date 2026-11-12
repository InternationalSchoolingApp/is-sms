"use client";

import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ParentMobileTableCard } from "@/components/parent/common/ParentMobileTableCard";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getProgressReportGradeHistory } from "@/services/dashboardApi";
import { asArray } from "@/components/parent/performance/performanceHelpers";

/**
 * "Grade History" of one assignment (legacy parentAcademicPerformanceOpenGradeHistoryPopup): Date, Visits, Time,
 * Score, By. The call only needs the Buzz enrollment and item ids (both came from the child's own rows).
 */
export function ParentGradeHistoryModal({ childUserId, enrollId, itemId, onClose }) {
  const { context } = useDashboardContext();
  const { schoolUUID, uniqueId, userId: parentUserId } = context ?? {};
  const { data, isPending } = useQuery({
    queryKey: ["parent-grade-history", schoolUUID, parentUserId, childUserId, enrollId, itemId],
    queryFn: () => getProgressReportGradeHistory({ schoolUUID, uniqueId, itemId, enrollId }),
    enabled: Boolean(schoolUUID && uniqueId && enrollId && itemId),
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Grade History</DialogTitle>
        </DialogHeader>
        {isPending ? (
          <p className="py-6 text-center text-black/50">Loading…</p>
        ) : records.length === 0 ? (
          <p className="py-6 text-center text-black/50">No Record</p>
        ) : (
          <>
            <ul className="space-y-3 sm:hidden">
              {records.map((rows, index) => (
                <li key={index}>
                  <ParentMobileTableCard rows={rows} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm text-black">
                <thead className="bg-primary text-white">
                  <tr>
                    {records[0].map(({ label }) => (
                      <th key={label} className="px-3 py-2 font-normal">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((rows, index) => (
                    <tr key={index} className="border-b border-slate-200">
                      {rows.map(({ label, value }) => (
                        <td key={label} className="px-3 py-2">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
