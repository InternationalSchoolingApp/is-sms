"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { BLUE_DOODLES_HTML } from "@/components/parent/home/blueDoodles";
import { dashboardNavHref } from "@/utils/dashboardNav";
import { gradeFromPercentage, learningProgramLabel, monthLong } from "@/utils/parentHome";

const ARROW = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

// The child's photo, or their initial when there is none (or it fails to load): only an absolute http(s) URL is tried
// and it is not run through the Next optimizer (any school CDN host), like ChildAvatar.
function KavInner({ child }) {
  const [failed, setFailed] = useState(false);
  const pic = typeof child?.profilePic === "string" ? child.profilePic.trim() : "";
  const name = String(child?.studentName ?? "").trim();
  return /^https?:\/\//i.test(pic) && !failed ? (
    <span>
      <Image src={pic} alt="" width={42} height={42} unoptimized onError={() => setFailed(true)} />
    </span>
  ) : (
    <span aria-hidden="true">{name ? name[0].toUpperCase() : "?"}</span>
  );
}

/** The blue tile of the parent home (design board): the thank-you line and the child's photo, name, grade, program and last activity. */
export function ChildBlueTile({ details }) {
  const { selectedChild } = useSelectedChild();
  const student = details?.student ?? {};
  const name = student.studentName || selectedChild?.studentName;
  const child = { studentName: name, profilePic: student.profilePic || selectedChild?.profilePic };
  const program = learningProgramLabel(student.learningProgram);

  return (
    <section className="tile blue" aria-label="Your child">
      {/* static design markup, not user input */}
      <div className="doodles" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BLUE_DOODLES_HTML }} />
      <p className="thx">Thank you for standing strong in your child&apos;s journey.</p>
      <div className="kidpill">
        <span className="kav">
          <KavInner child={child} />
        </span>
        <div className="kp-t">
          <b>{name}</b>
          <span>
            {[student.grade, program].filter(Boolean).join(" · ")}
          </span>
          <span className="kp-seen">
            <i />
            Last active: {student.lastActive || "N/A"}
          </span>
        </div>
      </div>
    </section>
  );
}

/** Attendance, Courses and Performance tiles (design board "trio"). Each opens its module by pageLink. */
export function ChildKpiTrio({ details }) {
  const { school } = useParams();
  const summary = details?.summary ?? {};
  const now = new Date();
  const monthYear = `${monthLong(now)} ${now.getFullYear()}`;
  const href = (pageLink) => dashboardNavHref(school, "parent", pageLink);

  // Legacy: a delta under 1 is shown as a red decline (so 0 to 0.9 reads as down). Kept for parity with the JSP.
  const delta = Number(summary.attendanceDeltaFromLastMonth);
  const deltaDown = !Number.isFinite(delta) || delta < 1;
  const attendance = Number.isFinite(Number(summary.attendancePercentThisMonth)) ? Number(summary.attendancePercentThisMonth) : 0;
  const gradeNow = Number(summary.avgGradeThisMonth);
  const gradeLast = Number(summary.avgGradeLastMonth);
  const gaugePct = Number.isFinite(gradeNow) ? Math.max(0, Math.min(100, gradeNow)) : 0;

  return (
    <div className="trio">
      <section className="tile num" style={{ animationDelay: ".05s" }}>
        <span className="lab">Attendance</span>
        <Link className="go lt" href={href("parent-attendance")} aria-label="Open attendance">
          {ARROW}
        </Link>
        <b className="bl">{attendance}%</b>
        <small className={deltaDown ? "dn" : "mu"} style={deltaDown ? undefined : { color: "var(--grn)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={deltaDown ? "m3 7 6 6 4-4 8 8M21 11v6h-6" : "m3 17 6-6 4 4 8-8M21 13V7h-6"} />
          </svg>
          {Number.isFinite(delta) ? delta : 0}% {monthYear}
        </small>
      </section>
      <section className="tile num" style={{ animationDelay: ".1s" }}>
        <span className="lab">Courses</span>
        <Link className="go lt" href={href("parent-syllabus-assigned-teacher")} aria-label="Open courses">
          {ARROW}
        </Link>
        <b>{summary.totalCourses ?? 0}</b>
        <small className="mu">Enrolled</small>
      </section>
      <section className="tile gauge" aria-labelledby="pd-gauge" style={{ animationDelay: ".15s" }}>
        <span className="lab" id="pd-gauge">
          Performance
        </span>
        <Link className="go" href={href("parent-academic-performance")} aria-label="Open academic performance">
          {ARROW}
        </Link>
        <div className="gwrap">
          <svg viewBox="0 0 220 124" aria-hidden="true">
            <defs>
              <linearGradient id="pd-gg" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="200" y2="0">
                <stop offset="0" stopColor="#FF8A3D" />
                <stop offset=".33" stopColor="#FFC531" />
                <stop offset=".66" stopColor="#1F6BFF" />
                <stop offset="1" stopColor="#1F8A4C" />
              </linearGradient>
            </defs>
            <path className="garc bg" d="M20 112a90 90 0 0 1 180 0" />
            <path className="garc fg" d="M20 112a90 90 0 0 1 180 0" style={{ stroke: "url(#pd-gg)", strokeDashoffset: 283 * (1 - gaugePct / 100) }} />
          </svg>
          <span className="gval">{gradeFromPercentage(summary.avgGradeThisMonth)}</span>
        </div>
        <div className="gfoot">
          <span>D</span>
          <span>A+</span>
        </div>
        <span className="gtrend">
          {gradeNow > gradeLast ? "↑" : gradeNow < gradeLast ? "↓" : "→"} {gradeFromPercentage(summary.avgGradeThisMonth)} from {gradeFromPercentage(summary.avgGradeLastMonth)}
        </span>
      </section>
    </div>
  );
}
