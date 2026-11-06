"use server";

import { backendRequest } from "@/utils/backendRequest";

/**
 * My Attendance - Attendance Details. POST {school}/dashboard/parent/student-attendance-details
 * (ClientDashoboardParentController -> DashboardParentUtil.getStudentAttendanceDetails).
 * Body = { payload: encodePayload({ userId, studentUserId, fromDate, toDate, dateFilter, status, page }) } - the
 * same envelope as every dashboard endpoint (base64(encodeURI(json)), which is what the backend's AesUtil.decode
 * reads; Buffer-safe, so it works in Node). Dates are "YYYY-MM-DD", dateFilter TODAY|YESTERDAY|WEEK|MONTH|CUSTOM,
 * status ALL|PRESENT|LATE|ABSENT.
 *
 * The student comes from the session (userId, school) and not from the browser; `studentUserId` defaults to the
 * logged-in student and the backend still authorises it. A Server Action cannot throw a readable error to the
 * browser, so this returns { ok: true, data: <details> } or { ok: false, code, message, sessionExpired? };
 * hooks/useStudentAttendanceDetails.js turns that into data / thrown errors with callServer().
 *
 * details = { totalCount, page, pageSize, rows: [{ className, classDate "YYYY-MM-DD" (date only),
 * startTime / endTime / joinedTime (UTC instants or null), status "PRESENT"|"ABSENT", absentLabel, late, lateByMinutes }] }
 */
export async function getStudentAttendanceDetails({ studentUserId, fromDate, toDate, dateFilter, status = "ALL", page = 1, checkSession = "Y" }) {
  const result = await backendRequest({
    path: "dashboard/parent/student-attendance-details",
    checkSession,
    buildBody: (me) => ({
      userId: me.userId,
      studentUserId: studentUserId ? Number(studentUserId) : me.userId,
      fromDate,
      toDate,
      dateFilter,
      status,
      page,
    }),
  });
  if (!result.ok) return result;
  const data = result.data;
  // statusCode "1" is success; anything else keeps the backend's own code and message.
  if (String(data.statusCode) !== "1") {
    return { ok: false, code: String(data.statusCode ?? "UNKNOWN"), message: data.message || "The attendance details could not be loaded." };
  }
  return { ok: true, data: data.details };
}
