"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowDown, ArrowUp, GraduationCap, Minus, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { ChildAvatar } from "@/components/parent/ChildAvatar";
import { dashboardNavHref } from "@/utils/dashboardNav";
import { gradeFromPercentage, learningProgramLabel, monthLong } from "@/utils/parentHome";

/**
 * The selected child's header and the four KPI tiles (legacy performance card): Courses, Classes & Activities
 * this month, Attendance, Performance. Each tile opens its module by pageLink (legacy hard-coded module ids).
 */
export function ChildOverviewCard({ details }) {
  const { school } = useParams();
  const { selectedChild } = useSelectedChild();
  const student = details?.student ?? {};
  const summary = details?.summary ?? {};
  const withClass = details?.activitiesWithClass !== false;
  const now = new Date();
  const monthYear = `${monthLong(now)} ${now.getFullYear()}`;
  const href = (pageLink) => dashboardNavHref(school, "parent", pageLink);

  const child = { studentName: student.studentName || selectedChild?.studentName, profilePic: student.profilePic || selectedChild?.profilePic };
  const program = learningProgramLabel(student.learningProgram);

  // Legacy: a delta under 1 is shown as a red decline (so 0 to 0.9 reads as down). Kept for parity with the JSP.
  const delta = Number(summary.attendanceDeltaFromLastMonth);
  const deltaDown = !Number.isFinite(delta) || delta < 1;
  const gradeNow = Number(summary.avgGradeThisMonth);
  const gradeLast = Number(summary.avgGradeLastMonth);
  const gradeTrend = gradeNow > gradeLast ? "up" : gradeNow < gradeLast ? "down" : "same";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ChildAvatar child={child} size={56} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold text-black">{child.studentName}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-black/60">
              {student.grade && (
                <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />{student.grade}</span>
              )}
              {program && (
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" />{program}</span>
              )}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-black/60">
          <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
          Last active: {student.lastActive || "N/A"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile href={href("parent-syllabus-assigned-teacher")} value={summary.totalCourses ?? 0} label="Courses" tone="text-slate-600" />
        <Tile
          href={href("parent-class-schedule")}
          value={summary.totalClassesThisMonth ?? 0}
          label={`No. of ${withClass ? "Classes & " : ""}Activities ${monthYear}`}
          tone="text-indigo-600"
        />
        <Tile
          href={href("parent-attendance")}
          value={`${Number.isFinite(Number(summary.attendancePercentThisMonth)) ? Number(summary.attendancePercentThisMonth) : 0}%`}
          label="Attendance"
          tone="text-emerald-600"
          foot={
            <span className="inline-flex items-center gap-1.5 text-xs text-black/60">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${deltaDown ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                {deltaDown ? <TrendingDown className="h-3 w-3" aria-hidden="true" /> : <TrendingUp className="h-3 w-3" aria-hidden="true" />}
              </span>
              {Number.isFinite(delta) ? delta : 0}% {monthYear}
            </span>
          }
        />
        <Tile
          href={href("parent-academic-performance")}
          value={gradeFromPercentage(summary.avgGradeThisMonth)}
          label="Performance"
          tone="text-primary"
          foot={
            <span className="inline-flex items-center gap-1.5 text-xs text-black/60">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full ${
                  gradeTrend === "up" ? "bg-emerald-50 text-emerald-600" : gradeTrend === "down" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                }`}
              >
                {gradeTrend === "up" ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : gradeTrend === "down" ? <ArrowDown className="h-3 w-3" aria-hidden="true" /> : <Minus className="h-3 w-3" aria-hidden="true" />}
              </span>
              {gradeFromPercentage(summary.avgGradeThisMonth)} from {gradeFromPercentage(summary.avgGradeLastMonth)}
            </span>
          }
        />
      </div>
    </section>
  );
}

function Tile({ href, value, label, tone, foot }) {
  return (
    <Link href={href} className="block rounded-xl border border-slate-200 p-4 no-underline transition-colors hover:border-primary hover:bg-primary/5">
      <span className={`block text-2xl font-extrabold ${tone}`}>{value}</span>
      <span className="mt-1 block text-xs font-semibold text-black/70">{label}</span>
      {foot && <span className="mt-2 block">{foot}</span>}
    </Link>
  );
}
