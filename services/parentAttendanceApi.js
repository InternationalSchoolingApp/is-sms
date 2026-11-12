"use server";

import { parentPost, parentSessionUserId } from "@/services/parentApiBase";

/**
 * BFF for the parent's Attendance page (server actions). The parent is the session user (userId comes from the
 * session, never the browser); studentUserId is the selected child and the backend verifies the parent-student
 * mapping (DashboardParentUtil: "Unauthorized student access", statusCode V003). A failed call returns null.
 *
 * Both endpoints use the inverted ResponseCommon envelope: status is "SUCCESS" and statusCode carries the outcome
 * ("1" ok, "3" session out, "V00x" validation / unauthorised).
 */

/**
 * The child's attendance overview — POST /dashboard/parent/student-attendance-full {userId, studentUserId}.
 * Response.details: { summary { classesToday, attendancePercentThisMonth, attendanceDeltaFromLastMonth,
 * latePercentThisMonth, lateDeltaFromLastMonth, totalClassesHeldThisMonth, classesAttended, late, earlyLeave,
 * absent }, attendanceOverview[] { monthKey "yyyy-MM", monthLabel "Jan", attendancePercent, attendedClasses,
 * totalClassesHeld } x 12 for the current year }.
 */
export async function getParentChildAttendanceFull({ schoolUUID, studentUserId }) {
  if (!schoolUUID || !studentUserId) return null;
  const userId = await parentSessionUserId();
  if (!userId) return null;
  return parentPost(schoolUUID, "/dashboard/parent/student-attendance-full", { userId: Number(userId), studentUserId: Number(studentUserId) });
}

/**
 * One page of the child's class-by-class attendance — POST /dashboard/parent/student-attendance-details
 * {userId, studentUserId, fromDate, toDate (yyyy-MM-dd), dateFilter TODAY|YESTERDAY|WEEK|MONTH|CUSTOM,
 * status ALL|PRESENT|LATE|ABSENT, page (1-based)}.
 * Response.details: { totalCount, page, pageSize, rows[] { className, classDate "yyyy-MM-dd", startTime, endTime,
 * joinedTime (UTC instants or null), status PRESENT|ABSENT, absentLabel, late, lateByMinutes } }.
 */
export async function getParentChildAttendanceDetails({ schoolUUID, studentUserId, fromDate, toDate, dateFilter, status = "ALL", page = 1 }) {
  if (!schoolUUID || !studentUserId) return null;
  const userId = await parentSessionUserId();
  if (!userId) return null;
  return parentPost(schoolUUID, "/dashboard/parent/student-attendance-details", {
    userId: Number(userId),
    studentUserId: Number(studentUserId),
    fromDate,
    toDate,
    dateFilter,
    status,
    page,
  });
}
