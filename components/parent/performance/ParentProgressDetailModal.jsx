"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ParentMobileTableCard } from "@/components/parent/common/ParentMobileTableCard";
import { ParentGradeHistoryModal } from "@/components/parent/performance/ParentGradeHistoryModal";
import { asArray, submitStatusText, textClass } from "@/components/parent/performance/performanceHelpers";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getStudentProgressReportDetail } from "@/services/dashboardApi";

const COUNT_TILES = [
  ["totalAssignment", "Total Assignments"],
  ["excusedAssign", "Excused"],
  ["submiteAssign", "Submitted"],
  ["upcomingAssign", "Upcoming"],
  ["pendingAssign", "Pending"],
  ["passesAssign", "Passed"],
  ["failedAssign", "Failed"],
  ["submitBeforeTimeAssign", "Submitted BEFORE TIME"],
  ["submitOntimeAssign", "Submitted ON TIME"],
  ["submitLateAssign", "Submitted LATE"],
  ["gradeByTeacher", "Grade By Teacher"],
];

const ITEM_HEADERS = [
  "Activity Name",
  "Due Date",
  "Submitted Date",
  "Time Spent (hh:mm:ss)",
  "Submited Status",
  "Score",
  "Grade",
  "Grade By Teacher",
  "Detailed Assignment Status",
  "Status",
];

function ActivityProgress({ label, percent, done, total }) {
  const width = Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 h-3 w-24 shrink-0 overflow-hidden rounded bg-slate-200 sm:w-32">
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <span>
        {percent}% of {label} activities completed ({done} of {total})
      </span>
    </div>
  );
}

/**
 * The course detail of the child's Academic Performance — legacy parentAcademicPerformanceOpenProgressDetail
 * (a full page there, a dialog here, like the student's): the course header, the assignment counts and the
 * activities table; "View" opens the grade history. Read-only: the legacy parent view has no Excuse buttons.
 * The Buzz call takes the CHILD's user id (course.studentUserId) and the enrollment/course ids of that child's row.
 */
export function ParentProgressDetailModal({ course, onClose }) {
  const { context } = useDashboardContext();
  const { schoolUUID, uniqueId, userId: parentUserId } = context ?? {};
  const [historyItem, setHistoryItem] = useState(null);
  const childUserId = course.studentUserId;

  const { data, isPending } = useQuery({
    queryKey: ["parent-progress-detail", schoolUUID, parentUserId, childUserId, course.lmsEnrollmentId, course.lmsCourseId],
    queryFn: () =>
      getStudentProgressReportDetail({
        schoolUUID,
        uniqueId,
        studentUserId: childUserId,
        lmsEnrollmentId: course.lmsEnrollmentId,
        lmsCourseId: course.lmsCourseId,
      }),
    enabled: Boolean(schoolUUID && uniqueId && childUserId && course.lmsEnrollmentId && course.lmsCourseId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const enrollment = asArray(data?.response?.enrollments?.enrollment)[0];
  const grades = enrollment?.grades ?? {};
  const items = asArray(grades.items?.item);
  const percent = grades.percentage != null ? grades.percentage : 0;

  const itemCells = (item) => {
    const submitStatus = submitStatusText(item);
    const status = String(item.status || item.submissionStatus || "").toUpperCase();
    return [
      <span key="t" className="whitespace-normal">{item.title || "N/A"}</span>,
      item.duedate || "N/A",
      <span key="s" className={textClass(item.colorDueText)}>{item.submitteddate || "N/A"}</span>,
      item.unitTimeSpent || "N/A",
      <span key="ss" className={textClass(item.colorDueText)}>{submitStatus || "N/A"}</span>,
      <span key="sc" className={textClass(item.colorScoreText)}>{item.unitPercent ? `${item.unitPercent}%` : ""}</span>,
      item.letter || "",
      item.teacherGradeStatus || "N",
      submitStatus ? (
        <button
          key="v"
          type="button"
          onClick={() => setHistoryItem(item)}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          View
        </button>
      ) : (
        ""
      ),
      status === "SUBMITTED" ? (
        <Check key="st" className="h-4 w-4 text-green-600" aria-label="Submitted" />
      ) : status === "EXCUSED" ? (
        <span key="st" className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Excused</span>
      ) : (
        ""
      ),
    ];
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{course.courseName || "Course"}</DialogTitle>
          </DialogHeader>

          {isPending ? (
            <p className="py-8 text-center text-black/50">Loading…</p>
          ) : !data ? (
            <p className="py-8 text-center text-black/50">The course details could not be loaded.</p>
          ) : (
            <div className="space-y-4 text-sm text-black">
              <div className="space-y-1">
                <p><b>Course:</b> {enrollment?.entity?.title || course.courseName || "N/A"}</p>
                <p><b>Current Overall Score:</b> {enrollment ? `${percent}%` : "N/A"}</p>
                <p><b>Current Overall Grade:</b> {grades.letter || "N/A"}</p>
                <p><b>Duration:</b> {enrollment ? `${enrollment.startdate || "N/A"} - ${enrollment.enddate || "N/A"}` : "N/A"}</p>
              </div>
              {enrollment && (
                <div className="space-y-1">
                  <ActivityProgress
                    label="gradable"
                    percent={grades.complete ?? 0}
                    done={grades.completedgradable ?? 0}
                    total={grades.gradable ?? 0}
                  />
                  <ActivityProgress label="all" percent={grades.completeall ?? 0} done={grades.completed ?? 0} total={grades.completable ?? 0} />
                </div>
              )}

              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {COUNT_TILES.map(([key, label]) => (
                  <div key={key} className="rounded-lg border border-slate-200 p-2 text-center">
                    <dd className="text-lg font-extrabold">{data[key] != null ? data[key] : 0}</dd>
                    <dt className="text-[11px] text-black/60">{label}</dt>
                  </div>
                ))}
              </dl>

              {items.length === 0 ? (
                <p className="py-4 text-center text-black/50">No record found</p>
              ) : (
                <>
                  <ul className="space-y-3 md:hidden">
                    {items.map((item, index) => (
                      <li key={item.itemid ?? index}>
                        <ParentMobileTableCard
                          rows={itemCells(item)
                            .map((value, i) => ({ label: ITEM_HEADERS[i], value }))
                            .filter(({ value }) => value !== "")}
                        />
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full whitespace-nowrap border border-slate-200 text-left text-sm">
                      <thead className="bg-primary text-white">
                        <tr>
                          {ITEM_HEADERS.map((header) => (
                            <th key={header} className="px-3 py-2 font-normal">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={item.itemid ?? index} className="border-b border-slate-200">
                            {itemCells(item).map((value, i) => (
                              <td key={ITEM_HEADERS[i]} className="px-3 py-2">
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {historyItem && (
        <ParentGradeHistoryModal
          childUserId={childUserId}
          enrollId={enrollment?.id || course.lmsEnrollmentId}
          itemId={historyItem.itemid}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </>
  );
}
