"use client";

import { useState } from "react";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ParentMobileTableCard } from "@/components/parent/common/ParentMobileTableCard";
import { ParentTableFooter } from "@/components/parent/common/ParentTableFooter";
import { ParentProgressDetailModal } from "@/components/parent/performance/ParentProgressDetailModal";
import {
  PACE,
  clampProgress,
  formatPercent,
  supportsDetailedView,
  teacherLabel,
} from "@/components/parent/performance/performanceHelpers";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useParentAcademicPerformance } from "@/hooks/parent/useParentAcademicPerformance";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

const PAGE_SIZE = 10;

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
const assetUrl = (file) => `${resolveBackendOrigin()}/static/theme2/images/${file}`;

function Pace({ value }) {
  const pace = PACE[value] ?? { label: value || "N/A", className: "text-black", image: "still.png", size: 24 };
  return (
    <div className={`flex items-center ${pace.className}`}>
      <OptimizedImage src={assetUrl(pace.image)} alt="" width={pace.size} height={pace.size} className="object-contain" />
      <span className="ml-2">{pace.label}</span>
    </div>
  );
}

function ProgressBar({ value }) {
  const progress = clampProgress(value);
  return (
    <div className="flex items-center">
      <div className="mr-1 h-[18px] min-w-[130px] flex-1 overflow-hidden rounded bg-slate-200">
        <div
          className="h-full rounded bg-primary"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <strong>{progress.toFixed(0)}%</strong>
    </div>
  );
}

/**
 * Academic Performance of the selected child — the parent's own page, legacy parentAcademicPerformance.js +
 * parentAcademicPerformanceContent.js ("Academic Performance" table). Pace / Pending / Progress columns and the
 * course detail only exist for Agilix Buzz providers; other providers show the empty state (not an error).
 */
function PerformanceBody() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const { isLoading, failed, sessionOut, courses, courseProviderId, childUserId, retry } = useParentAcademicPerformance();
  const [pageState, setPageState] = useState({ childId: null, page: 0 });
  const [selected, setSelected] = useState(null);
  // The page number belongs to one child: another child starts on page 1 (derived, no effect needed).
  const page = pageState.childId === childUserId ? pageState.page : 0;
  const setPage = (next) => setPageState({ childId: childUserId, page: next });

  const detailed = supportsDetailedView(courseProviderId);
  const headers = [
    "Course Name",
    "Score",
    detailed && "Pace",
    "Teacher Name",
    "End Date",
    "Remaining Days",
    detailed && "Pending Assignment",
    detailed && "Progress (gradable)",
    detailed && "Progress (all activities)",
  ].filter(Boolean);

  const loading = !context || isLoading;
  const message = loading
    ? "Loading…"
    : sessionOut
      ? "Your session has expired. Redirecting to sign in…"
      : failed
        ? "Academic performance could not be loaded."
        : courses.length === 0
          ? "No academic performance found"
          : null;

  // One record per course: its cells in the order of `headers`, shared by the table and the phone cards.
  const records = courses
      .slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
      .map((course, index) => {
        const name =
          detailed && course.lmsEnrollmentId && course.lmsCourseId ? (
            <button
              type="button"
              onClick={() => setSelected({ ...course, studentUserId: childUserId })}
              className="text-left text-primary hover:underline"
            >
              {course.courseName || "N/A"}
            </button>
          ) : (
            course.courseName || "N/A"
          );
        const cells = [
          name,
          formatPercent(course.score),
          ...(detailed ? [<Pace key="pace" value={course.progressPace} />] : []),
          teacherLabel(course),
          course.endDate || "N/A",
          course.remainingDays || "N/A",
          ...(detailed
            ? [course.pendingAssignment ?? "N/A", <ProgressBar key="pg" value={course.progressGradable} />, <ProgressBar key="pa" value={course.progressAllActivity} />]
            : []),
        ];
        return { key: course.lmsEnrollmentId || `${course.courseName}-${index}`, cells };
      });

  const retryButton = failed && !sessionOut && (
    <button type="button" onClick={retry} className="ml-3 rounded border border-primary px-3 py-1 text-primary">
      Try again
    </button>
  );

  return (
    <div className="w-full">
      <div className="rounded-[10px] border border-slate-200 bg-white py-4">
        <h1 className="mb-3 ml-4 text-xl font-bold text-black sm:ml-5">Academic Performance</h1>

        {/* Phone: one card per course (column title beside each value) instead of a wide table. */}
        <div className="md:hidden">
          {message ? (
            <p className="border-t border-slate-200 py-8 text-center text-sm text-black/50">
              {message}
              {retryButton}
            </p>
          ) : (
            <ul className="space-y-3 px-4">
              {records.map((record) => (
                <li key={record.key}>
                  <ParentMobileTableCard rows={headers.map((label, i) => ({ label, value: record.cells[i] }))} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full whitespace-nowrap text-left text-sm text-black">
            <thead className="bg-primary text-white">
              <tr>
                {headers.map((header, index) => (
                  <th key={header} className={`py-3 pr-3 font-normal ${index === 0 ? "pl-5" : "pl-3"}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {message ? (
                <tr>
                  <td colSpan={headers.length} className="py-8 text-center text-black/50">
                    {message}
                    {retryButton}
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.key} className="border-b border-slate-200">
                    {record.cells.map((cell, i) => (
                      <td key={headers[i]} className={i === 0 ? "py-3 pl-5 pr-3" : "px-3 py-3"}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!message && <ParentTableFooter page={page} pageSize={PAGE_SIZE} total={courses.length} onPageChange={setPage} />}
      </div>

      {selected && selected.studentUserId === String(selectedChild?.userId) && (
        <ParentProgressDetailModal course={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

export function ParentAcademicPerformance() {
  return (
    <ParentChildRequired>
      <PerformanceBody />
    </ParentChildRequired>
  );
}
