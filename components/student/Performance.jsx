"use client";

import { useMemo, useState } from "react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentAcademicPerformance } from "@/hooks/useStudentAcademicPerformance";
import { K5Performance } from "@/components/k5/pages/K5Performance";
import { PerformanceProgressModal } from "@/components/student/PerformanceProgressModal";
import { TableFooter } from "@/components/student/TableFooter";
import { MobileTableCard } from "@/components/student/MobileTableCard";
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import { OptimizedImage } from "@/components/common/OptimizedImage";

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
      <OptimizedImage src={assetUrl(pace.image)} alt={pace.label} width={pace.size} height={pace.size} className="object-contain" />
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
  const { context, isK5 } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  // Every student asks for the new My Performance page; the backend builds it for the Agilix Buzz providers.
  const { isLoading, courses, courseProviderId, performance } = useStudentAcademicPerformance({ schoolUUID, userId, k5Performance: true });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  const detailed = DETAILED_PROVIDERS.includes(parseInt(courseProviderId, 10));
  const pageRows = useMemo(() => courses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [courses, page]);

  // K–5: the playful look. Middle / High school: the same page in the regular dashboard look (like My Profile).
  // Other providers have no daily synced course data, so they keep the table below.
  const loading = !context || isLoading;
  if (isK5 || performance || loading) {
    const page = <K5Performance isLoading={loading} performance={performance} courseProviderId={courseProviderId} plain={!isK5} />;
    return isK5 ? page : <div className="theme-profile-plain k5-perf-plain">{page}</div>;
  }

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

  const status = isLoading ? "Loading…" : courses.length === 0 ? "No academic performance found" : null;
  // One record per course: its cells in the order of `headers`, shared by the table and the phone cards.
  const records = pageRows.map((course) => {
    // Names that already carry a title (dummy-mode teachers: "Ms. Olivia Parker") keep it as is.
    const hasTitle = /^(Mr|Mrs|Ms|Miss|Dr)\.?\s/i.test(course.teacherName || "");
    const teacher = [hasTitle ? "" : salutation(course.teacherGender), course.teacherName || "N/A"].filter(Boolean).join(" ");
    const name =
      detailed && course.lmsEnrollmentId && course.lmsCourseId ? (
        <button type="button" onClick={() => setSelected({ ...course, studentUserId: userId })} className="text-primary hover:underline">
          {course.courseName || "N/A"}
        </button>
      ) : (
        course.courseName || "N/A"
      );
    const cells = [
      name,
      formatPercent(course.score),
      ...(detailed ? [<Pace key="pace" value={course.progressPace} />] : []),
      teacher,
      course.endDate || "N/A",
      course.remainingDays || "N/A",
      ...(detailed
        ? [course.pendingAssignment ?? "N/A", <ProgressBar key="pg" value={course.progressGradable} />, <ProgressBar key="pa" value={course.progressAllActivity} />]
        : []),
    ];
    return { key: course.lmsEnrollmentId || course.courseName, cells };
  });

  return (
    <div className="w-full">
      <div className="rounded-[10px] border border-slate-200 bg-white py-4">
        <h4 className="mb-3 ml-5 text-xl font-bold text-black">Academic Performance</h4>

        {/* Mobile: one card per course (column title beside each value) instead of a wide table. */}
        <div className="md:hidden">
          {status ? (
            <p className="border-t border-slate-200 py-8 text-center text-sm text-black/50">{status}</p>
          ) : (
            <ul className="space-y-3 px-4">
              {records.map((record) => (
                <li key={record.key}>
                  <MobileTableCard rows={headers.map((label, i) => ({ label, value: record.cells[i] }))} />
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
              {status ? (
                <tr>
                  <td colSpan={headers.length} className="py-8 text-center text-black/50">
                    {status}
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

        {!isLoading && courses.length > 0 && (
          <TableFooter page={page} pageSize={PAGE_SIZE} total={courses.length} onPageChange={setPage} />
        )}
      </div>

      {selected && <PerformanceProgressModal course={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
