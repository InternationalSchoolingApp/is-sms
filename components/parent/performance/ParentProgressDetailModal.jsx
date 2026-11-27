"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PerfDialog } from "@/components/parent/performance/PerfDialog";
import { ParentGradeHistoryModal } from "@/components/parent/performance/ParentGradeHistoryModal";
import { asArray, subjectColors, submitStatusText, textClass } from "@/components/parent/performance/performanceHelpers";
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
    <div className="pop-prog">
      <p>
        <b>{percent}%</b> of {label} activities completed ({done} of {total})
      </p>
      <i className="rp-bar">
        <i style={{ width: `${width}%` }} />
      </i>
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
      item.title || "N/A",
      item.duedate || "N/A",
      <span key="s" className={textClass(item.colorDueText)}>{item.submitteddate || "N/A"}</span>,
      <span key="t" className="dc-id">{item.unitTimeSpent || "N/A"}</span>,
      <span key="ss" className={textClass(item.colorDueText)}>{submitStatus || "N/A"}</span>,
      item.unitPercent ? <b key="sc" className={`rp-pc ${textClass(item.colorScoreText)}`}>{item.unitPercent}%</b> : "",
      item.letter ? <span key="l" className="rp-gr">{item.letter}</span> : "",
      item.teacherGradeStatus || "N",
      submitStatus ? (
        <button key="v" type="button" onClick={() => setHistoryItem(item)} className="fbtn o">
          View
        </button>
      ) : (
        ""
      ),
      status === "SUBMITTED" ? (
        <span key="st" className="pv-ok">Submitted</span>
      ) : status === "EXCUSED" ? (
        <span key="st" className="ex">Excused</span>
      ) : (
        ""
      ),
    ];
  };

  const [strong, tint] = subjectColors(course.courseName, 0);
  const teacher = String(course.teacherName ?? "").trim();

  return (
    <>
      <PerfDialog title={course.courseName || "Course"} onClose={onClose} wide>
        {isPending ? (
          <p className="pop-msg">Loading…</p>
        ) : !data ? (
          <p className="pop-msg">The course details could not be loaded.</p>
        ) : (
          <>
            <div className="rp-c pv-card" style={{ "--cc": strong, "--ct": tint, padding: 0, border: 0, animation: "none" }}>
              <div className="rp-ch">
                <span className="ic">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z" />
                    <path d="M12 6v13.5" />
                  </svg>
                </span>
                <div className="t">
                  <small>COURSE</small>
                  <b>{enrollment?.entity?.title || course.courseName || "N/A"}</b>
                  {teacher && (
                    <span>
                      Teacher Name: <strong>{teacher}</strong>
                    </span>
                  )}
                </div>
                <div className="rp-chips">
                  <span>{enrollment ? `${percent}%` : "N/A"}</span>
                  {grades.letter && <span>Grade {grades.letter}</span>}
                </div>
              </div>
            </div>

            <div className="rp-2 pop-sec">
              <div className="rp-box pop-lead">
                <p>
                  <span>Current Overall Score:</span> <b>{enrollment ? `${percent}%` : "N/A"}</b>
                </p>
                <p>
                  <span>Current Overall Grade:</span> <b>{grades.letter || "N/A"}</b>
                </p>
                <p>
                  <span>Duration:</span> <b>{enrollment ? `${enrollment.startdate || "N/A"} - ${enrollment.enddate || "N/A"}` : "N/A"}</b>
                </p>
              </div>
              {enrollment && (
                <div className="rp-box">
                  <ActivityProgress
                    label="gradable"
                    percent={grades.complete ?? 0}
                    done={grades.completedgradable ?? 0}
                    total={grades.gradable ?? 0}
                  />
                  <ActivityProgress label="all" percent={grades.completeall ?? 0} done={grades.completed ?? 0} total={grades.completable ?? 0} />
                </div>
              )}
            </div>

            <div className="pv-stats pop-counts">
              {COUNT_TILES.map(([key, label]) => (
                <div key={key} className="pv-st">
                  <small>{label}</small>
                  <b>{data[key] != null ? data[key] : 0}</b>
                </div>
              ))}
            </div>

            <div className="pop-sec">
              {items.length === 0 ? (
                <p className="pop-msg">No record found</p>
              ) : (
                <div className="ftw">
                  <table className="ftbl rp-t pop-tbl">
                    <thead>
                      <tr>
                        {ITEM_HEADERS.map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.itemid ?? index}>
                          {itemCells(item).map((value, i) => (
                            <td key={ITEM_HEADERS[i]} data-l={ITEM_HEADERS[i]} className={i === 0 ? "wr" : undefined}>
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </PerfDialog>

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
