"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CalendarDays } from "lucide-react";
import { differenceInCalendarDays, format, isValid, parse } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useParentGradebookReport } from "@/hooks/parent/useParentGradebookReport";
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import { parseReportUrl } from "@/components/parent/progress/reportPayload";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import "@/components/parent/progress/progress.css";

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
const assetUrl = (file) => `${resolveBackendOrigin()}/static/theme2/images/${file}`;

// Legacy item.colorScoreText is a Bootstrap class pair.
const SCORE_CLASS = {
  "bg-danger text-white": "rp-bad",
  "bg-warning text-white": "rp-warn",
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
  ["D+", "66-68"],
  ["D", "63-65"],
  ["D-", "60-62"],
  ["F", "Below 60"],
];

// Backend dates are mm-dd-yyyy; the DatePicker works with Date objects.
const BACKEND_DATE = "MM-dd-yyyy";
const toDate = (value) => {
  const parsed = value ? parse(value, BACKEND_DATE, new Date()) : null;
  return parsed && isValid(parsed) ? parsed : undefined;
};
const orNA = (value) => (value === undefined || value === null || value === "" ? "N/A" : value);

const svgProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" };
const DATE_FIELD = "!rounded-xl !border-[1.5px] !border-[color:var(--line)] !bg-[var(--soft)]";

function EnrollmentReport({ enrollment, report }) {
  const grades = enrollment.grades ?? {};
  const items = (grades.items?.item ?? []).filter((item) => item.unitTitle);
  const showModule = !grades.unitStatus;
  const completion = Number.parseFloat(grades.complete);
  const teacher = enrollment.teacherName;

  return (
    <div className="pv-card rp-c" style={{ "--cc": "#027FFE", "--ct": "#E8F3FF" }}>
      <div className="rp-ch">
        <span className="ic">
          <svg width="24" height="24" {...svgProps}>
            <path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z" />
            <path d="M12 6v13.5" />
          </svg>
        </span>
        <div className="t">
          <small>COURSE</small>
          <b>{orNA(enrollment.entity?.title)}</b>
          <span>
            Teacher Name: <strong>{orNA(teacher)}</strong>
          </span>
        </div>
        {report.standardName && (
          <div className="rp-chips">
            <span>{report.standardName}</span>
          </div>
        )}
      </div>
      <h4>DETAILED STUDENT GRADING REPORT</h4>
      <p className="rp-dur">
        DURATION: {report.reportStartDate} - {report.reportEndDate}
      </p>

      <div className="ftw">
        <table className="ftbl rp-t">
          <thead>
            <tr>
              {showModule && <th>Module | Activity</th>}
              <th>Type</th>
              <th>Activity Name</th>
              <th>Time Spent (hh:mm:ss)</th>
              <th>Target Due Date</th>
              <th>Submitted Date (hh:mm:ss)</th>
              <th>Percentage</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const scoreClass = SCORE_CLASS[item.colorScoreText] ?? "";
              return (
                <tr key={item.itemid || index}>
                  {showModule && <td data-l="Module | Activity">{item.unit}</td>}
                  <td data-l="Type">{item.unitType ? <span className="pv-tag">{item.unitType}</span> : "N/A"}</td>
                  <td data-l="Activity Name">{item.unitTitle}</td>
                  <td data-l="Time Spent">
                    <span className="dc-id">{orNA(item.unitTimeSpent)}</span>
                  </td>
                  <td data-l="Target Due Date">{orNA(item.duedate)}</td>
                  <td data-l="Submitted Date">{orNA(item.submitteddate)}</td>
                  <td data-l="Percentage">
                    <b className={`rp-pc ${scoreClass}`}>{orNA(item.unitPercent)}</b>
                  </td>
                  <td data-l="Grade">
                    <span className={`rp-gr ${scoreClass}`}>{orNA(item.letter)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="rp-na">*N/A - Not Available</p>

      <div className="rp-sum">
        <div className="rp-l">
          <p>
            Total Activity Time: <b>{orNA(grades.totalDays)}</b>
          </p>
          <p>
            Number of Activities - Submitted &amp; Graded: <b>{orNA(grades.submiteActivityGrade)}</b>
          </p>
          <p>
            Number of Activities - Waiting for the Grade: <b>{orNA(grades.activityWaitingForGrade)}</b>
          </p>
          <p>
            Number of Activities - Not Submitted: <b>{orNA(grades.activityNotSubmited)}</b>
          </p>
          <p>
            Last Submission Date: <b>{orNA(grades.lastSubmissionDate)}</b> | Activity Name: <b>{orNA(grades.lastsubmissionName)}</b>
          </p>
        </div>
        <div className="rp-r">
          <p>
            Course Grade: <span className="rp-gr big">{orNA(grades.letter)}</span>
          </p>
          <p>
            Current Overall Percentage: <b>{orNA(grades.percentage)}</b>
          </p>
          {report.subReportType === "weekly" && (
            <p>
              Current Week Percentage: <b>{orNA(grades.percentWeekly)}</b>
            </p>
          )}
          <p>
            Course Completion Percentage: <b>{orNA(grades.complete)}</b>
          </p>
          {Number.isFinite(completion) && (
            <i className="rp-bar">
              <i style={{ width: `${Math.max(0, Math.min(100, completion))}%` }} />
            </i>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * State of one opened report: the row's payload, the date pickers and the
 * date search that re-fetches the same endpoint with new dates, like legacy callDateWiseGradebokSummary.
 */
function useProgressReport(url, range) {
  const { params: initialParams, rawPayload } = useMemo(() => parseReportUrl(url), [url]);
  const [params, setParams] = useState(initialParams);
  // Until the student picks dates, the pickers show the report's own range (from the payload or the first answer).
  const [pickedStart, setStartdate] = useState(() => toDate(initialParams?.startdate));
  const [pickedEnd, setEnddate] = useState(() => toDate(initialParams?.enddate));
  const [error, setError] = useState("");
  const { isLoading, report } = useParentGradebookReport({ params, rawPayload, range });
  const startdate = pickedStart ?? toDate(report?.startdate);
  const enddate = pickedEnd ?? toDate(report?.enddate);

  const enrollments = Array.isArray(report?.gradebookEnroll)
    ? report.gradebookEnroll.filter((enrollment) => enrollment.grades?.items?.item?.length)
    : [];
  const unsupported = report && ["40", "41"].includes(String(report.lmsProId));

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

  return { isLoading, report, startdate, enddate, setStartdate, setEnddate, search, error, enrollments, unsupported };
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
 * fetches it through /api/parent/progress-report-pdf (opened with the user's token) and shows "Preparing…"
 * until it arrives, instead of a bare link that gives no sign anything is happening.
 * design "k5" asks the backend for the K–5 look of the PDF (GradebookSummaryK5HTML.jsp).
 */
function useReportDownload(link, design) {
  const [preparing, setPreparing] = useState(false);

  const download = async () => {
    const query = link ? downloadQuery(link) : "";
    if (!query || preparing) return;
    setPreparing(true);
    try {
      const designQuery = design === "k5" ? "&design=k5" : "";
      const response = await fetch(`/api/parent/progress-report-pdf${query}${designQuery}`, { cache: "no-store" });
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
 * Parent > Progress "View" — legacy get-user-gradebook page (GradebookSummaryHTML.jsp) of the selected child
 * rendered from its JSON (format=json). `range` is the list filter the row came from. Download goes through
 * /api/parent/progress-report-pdf, which checks the child belongs to the signed-in parent.
 */
export function ParentProgressReportView({ url, range, onBack }) {
  const { logoUrl } = useDashboardContext();
  const { isLoading, report, startdate, enddate, setStartdate, setEnddate, search, error, enrollments, unsupported } = useProgressReport(url, range);
  const { preparing, download } = useReportDownload(report?.downloadUrl);

  const gradeTone = (index) => (index < 3 ? "ga" : index < 6 ? "gb" : index < 9 ? "gc" : index < 12 ? "gd" : "gf");

  return (
    <section className="sch on" aria-label="Progress report details">
      <div className="rp-top">
        <button type="button" onClick={onBack} className="pv-ibtn" id="rpBack">
          <svg width="18" height="18" {...svgProps}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <h2>Grade book summary | {report?.studentName ?? ""}</h2>
      </div>

      <div className="rp-fil">
        <div className="sc-f rp-dp">
          <DatePicker icon={CalendarDays} label="Due Start Date" value={startdate} onChange={setStartdate} height="h-[42px]" triggerClassName={DATE_FIELD} />
        </div>
        <div className="sc-f rp-dp">
          <DatePicker icon={CalendarDays} label="Due End Date" value={enddate} onChange={setEnddate} height="h-[42px]" triggerClassName={DATE_FIELD} />
        </div>
        <button type="button" onClick={search} className="rp-go">
          Search
        </button>
        {report?.downloadUrl && (
          <button type="button" onClick={download} disabled={preparing} aria-busy={preparing} className="pv-ibtn pri">
            <svg width="18" height="18" {...svgProps}>
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            {preparing ? "Preparing…" : "Download"}
          </button>
        )}
        {error && <p className="pgr-err rp-err">{error}</p>}
      </div>

      {isLoading ? (
        <div className="pv-card rp-msg">
          <p className="pgr-status" role="status">
            Loading…
          </p>
        </div>
      ) : !report || report.status !== "SUCCESS" ? (
        <div className="pv-card rp-msg">
          <p>{report?.reportMessage || "Unable to load progress report detail."}</p>
        </div>
      ) : report.reportMessage ? (
        <div className="pv-card rp-msg">
          <p>{report.reportMessage}</p>
        </div>
      ) : unsupported ? (
        <div className="pv-card rp-msg">
          <p>This report type is not available here yet.</p>
        </div>
      ) : (
        <>
          <div className="pv-card rp-info">
            {logoUrl && (
              <div className="rp-logo">
                <OptimizedImage src={logoUrl} alt="School logo" width={240} height={68} sizes="240px" className="h-[34px] w-auto max-w-full" />
              </div>
            )}
            <div className="rp-2">
              <div className="rp-box">
                <p>
                  <span>Student Name:</span> <b>{orNA(report.studentName)}</b>
                </p>
                <p>
                  <span>Grade:</span> <b>{orNA(report.standardName)}</b>
                </p>
                <p>
                  <span>Student ID:</span> <b className="dc-id">{orNA(report.rollNumber)}</b>
                </p>
              </div>
              <div className="rp-box">
                <p>
                  <span>Country:</span> <b>{orNA(report.country)}</b>
                </p>
                {enrollments[0] && (
                  <>
                    <p>
                      <span>Academic Year Start Date:</span> <b>{orNA(enrollments[0].startdate)}</b>
                    </p>
                    <p>
                      <span>Academic Year End Date:</span> <b>{orNA(enrollments[0].enddate)}</b>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {enrollments.map((enrollment) => (
            <EnrollmentReport key={enrollment.id} enrollment={enrollment} report={report} />
          ))}

          <div className="pv-card rp-gs">
            <div className="rp-sig">
              <div className="rp-stamp">
                <OptimizedImage src={assetUrl("is-stamp.png")} alt="School stamp" width={100} height={100} className="h-auto w-[84px]" />
                <OptimizedImage src={assetUrl("signature-report.png")} alt="Signature" width={100} height={100} className="rp-signature h-auto w-[84px]" />
              </div>
              <span></span>
              <small>School Official</small>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h4>Grading System</h4>
              <div className="ftw rp-gsw">
                <table className="rp-gst">
                  <tbody>
                    <tr>
                      <th>Grade</th>
                      {GRADING_SYSTEM.map(([grade], index) => (
                        <td key={grade} className={gradeTone(index)}>
                          {grade}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <th>Percentage</th>
                      {GRADING_SYSTEM.map(([grade, range]) => (
                        <td key={grade}>{range}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
