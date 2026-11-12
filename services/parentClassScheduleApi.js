"use server";

import { parentPost, parentSessionUserId } from "@/services/parentApiBase";

/**
 * BFF for the parent's Class Schedule and Class Summary pages (server actions, shared by both). The parent is the
 * session user (userId comes from the session, never the browser); studentUserId is the selected child and the
 * backend verifies the parent-student mapping (DashboardParentUtil: "Unauthorized student access", statusCode V003)
 * for the two schedule endpoints. A failed call returns null.
 *
 * Both schedule endpoints answer with ResponseCommon { status, statusCode, message, details }: statusCode "1" ok,
 * "3" session out, V001 invalid range, V003 unauthorised, EX01 server error. With no rows (or a V001 range) they
 * still send details = { countryISOCode "", schedule [] }, so an empty list is an empty range, not an error.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/;

async function postSchedule(path, { schoolUUID, studentUserId, startDate, endDate }) {
  if (!schoolUUID || !studentUserId || !YMD.test(String(startDate)) || !YMD.test(String(endDate))) return null;
  const userId = await parentSessionUserId();
  if (!userId) return null;
  return parentPost(schoolUUID, path, { userId: Number(userId), studentUserId: Number(studentUserId), startDate, endDate });
}

/**
 * The child's upcoming / live classes and activities (Class Schedule page) — POST /dashboard/parent/student-schedule
 * {userId, studentUserId, startDate, endDate (yyyy-MM-dd)}.
 * Response.details { countryISOCode, schedule[] }, each item (ParentScheduleItemDTO) { id "classroom<n>" |
 * "batch<n>" | "activity<n>", entityId, entityName (source table), category CLASS|ACTIVITY, type, classStatus,
 * courseName, teacherName, teacherGender, start, end ("yyyy-MM-dd HH:mm[:ss]" wall clock in `timezone`), timezone,
 * icon, meetingId, classesAttendance "Attended"|"Attending"|"N/A", classesAttendanceDuration, hasFeedback }.
 */
export async function getParentClassSchedule(args) {
  return postSchedule("/dashboard/parent/student-schedule", args);
}

/**
 * The child's past classes and activities (Class Summary page) — POST /dashboard/parent/student-class-schedule-summary
 * with the same payload and the same details shape as getParentClassSchedule. The backend only returns days before
 * today (endDate is clamped to yesterday; a range wholly in the future answers V001).
 */
export async function getParentClassScheduleSummary(args) {
  return postSchedule("/dashboard/parent/student-class-schedule-summary", args);
}

/**
 * The generated summary of one class — POST /dashboard/parent/student-class-summary {userId, studentUserId, meetingId}
 * (the legacy page sends only meetingId; the extra ids are ignored by the backend's DTO today).
 * Response.details (ParentStudentClassSummaryDataDTO) { summaryStatus "GENERATED"|"GENERATING", summaryMessage,
 * summary { id, lensSessionId, entityId, entityType, summaryTitle, summaryOverview } | null,
 * summaryDetails[] { id, label, summary } }. statusCode "1" even while GENERATING; V001 for a blank meetingId.
 */
export async function getParentClassSummaryDetail({ schoolUUID, studentUserId, meetingId }) {
  const id = String(meetingId ?? "").trim();
  if (!schoolUUID || !studentUserId || !id) return null;
  const userId = await parentSessionUserId();
  if (!userId) return null;
  return parentPost(schoolUUID, "/dashboard/parent/student-class-summary", {
    userId: Number(userId),
    studentUserId: Number(studentUserId),
    meetingId: id,
  });
}
