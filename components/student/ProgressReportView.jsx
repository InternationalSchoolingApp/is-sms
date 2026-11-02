"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Landmark } from "lucide-react";
import { differenceInCalendarDays, format, isValid, parse } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentGradebookReport } from "@/hooks/useStudentGradebookReport";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import { MobileTableCard } from "@/components/student/MobileTableCard";

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
const assetUrl = (file) => `${resolveBackendOrigin()}/static/theme2/images/${file}`;

// Legacy item.colorScoreText is a Bootstrap class pair.
const SCORE_CLASS = {
  "bg-danger text-white": "bg-[#dc3545] text-white",
  "bg-warning text-white": "bg-[#ffc107] text-white",
};

const GRADING_SYSTEM = [
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

/** Splits a row's playloadUrl (.../get-user-gradebook/{uniqueId}?payload=base64) into its parts. */
function parseReportUrl(url) {
  try {
    const parsed = new URL(url);
    const payload = parsed.searchParams.get("payload");
    return { uniqueId: parsed.pathname.split("/").pop(), params: JSON.parse(decodeURI(atob(payload))) };
  } catch {
    return { uniqueId: null, params: null };
  }
}

// Backend dates are mm-dd-yyyy; the DatePicker works with Date objects.
const BACKEND_DATE = "MM-dd-yyyy";
const toDate = (value) => {
  const parsed = value ? parse(value, BACKEND_DATE, new Date()) : null;
  return parsed && isValid(parsed) ? parsed : undefined;
};
const orNA = (value) => (value === undefined || value === null || value === "" ? "N/A" : value);

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
              // eslint-disable-next-line @next/next/no-img-element -- school logo from settings
              <img src={logoUrl} alt="School logo" className="mb-6 w-full max-w-[300px]" />
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
 * Progress Reports "View" — legacy get-user-gradebook page (GradebookSummaryHTML.jsp)
 * rendered from its JSON (format=json). Date search re-fetches the same endpoint with
 * new dates, like legacy callDateWiseGradebokSummary.
 */
export function ProgressReportView({ url, onBack }) {
  const { context, logoUrl } = useDashboardContext();
  const schoolUUID = context?.schoolUUID;
  const dummy = useDummyStudent();
  // Dummy-mode rows link to "dummy-student-progress-report://n" (no backend payload): start from that
  // report's own week, like the real payload's startdate/enddate.
  const dummyUrl = dummy.enabled && dummy.student?.isProgressReportUrl(url) ? url : null;
  const { uniqueId, params: initialParams } = useMemo(() => {
    if (!dummyUrl) return parseReportUrl(url);
    const report = dummy.student.progressReport(dummyUrl);
    return { uniqueId: "dummy", params: { data: "dummy", startdate: report.startdate, enddate: report.enddate, subReportType: report.subReportType } };
  }, [url, dummyUrl, dummy.student]);
  const [params, setParams] = useState(initialParams);
  const [startdate, setStartdate] = useState(() => toDate(initialParams?.startdate));
  const [enddate, setEnddate] = useState(() => toDate(initialParams?.enddate));
  const [error, setError] = useState("");
  const { isLoading, report } = useStudentGradebookReport({ schoolUUID, uniqueId, params, dummyUrl });

  const enrollments = Array.isArray(report?.gradebookEnroll)
    ? report.gradebookEnroll.filter((enrollment) => enrollment.grades?.items?.item?.length)
    : [];
  const unsupported = report && ["40", "41"].includes(String(report.lmsProId));

  function search() {
    if (!startdate && !enddate) return setError("Please select report start date and end date");
    if (!startdate || !enddate || startdate > enddate) return setError("Please select start date must be less then end date");
    setError("");
    // Legacy get-user-gradebook-content: a 7-day range is a weekly report (shows Current Week Percentage).
    const days = differenceInCalendarDays(enddate, startdate) + 1;
    setParams({
      ...params,
      startdate: format(startdate, BACKEND_DATE),
      enddate: format(enddate, BACKEND_DATE),
      subReportType: days === 7 ? "weekly" : "",
    });
  }

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
            <a
              href={report.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto flex h-10 items-center rounded-md bg-[#17a2b8] px-5 cursor-pointer text-sm text-white"
            >
              Download
            </a>
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
        ) : unsupported ? (
          <p className="py-8 text-center font-bold">This report type is not available here yet.</p>
        ) : (
          <>
            {enrollments.map((enrollment) => (
              <EnrollmentReport key={enrollment.id} enrollment={enrollment} report={report} logoUrl={logoUrl} />
            ))}

            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- legacy backend asset */}
              <img src={assetUrl("repost-bottom-graphic.png")} alt="" className="w-full max-w-[300px]" />
              <div className="w-full text-right sm:w-auto">
                <div className="relative inline-block pr-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- legacy backend asset */}
                  <img src={assetUrl("is-stamp.png")} alt="School stamp" className="w-full max-w-[100px]" />
                  {/* eslint-disable-next-line @next/next/no-img-element -- legacy backend asset */}
                  <img
                    src={assetUrl("signature-report.png")}
                    alt="Signature"
                    className="absolute -bottom-[30px] -left-[30px] w-full max-w-[100px]"
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
