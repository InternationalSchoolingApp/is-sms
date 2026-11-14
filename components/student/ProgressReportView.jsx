"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, CalendarDays, Landmark } from "lucide-react";
import { differenceInCalendarDays, format, isValid, parse } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentGradebookReport } from "@/hooks/useStudentGradebookReport";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import { MobileTableCard } from "@/components/student/MobileTableCard";
import { courseWareCourses, courseWareItems, courseWareLayout, cwText, isCourseWare } from "@/utils/courseWareReport";
import { OptimizedImage } from "@/components/common/OptimizedImage";

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
export const assetUrl = (file) => `${resolveBackendOrigin()}/static/theme2/images/${file}`;

// Legacy item.colorScoreText is a Bootstrap class pair.
const SCORE_CLASS = {
  "bg-danger text-white": "bg-[#dc3545] text-white",
  "bg-warning text-white": "bg-[#ffc107] text-white",
};

export const GRADING_SYSTEM = [
  ["A+", "96-100"],
  ["A", "93-95"],
  ["A-", "89-92"],
  ["B+", "86-88"],
  ["B", "83-85"],
  ["B-", "79-82"],
  ["C+", "76-78"],
  ["C", "73-75"],
  ["C-", "69-72"],
  ["D+", "66-68", "bg-[#ffc107]"],
  ["D", "63-65", "bg-[#ffc107]"],
  ["D-", "60-62", "bg-[#ffc107]"],
  ["F", "Below 60", "bg-[#dc3545] text-white"],
];

/**
 * Splits a row's playloadUrl (.../get-user-gradebook/{uniqueId}?payload=...) into its parts. The list API sends the
 * payload encrypted, so it is kept as it is (rawPayload) and passed back to the backend, which decrypts it; an older
 * plain base64 JSON payload is read into params.
 */
function parseReportUrl(url) {
  try {
    const parsed = new URL(url, "http://localhost");
    const rawPayload = parsed.searchParams.get("payload") || "";
    const uniqueId = parsed.pathname.split("/").pop();
    let params = null;
    try {
      params = JSON.parse(decodeURI(atob(rawPayload)));
    } catch {
      params = null;
    }
    return { uniqueId, params: params?.data ? params : null, rawPayload: params?.data ? "" : rawPayload };
  } catch {
    return { uniqueId: null, params: null, rawPayload: "" };
  }
}

// Backend dates are mm-dd-yyyy; the DatePicker works with Date objects.
const BACKEND_DATE = "MM-dd-yyyy";
const toDate = (value) => {
  const parsed = value ? parse(value, BACKEND_DATE, new Date()) : null;
  return parsed && isValid(parsed) ? parsed : undefined;
};
export const orNA = (value) => (value === undefined || value === null || value === "" ? "N/A" : value);

function DetailRows({ rows }) {
  return (
    <table className="w-full border border-[#6fb0f1] text-left text-sm">
      <tbody>
        {rows.map(([label, value], index) => (
          <tr key={label} className={index % 2 ? "bg-white" : "bg-[#f5fafc]"}>
            <td className="border border-[#6fb0f1] px-2 py-2">
              <span className="font-bold">{label}: </span>
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Canvas (40) / Courseware (41) report of one course (legacy CanvasReport.jsp / CoursewareReport.jsp). */
function CourseWareReport({ course, report, logoUrl, layout }) {
  const items = courseWareItems(course);
  const head = ["Sr.no", "Type", "Activity Name", layout.showDates && "Target Due Date", layout.showDates && "Submitted Date", "Percentage", "Grade"].filter(Boolean);
  return (
    <div className="mb-6">
      <div className="bg-[#fafdff] p-3">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            {logoUrl && (
              <OptimizedImage src={logoUrl} alt="School logo" width={300} height={80} sizes="(max-width: 768px) 100vw, 300px" className="mb-6 h-auto w-full max-w-[300px]" />
            )}
            <DetailRows rows={[["Student Name", report.studentName], ["Grade", report.standardName], ["Course", cwText(course.courseName)]]} />
          </div>
          <div className="space-y-4">
            <DetailRows rows={[["Academic Year Start Date", cwText(course.academicYearStartDate)], ["Academic Year End Date", cwText(course.academicYearEndDate)]]} />
            <DetailRows rows={[["Student ID", report.rollNumber], ["Country", report.country], ["Teacher Name", cwText(course.teacherName)]]} />
          </div>
        </div>
        <div className="mt-2 text-center">
          <h3 className="text-lg font-bold uppercase text-[#007fff] sm:text-[30px] sm:leading-tight">Detailed Student Grading Report</h3>
          <h4 className="text-base font-bold uppercase sm:text-2xl">
            Duration: {report.reportStartDate} - {report.reportEndDate}
          </h4>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border border-[#6fb0f1] text-center text-sm">
          <thead>
            <tr>
              {head.map((label) => (
                <th key={label} className="border border-[#6fb0f1] p-1 align-middle">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={head.length} className="border border-[#cdcdcd] p-4 text-black/60">
                  No activities in this period.
                </td>
              </tr>
            )}
            {items.map((item, index) => {
              const scoreClass = SCORE_CLASS[item.colorScoreText] ?? "";
              return (
                <tr key={index} className={index % 2 ? "bg-white" : "bg-[#f5fafc]"}>
                  <td className="border border-[#cdcdcd] p-2">{index + 1}</td>
                  <td className="border border-[#cdcdcd] p-2">{item.type}</td>
                  <td className="border border-[#cdcdcd] p-2 text-left">{item.activityName}</td>
                  {layout.showDates && <td className="border border-[#cdcdcd] p-2">{cwText(item.dueDate)}</td>}
                  {layout.showDates && <td className="border border-[#cdcdcd] p-2">{cwText(item.submittedDate)}</td>}
                  <td className={`border border-[#cdcdcd] p-2 ${scoreClass}`}>{cwText(item.percentage)}</td>
                  <td className={`border border-[#cdcdcd] p-2 ${scoreClass}`}>{cwText(item.gradeLetter)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-left font-bold">*N/A - Not Available</p>

      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
        {layout.showCounters ? (
          <table className="w-full border border-[#6fb0f1] text-center text-sm sm:text-lg">
            <tbody>
              {[
                ["Number of Activities - Submitted & Graded", course.submitGradedActivityCount],
                ["Number of Activities - Waiting for the Grade", course.waitingforGradeCount],
                ["Number of Activities - Not Submitted", course.notSubmittedActivityCount],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="border border-[#6fb0f1] p-2">
                    {label}: <b>{cwText(value)}</b>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="border border-[#6fb0f1] p-2">
                  Last Submission Date: <b>{cwText(course.lastSubmiteDate)}</b> | Activity Name: <b>{cwText(course.lastSubmitActivityName)}</b>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div />
        )}
        <table className="h-fit w-full border border-[#6fb0f1] text-left text-sm sm:text-base md:w-auto">
          <tbody>
            {[
              ["Course Grade", course.courseGrade],
              ["Current Overall Percentage", course.currentOverallPercentage],
            ].map(([label, value], index) => (
              <tr key={label} className={index % 2 ? "bg-white" : "bg-[#f5fafc]"}>
                <td className="border border-[#6fb0f1] p-2 text-right font-bold">{label}:</td>
                <td className="border border-[#6fb0f1] p-2">{cwText(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-1">
        <div className="-skew-x-[30deg] border-b-2 border-dashed border-[#91c8ff]" />
        <div className="-skew-x-[30deg] border-b-2 border-dashed border-[#91c8ff]" />
      </div>
    </div>
  );
}

function EnrollmentReport({ enrollment, report, logoUrl }) {
  const grades = enrollment.grades ?? {};
  const items = (grades.items?.item ?? []).filter((item) => item.unitTitle);
  const showModule = !grades.unitStatus;

  return (
    <div className="mb-6">
      <div className="bg-[#fafdff] p-3">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            {logoUrl && (
              <OptimizedImage src={logoUrl} alt="School logo" width={300} height={80} sizes="(max-width: 768px) 100vw, 300px" className="mb-6 h-auto w-full max-w-[300px]" />
            )}
            <DetailRows
              rows={[
                ["Student Name", report.studentName],
                ["Grade", report.standardName],
                ["Course", enrollment.entity?.title],
              ]}
            />
          </div>
          <div className="space-y-4">
            <DetailRows
              rows={[
                ["Academic Year Start Date", enrollment.startdate],
                ["Academic Year End Date", enrollment.enddate],
              ]}
            />
            <DetailRows
              rows={[
                ["Student ID", report.rollNumber],
                ["Country", report.country],
                ["Teacher Name", orNA(enrollment.teacherName)],
              ]}
            />
          </div>
        </div>
        <div className="mt-2 text-center">
          <h3 className="text-lg font-bold uppercase text-[#007fff] sm:text-[30px] sm:leading-tight">
            Detailed Student Grading Report
          </h3>
          <h4 className="text-base font-bold uppercase sm:text-2xl">
            Duration: {report.reportStartDate} - {report.reportEndDate}
          </h4>
        </div>
      </div>

      {/* Mobile: one card per activity (column title beside each value) instead of the 8-column table. */}
      <ul className="mt-4 space-y-3 md:hidden">
        {items.map((item, index) => {
          const scoreClass = SCORE_CLASS[item.colorScoreText] ?? "";
          return (
            <li key={item.itemid || index}>
              <MobileTableCard
                labelClassName="bg-[#f5fafc] font-semibold text-black"
                rows={[
                  showModule && { label: "Module | Activity", value: item.unit },
                  { label: "Type", value: item.unitType },
                  { label: "Activity Name", value: item.unitTitle },
                  { label: "Time Spent (hh:mm:ss)", value: orNA(item.unitTimeSpent) },
                  { label: "Target Due Date", value: orNA(item.duedate) },
                  { label: "Submitted Date (hh:mm:ss)", value: orNA(item.submitteddate) },
                  { label: "Percentage", value: orNA(item.unitPercent), className: scoreClass },
                  { label: "Grade", value: orNA(item.letter), className: scoreClass },
                ].filter(Boolean)}
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] border border-[#6fb0f1] text-center text-sm">
          <thead>
            <tr>
              {showModule && (
                <th className="border border-[#6fb0f1] p-1 align-middle">
                  Module | <span className="text-[#17a2b8]">Activity</span>
                </th>
              )}
              <th className="border border-[#6fb0f1] p-1 align-middle">Type</th>
              <th className="border border-[#6fb0f1] p-1 align-middle">Activity Name</th>
              <th className="border border-[#6fb0f1] p-1 align-middle">
                Time Spent
                <br />
                (hh:mm:ss)
              </th>
              <th className="border border-[#6fb0f1] p-1 align-middle">Target Due Date</th>
              <th className="border border-[#6fb0f1] p-1 align-middle">
                Submitted Date
                <br />
                (hh:mm:ss)
              </th>
              <th className="border border-[#6fb0f1] p-1 align-middle">Percentage</th>
              <th className="border border-[#6fb0f1] p-1 align-middle">Grade</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const scoreClass = SCORE_CLASS[item.colorScoreText] ?? "";
              return (
                <tr key={item.itemid || index} className={index % 2 ? "bg-white" : "bg-[#f5fafc]"}>
                  {showModule && <td className="border border-[#cdcdcd] p-2">{item.unit}</td>}
                  <td className="border border-[#cdcdcd] p-2">{item.unitType}</td>
                  <td className="border border-[#cdcdcd] p-2 text-left">{item.unitTitle}</td>
                  <td className="border border-[#cdcdcd] p-2">{orNA(item.unitTimeSpent)}</td>
                  <td className="border border-[#cdcdcd] p-2">{orNA(item.duedate)}</td>
                  <td className="border border-[#cdcdcd] p-2">{orNA(item.submitteddate)}</td>
                  <td className={`border border-[#cdcdcd] p-2 ${scoreClass}`}>{orNA(item.unitPercent)}</td>
                  <td className={`border border-[#cdcdcd] p-2 ${scoreClass}`}>{orNA(item.letter)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-left font-bold">*N/A - Not Available</p>

      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
        <table className="w-full border border-[#6fb0f1] text-center text-sm sm:text-lg">
          <tbody>
            {[
              ["Total Activity Time", orNA(grades.totalDays)],
              ["Number of Activities - Submitted & Graded", grades.submiteActivityGrade],
              ["Number of Activities - Waiting for the Grade", grades.activityWaitingForGrade],
              ["Number of Activities - Not Submitted", grades.activityNotSubmited],
            ].map(([label, value]) => (
              <tr key={label}>
                <td className="border border-[#6fb0f1] p-2">
                  {label}: <b>{value}</b>
                </td>
              </tr>
            ))}
            <tr>
              <td className="border border-[#6fb0f1] p-2">
                Last Submission Date: <b>{orNA(grades.lastSubmissionDate)}</b> | Activity Name:{" "}
                <b>{orNA(grades.lastsubmissionName)}</b>
              </td>
            </tr>
          </tbody>
        </table>
        <table className="h-fit w-full border border-[#6fb0f1] text-left text-sm sm:text-base md:w-auto">
          <tbody>
            {[
              ["Course Grade", grades.letter],
              ["Current Overall Percentage", grades.percentage],
              report.subReportType === "weekly" && ["Current Week Percentage", grades.percentWeekly],
              ["Course Completion Percentage", grades.complete],
            ]
              .filter(Boolean)
              .map(([label, value], index) => (
                <tr key={label} className={index % 2 ? "bg-white" : "bg-[#f5fafc]"}>
                  <td className="border border-[#6fb0f1] p-2 text-right font-bold">{label}:</td>
                  <td className="border border-[#6fb0f1] p-2">{value}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-1">
        <div className="-skew-x-[30deg] border-b-2 border-dashed border-[#91c8ff]" />
        <div className="-skew-x-[30deg] border-b-2 border-dashed border-[#91c8ff]" />
      </div>
    </div>
  );
}

/**
 * State of one opened report (shared by the regular and the K–5 view): the row's payload, the date pickers and the
 * date search that re-fetches the same endpoint with new dates, like legacy callDateWiseGradebokSummary.
 */
export function useProgressReport(url) {
  const { context } = useDashboardContext();
  const schoolUUID = context?.schoolUUID;
  const dummy = useDummyStudent();
  // Dummy-mode rows link to "dummy-student-progress-report://n" (no backend payload): start from that
  // report's own week, like the real payload's startdate/enddate.
  const dummyUrl = dummy.enabled && dummy.student?.isProgressReportUrl(url) ? url : null;
  const { uniqueId, params: initialParams, rawPayload } = useMemo(() => {
    if (!dummyUrl) return parseReportUrl(url);
    const report = dummy.student.progressReport(dummyUrl);
    return { uniqueId: "dummy", rawPayload: "", params: { data: "dummy", startdate: report.startdate, enddate: report.enddate, subReportType: report.subReportType } };
  }, [url, dummyUrl, dummy.student]);
  const [params, setParams] = useState(initialParams);
  // Until the student picks dates, the pickers show the report's own range (from the payload or the first answer).
  const [pickedStart, setStartdate] = useState(() => toDate(initialParams?.startdate));
  const [pickedEnd, setEnddate] = useState(() => toDate(initialParams?.enddate));
  const [error, setError] = useState("");
  const { isLoading, report } = useStudentGradebookReport({ schoolUUID, uniqueId, params, rawPayload, dummyUrl });
  const startdate = pickedStart ?? toDate(report?.startdate);
  const enddate = pickedEnd ?? toDate(report?.enddate);

  const enrollments = Array.isArray(report?.gradebookEnroll)
    ? report.gradebookEnroll.filter((enrollment) => enrollment.grades?.items?.item?.length)
    : [];
  // Canvas / Courseware answer with courseWareReport instead of the gradebook list.
  const courseWare = isCourseWare(report);

  function search() {
    if (!startdate && !enddate) return setError("Please select report start date and end date");
    if (!startdate || !enddate || startdate > enddate) return setError("Please select start date must be less then end date");
    const data = params?.data || report?.data;
    if (!data) return setError("Please open the report again from the list.");
    setError("");
    // Keep the searched range in the pickers even if the next answer fails.
    setStartdate(startdate);
    setEnddate(enddate);
    // Legacy get-user-gradebook-content: a 7-day range is a weekly report (shows Current Week Percentage).
    const days = differenceInCalendarDays(enddate, startdate) + 1;
    setParams({
      ...params,
      data,
      startdate: format(startdate, BACKEND_DATE),
      enddate: format(enddate, BACKEND_DATE),
      subReportType: days === 7 ? "weekly" : "",
    });
  }

  return { isLoading, report, startdate, enddate, setStartdate, setEnddate, search, error, enrollments, courseWare };
}

/** "…/send-mail-student-get-user-gradebook/<id>?payload=…" -> "?payload=…" (only the payload goes to our route). */
function downloadQuery(link) {
  try {
    return new URL(link, "http://localhost").search;
  } catch {
    return link.includes("?") ? link.slice(link.indexOf("?")) : "";
  }
}

/** 'attachment; filename="X.pdf"' -> "X.pdf". */
function fileNameOf(disposition) {
  const m = /filename="?([^";]+)"?/i.exec(disposition || "");
  return m ? m[1] : "progress-report.pdf";
}

/**
 * Download of the opened report. The backend builds the PDF on request, which takes up to a minute, so the page
 * fetches it through /api/performance/progress-report-pdf (opened with the user's token) and shows "Preparing…"
 * until it arrives, instead of a bare link that gives no sign anything is happening.
 * design "k5" asks the backend for the K–5 look of the PDF (GradebookSummaryK5HTML.jsp).
 */
export function useReportDownload(link, design) {
  const [preparing, setPreparing] = useState(false);

  const download = async () => {
    const query = link ? downloadQuery(link) : "";
    if (!query || preparing) return;
    setPreparing(true);
    try {
      const designQuery = design === "k5" ? "&design=k5" : "";
      const response = await fetch(`/api/performance/progress-report-pdf${query}${designQuery}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "The report could not be downloaded. Please try again.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameOf(response.headers.get("content-disposition"));
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast.error(e?.message || "The report could not be downloaded. Please try again.");
    } finally {
      setPreparing(false);
    }
  };

  return { preparing, download };
}

/**
 * Progress Reports "View" — legacy get-user-gradebook page (GradebookSummaryHTML.jsp)
 * rendered from its JSON (format=json).
 */
export function ProgressReportView({ url, onBack }) {
  const { logoUrl } = useDashboardContext();
  const { isLoading, report, startdate, enddate, setStartdate, setEnddate, search, error, enrollments, courseWare } = useProgressReport(url);
  const { preparing, download } = useReportDownload(report?.downloadUrl);

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      </div>

      <div className="mb-3 flex items-center gap-3 rounded-[10px] bg-white px-4 py-3">
        <Landmark className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="text-black">Grade book summary | {report?.studentName ?? ""}</span>
      </div>

      <div className="mb-3 rounded-[10px] border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-52">
            <DatePicker icon={CalendarDays} label="Due Start Date" value={startdate} onChange={setStartdate} height="h-10" />
          </div>
          <div className="w-full sm:w-52">
            <DatePicker icon={CalendarDays} label="Due End Date" value={enddate} onChange={setEnddate} height="h-10" />
          </div>
          <button type="button" onClick={search} className="flex h-10 items-center cursor-pointer rounded-md bg-[#28a745] px-5 text-sm text-white">
            Search
          </button>
          {report?.downloadUrl && (
            <button
              type="button"
              onClick={download}
              disabled={preparing}
              aria-busy={preparing}
              className="ml-auto flex h-10 items-center rounded-md bg-[#17a2b8] px-5 cursor-pointer text-sm text-white disabled:cursor-wait disabled:opacity-70"
            >
              {preparing ? "Preparing…" : "Download"}
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-[10px] border border-slate-200 bg-white p-3 text-black sm:p-4">
        {isLoading ? (
          <p className="py-8 text-center text-black/50">Loading…</p>
        ) : !report || report.status !== "SUCCESS" ? (
          <p className="py-8 text-center font-bold">{report?.reportMessage || "Unable to load progress report detail."}</p>
        ) : report.reportMessage ? (
          <p className="py-8 text-center font-bold">{report.reportMessage}</p>
        ) : (
          <>
            {courseWare
              ? courseWareCourses(report).map((course, index) => (
                  <CourseWareReport key={index} course={course} report={report} logoUrl={logoUrl} layout={courseWareLayout(report)} />
                ))
              : enrollments.map((enrollment) => <EnrollmentReport key={enrollment.id} enrollment={enrollment} report={report} logoUrl={logoUrl} />)}
            {courseWare && courseWareCourses(report).length === 0 && <p className="py-8 text-center font-bold">No activities in this period.</p>}

            <div className="flex flex-wrap items-start justify-between gap-4">
              <OptimizedImage src={assetUrl("repost-bottom-graphic.png")} alt="" width={300} height={100} className="h-auto w-full max-w-[300px]" />
              <div className="w-full text-right sm:w-auto">
                <div className="relative inline-block pr-2">
                  <OptimizedImage src={assetUrl("is-stamp.png")} alt="School stamp" width={100} height={100} className="h-auto w-full max-w-[100px]" />
                  <OptimizedImage
                    src={assetUrl("signature-report.png")}
                    alt="Signature"
                    width={100}
                    height={100}
                    className="absolute -bottom-[30px] -left-[30px] h-auto w-full max-w-[100px]"
                  />
                </div>
                <p className="mt-2">School Official</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="ml-auto w-full min-w-[420px] max-w-[600px] border-collapse text-center text-[10px]">
                    <tbody>
                      <tr>
                        <td colSpan={GRADING_SYSTEM.length + 1} className="border border-[#71c4c1] p-0.5 text-[13px] font-bold">
                          GRADING SYSTEM
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-[#71c4c1] p-0.5">Grade</td>
                        {GRADING_SYSTEM.map(([grade, , className]) => (
                          <td key={grade} className={`border border-[#71c4c1] p-0.5 ${className ?? ""}`}>
                            {grade}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="border border-[#71c4c1] p-0.5">Percentage</td>
                        {GRADING_SYSTEM.map(([grade, range, className]) => (
                          <td key={grade} className={`border border-[#71c4c1] p-0.5 ${className ?? ""}`}>
                            {range}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
