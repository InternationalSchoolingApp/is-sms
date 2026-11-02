"use client";

import { useMemo, useState } from "react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentAcademicPerformance } from "@/hooks/useStudentAcademicPerformance";
import { PerformanceProgressModal } from "@/components/student/PerformanceProgressModal";
import { TableFooter } from "@/components/student/TableFooter";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

const PAGE_SIZE = 10;

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
const IMAGES = "static/theme2/images/";
const assetUrl = (file) => `${resolveBackendOrigin()}/${IMAGES}${file}`;

// Agilix Buzz providers — only these get Pace / Pending / Progress columns and the course link
// (legacy getStudentAcademicPerformanceSupportsDetailedView).
const DETAILED_PROVIDERS = [36, 37, 38];

// Legacy getStudentAcademicPerformancePaceHtml.
const PACE = {
  Ahead: { label: "Ahead", className: "text-green-600", image: "forward.gif", size: 27 },
  OnTrack: { label: "On Track", className: "text-primary", image: "still.png", size: 24 },
  Behind: { label: "Behind", className: "text-red-600", image: "behind.gif", size: 24 },
  GettingStarted: { label: "Get Started", className: "text-primary", image: "still.png", size: 24 },
};

// Legacy getSalutationByGender.
function salutation(gender) {
  const normalized = String(gender ?? "").trim().toLowerCase();
  if (normalized === "male") return "Mr.";
  if (normalized === "female") return "Ms.";
  return "";
}

function formatPercent(value) {
  const percent = parseFloat(value || 0);
  return Number.isNaN(percent) ? "N/A" : `${percent.toFixed(2)}%`;
}

function Pace({ value }) {
  const pace = PACE[value] ?? { label: value || "N/A", className: "text-black", image: "still.png", size: 24 };
  return (
    <div className={`flex items-center ${pace.className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- legacy backend asset */}
      <img src={assetUrl(pace.image)} alt={pace.label} width={pace.size} height={pace.size} className="object-contain" />
      <span className="ml-2">{pace.label}</span>
    </div>
  );
}

// Legacy getStudentAcademicPerformanceProgressHtml.
function ProgressBar({ value }) {
  const progress = Math.min(100, Math.max(0, parseFloat(value || 0) || 0));
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
 * Performance ("My Performance") — legacy studentAcademicPerformance.js +
 * studentAcademicPerformanceContent.js ("Academic Performance" DataTable).
 * Rows are only populated for Agilix Buzz LMS course providers; other
 * providers show the empty state (not an error).
 */
export function Performance() {
  const { context } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const { isLoading, courses, courseProviderId } = useStudentAcademicPerformance({ schoolUUID, userId });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  const detailed = DETAILED_PROVIDERS.includes(parseInt(courseProviderId, 10));
  const pageRows = useMemo(() => courses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [courses, page]);

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

  return (
    <div className="w-full">
      <div className="rounded-[10px] border border-slate-200 bg-white py-4">
        <h4 className="mb-3 ml-5 text-xl font-bold text-black">Academic Performance</h4>

        <div className="overflow-x-auto">
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
              {isLoading ? (
                <tr>
                  <td colSpan={headers.length} className="py-8 text-center text-black/50">
                    Loading…
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="py-8 text-center text-black/50">
                    No academic performance found
                  </td>
                </tr>
              ) : (
                pageRows.map((course) => {
                  // Names that already carry a title (dummy-mode teachers: "Ms. Olivia Parker") keep it as is.
                  const hasTitle = /^(Mr|Mrs|Ms|Miss|Dr)\.?\s/i.test(course.teacherName || "");
                  const teacher = [hasTitle ? "" : salutation(course.teacherGender), course.teacherName || "N/A"].filter(Boolean).join(" ");
                  return (
                    <tr key={course.lmsEnrollmentId || course.courseName} className="border-b border-slate-200">
                      <td className="py-3 pl-5 pr-3">
                        {detailed && course.lmsEnrollmentId && course.lmsCourseId ? (
                          <button
                            type="button"
                            onClick={() => setSelected({ ...course, studentUserId: userId })}
                            className="text-primary hover:underline"
                          >
                            {course.courseName || "N/A"}
                          </button>
                        ) : (
                          course.courseName || "N/A"
                        )}
                      </td>
                      <td className="px-3 py-3">{formatPercent(course.score)}</td>
                      {detailed && (
                        <td className="px-3 py-3">
                          <Pace value={course.progressPace} />
                        </td>
                      )}
                      <td className="px-3 py-3">{teacher}</td>
                      <td className="px-3 py-3">{course.endDate || "N/A"}</td>
                      <td className="px-3 py-3">{course.remainingDays || "N/A"}</td>
                      {detailed && <td className="px-3 py-3">{course.pendingAssignment ?? "N/A"}</td>}
                      {detailed && (
                        <td className="px-3 py-3">
                          <ProgressBar value={course.progressGradable} />
                        </td>
                      )}
                      {detailed && (
                        <td className="px-3 py-3">
                          <ProgressBar value={course.progressAllActivity} />
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && courses.length > 0 && (
          <TableFooter page={page} pageSize={PAGE_SIZE} total={courses.length} onPageChange={setPage} />
        )}
      </div>

      {selected && <PerformanceProgressModal course={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
