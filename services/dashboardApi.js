"use server";

import { serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { getSettingValue } from "@/services/studentSignupApi";
import { getCommonScriptVariables } from "@/services/studentSignupBackendApi";

/**
 * BFF for the dashboard foundation. Same server-action + origin resolution
 * pattern as services/studentSignupApi.js. Non-2xx / empty / non-JSON responses
 * come back as null (never thrown).
 */

async function parseJsonResponse(response) {
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * The role-assigned sidebar menu (the faithful DB-driven navigation).
 *
 * Uses the EXISTING backend endpoint — POST /{schoolUUID}/api/v1/module-details
 * (CommonController is class-level @RequestMapping("{schoolId}"), so EVERY
 * method on it, including getModuleDetails -> ModulesUtil.getRoleAssignModuleList,
 * is school-slug-scoped — confirmed at CommonController.java:97/466. The path
 * segment is unused by the method itself (identity comes from the payload), but
 * it must still be present or routing 404s.
 *
 * Returns a RoleAndModuleAssignDTO with each module's children in
 * `chiledRoleModulesDTO`. moduleType "M" + parentId 0 = the top-level menu
 * (with nested children). Returns null (→ caller treats it as "no menu") when
 * the backend/roleId/schoolUUID is unavailable.
 *
 * Request body matches the controller: { payload: encode({schoolId, roleId,
 * userId, moduleType, parentId}) } where encode = base64(encodeURI(json))
 * (AesUtil.decode on the server).
 */
export async function getDashboardMenu({ schoolUUID, schoolId, roleId, userId }) {
  if (!hasBackendOrigin() || !roleId || !schoolId || !schoolUUID) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const body = { payload: encodePayload({ schoolId, roleId, userId, moduleType: "M", parentId: 0 }) };
    const response = await fetch(`${baseUrl}/${schoolUUID}/api/v1/module-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    const menuData = await parseJsonResponse(response);
    return menuData;
  } catch {
    return null;
  }
}

/**
 * Extra student-profile flags the sidebar needs to replicate the legacy JSP's
 * per-item visibility/label rules (DashboardLeftSideContentSchool.jsp) that
 * the role-assigned menu alone can't express — e.g. "only show Fee Details
 * for an Online signup", "only show Academic Year Extension for certain
 * providers/standards". See utils/dashboardNav.js's applyStudentNavRules.
 *
 * Uses the EXISTING backend endpoint — POST /{schoolUUID}/api/v1/get-demo-dashboard-user-details
 * (CommonController.getDemoDashboardUserDetails, same class-level school-slug
 * scoping as getDashboardMenu above). `type: "U"` + `entityId: userId` is the
 * real-user path (as opposed to "DS"/"DP"/"DT", the demo-data preview paths).
 * Unlike the other BFF calls here this endpoint returns a plain JSON string
 * (not wrapped in {payload: ...}), so the response is parsed directly.
 */
export async function getDashboardUserDetails({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const body = { payload: encodePayload({ entityId: userId, type: "U" }) };
    const response = await fetch(`${baseUrl}/${schoolUUID}/api/v1/get-demo-dashboard-user-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * CHAT_URL / DIARY_URL — the same "common script variables" bootstrap the
 * legacy JSP pages read into `var CHAT_URL = ...` / `var DIARY_URL = ...` at
 * the top of every page (CommonUtil.getCommonCustomScript, behind POST
 * /{schoolUUID}/api/v1/common-script-variables; already used by the signup
 * wizard via getCommonScriptVariables for its location/CDN bootstrap).
 * DIARY_URL is pre-resolved server-side (falls back to CHAT_URL when unset,
 * per CommonUtil.getDiaryUrl) — callers don't need to replicate that
 * fallback themselves. Powers the hidden diary-bridge iframe that pushes
 * live unread-count updates (see RightActionRail).
 */
export async function getDashboardChatLinks({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    const response = await getCommonScriptVariables(schoolUUID, { userId });
    return response ? { chatUrl: response.CHAT_URL || "", diaryUrl: response.DIARY_URL || "" } : null;
  } catch {
    return null;
  }
}

/**
 * Student menu-visibility flags — POST /{schoolUUID}/dashboard/parent/student-menu-flags
 * Controls per-student sidebar visibility (Assigned Teacher, Book a Class,
 * Attendance) and the "Buy & Book a Class" label override. On error the caller
 * treats it as null → no menus hidden (safe fallback).
 */
export async function getStudentMenuFlags({ schoolUUID, studentUserId }) {
  if (!hasBackendOrigin() || !schoolUUID || !studentUserId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/parent/student-menu-flags", { studentUserId });
  } catch {
    return null;
  }
}

/**
 * Chat unseen-message count — POST /{schoolUUID}/api/v1/chat
 * (dashboardCommon.js's getChat(), behind RestTemplateUtil.getChat).
 *
 * Legacy's own AJAX call sends a bare {role, email, userId} JSON body, but
 * the controller decodes the request the same way every other payload
 * endpoint does (AesUtil.decode(payload.getPayload())) — confirmed directly
 * against the backend that the bare body always fails ("technical glitch",
 * status "2"), so legacy's #chatUnseenCoutn badge is permanently stuck at 0.
 * The standard {payload: encode(...)} envelope works and returns the real
 * sumUnseen; used here rather than reproducing the dead client-side bug.
 */
export async function getChatUnseenCount({ schoolUUID, userId, userRole, email }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const body = { payload: encodePayload({ role: userRole, email, userId }) };
    const response = await fetch(`${baseUrl}/${schoolUUID}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * CONFIGURATION/STUDENT_DASHBOARD_VIA_NEXTJS — the per-module coexistence
 * toggle, mirroring ENROLLMENT_VIA_NEXTJS. Returns the raw metaValue string so
 * callers can distinguish "explicitly false" from "row not created yet" ("").
 */
export async function getStudentDashboardToggle(schoolUUID) {
  return getSettingValue(schoolUUID, "CONFIGURATION", "STUDENT_DASHBOARD_VIA_NEXTJS");
}

/**
 * Student home calendar (Phase B) — POST /{schoolUUID}/dashboard/school-calendar
 * (ClientSchoolCalendarController.getSchoolCalendar -> SchoolCalendarDTO).
 * The controller decodes the body via Payload/AesUtil, i.e. the SAME
 * {payload: encodePayload(...)} envelope used by every other BFF call here —
 * not the raw-JSON body the legacy JS actually sends (that mismatch looks
 * like dead/broken legacy code; AesUtil.decode is what the server is written
 * against, so we encode for it).
 *
 * Only userId/startDate/endDate are read server-side (SchoolCalendarDTO has
 * more fields but getSchoolCalendar ignores them); schoolId comes from the
 * session, not the path or body.
 *
 * UNLIKE every other call in this file, getSchoolCalendar's Java method also
 * gates on sessionUtil.getUserId() — i.e. a signed-in user, not just the
 * decoded payload — so the user's SMS token goes on this server-to-server call
 * (see authHeaders).
 */
// The signed-in user's SMS access token (Bearer) + this server's service key. The backend knows the user from
// the token (lib/auth/session.js); the browser's cookies are no longer forwarded.
async function authHeaders() {
  return { ...serviceKeyHeaders(), ...(await smsAuthHeaders()) };
}

// Shared by every call below: POST {schoolUUID}<path> with the standard
// {payload: encodePayload(body)} envelope + forwarded session cookie. Verified
// live (see git history) that these dashboard-family endpoints need the
// wrapped envelope — the legacy JS actually posts a raw/unwrapped body to the
// same endpoints, which throws server-side (NPE on the null-decoded payload).
async function postDashboardPayload(schoolUUID, path, body) {
  const baseUrl = await resolveServerBackendOrigin();
  const response = await fetch(`${baseUrl}/${schoolUUID}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ payload: encodePayload(body) }),
  });
  return parseJsonResponse(response);
}

/**
 * The dashboard orchestrator's first call — StudentDashboardOrMigrationDTO.
 * Carries the graduation-ceremony-popup / batch-announcement / re-enrollment
 * trigger flags read on every dashboard load. Re-enrollment fields
 * (showBatchReEnrollmentPopUp/Date) are read but never acted on here — that
 * flow is owned by a separate branch.
 */
export async function getStudentDashboardOrMigration({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/student/dashboard/dashboard-or-migration", { userId });
  } catch {
    return null;
  }
}

/**
 * The dashboard orchestrator's second call — StudentDetailsDTO. We only need
 * `videoUrl` (the onboarding mandatory-video URL, or the sentinel "N" for
 * "no video to show") from this for Phase B's home widgets.
 */
export async function getStudentDashboardDetails({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/student/dashboard/get-student-dashboard", { userId });
  } catch {
    return null;
  }
}

/**
 * POST /{schoolUUID}/dashboard/get-announcement-details — recent school
 * announcements (HTML body in `teacherRemarks`, sanitize before rendering).
 */
export async function getAnnouncementDetails({ schoolUUID, userId, startFrom = 0, pageSize = 5 }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/get-announcement-details", { userId, startFrom, pageSize });
  } catch {
    return null;
  }
}

export async function getSchoolCalendar({ schoolUUID, userId, startDate, endDate }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const body = { payload: encodePayload({ userId, startDate, endDate }) };
    const response = await fetch(`${baseUrl}/${schoolUUID}/dashboard/school-calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * Attendance refresh for a just-ended class — POST
 * /{schoolUUID}/dashboard/live-class-attendance-status. Response.details is
 * an AttendanceStatusDTO-shaped object: { attended, onTime, lateSeconds }.
 * Same session-cookie requirement as getSchoolCalendar.
 */
export async function getLiveClassAttendanceStatus({ schoolUUID, entityId, entityType, classDate, classStartTime }) {
  if (!hasBackendOrigin() || !schoolUUID || !entityId) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const body = { payload: encodePayload({ entityId, entityType, classDate, classStartTime }) };
    const response = await fetch(`${baseUrl}/${schoolUUID}/dashboard/live-class-attendance-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * Class/meeting join validation — legacy getActualURL(url): a plain GET on
 * the event's own `url` field (CalendarEventDTO.url, e.g.
 * join-personalized-class/{date}/{type}/{id}/{uniqueId}), which returns JSON
 * (not HTML): { status, dateStatus: "past"|"future"|"between", redirectUrl,
 * commonJoinUrlOfSMS, meetingJoinModalHideMin, joinType, userRole, ... }.
 * VERIFIED LIVE against a real "between" (live) class: the actual join link
 * is in `redirectUrl` — `commonJoinUrlOfSMS` was present but empty for
 * joinType "A" (student join). The browser is sent to that URL only once
 * dateStatus is "between".
 */
export async function getClassJoinDetails({ schoolUUID, url }) {
  if (!hasBackendOrigin() || !url) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const absoluteUrl = /^https?:\/\//i.test(url) ? url : `${baseUrl}/${schoolUUID}${url.startsWith("/") ? "" : "/"}${url}`;
    const response = await fetch(absoluteUrl, {
      method: "GET",
      headers: { ...(await authHeaders()) },
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * POST /{schoolUUID}/dashboard/save-acknowledge-request — legacy
 * announcement.js's saveAnnouncementAcknowledge(). Verified stateless
 * (payload-based, no session read) via source: ClientDashboardCommonController
 * -> DashboardSchoolAnnounceUtil.submitSchoolAnnounceReply resolves the user
 * from userId in the body, never sessionUtil. Response is a generic
 * {status, message} — no list/count data, so the caller updates its own
 * cached announcement list optimistically (same as the legacy JS does).
 */
export async function submitAnnouncementAcknowledge({ schoolUUID, announceId, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !announceId || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/save-acknowledge-request", { announceId, userId, moduleId: 0 });
  } catch {
    return null;
  }
}

/**
 * Phase C — Exam Details ("Examination Schedule", sidebar segment
 * batch-student-examination-sheet). POST /{schoolUUID}/dashboard/student-examination-details
 * (ClientDashboardStudentController.studentExaminationDetails -> DashboardStudentUtil,
 * session-cookie-gated like getSchoolCalendar). Response.details is a plain string: the
 * uploaded exam-sheet's public file URL, or "" if the admin hasn't uploaded one yet.
 */
export async function getStudentExaminationDetails({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/student-examination-details", { userId, studentUserId: userId });
  } catch {
    return null;
  }
}

/**
 * Phase C — Performance ("My Performance", sidebar segment student-progress-report).
 * POST /{schoolUUID}/dashboard/parent/student-academic-performance (despite the "parent"
 * path segment, students reuse the same endpoint — ClientDashoboardParentController.java,
 * session-cookie-gated). Only populated for Agilix Buzz LMS course providers (36/37/38);
 * self-paced/other providers return an empty studentAcademicPerformances list.
 * Response.details: StudentAcademicPerformanceDetailsDTO { studentAcademicPerformances }.
 * includeClassComparison (K5 My Performance only) also brings details.k5Goals and a classComparison block per course.
 */
export async function getStudentAcademicPerformance({ schoolUUID, userId, k5Performance = false }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    // k5Performance: the new My Performance page; the backend answers from the daily cron's tables, not the LMS.
    const body = { userId, studentUserId: userId, ...(k5Performance ? { k5Performance: "Y", includeClassComparison: "Y" } : {}) };
    const data =  await postDashboardPayload(schoolUUID, "/dashboard/parent/student-academic-performance", body);
    console.log("getStudentAcademicPerformance data:", data, null, 2);
    return data;
  } catch {
    return null;
  }
}

// export async function getStudentAcademicPerformance({schoolUUID,userId,k5Performance = false}) {
//   if (!hasBackendOrigin() || !schoolUUID || !userId) {return null;}

//     try {
//         const body = {
//             userId,
//             studentUserId: userId,
//             ...(k5Performance
//                 ? {
//                     k5Performance: "Y",
//                     includeClassComparison: "Y"
//                 }
//                 : {})
//         };

//         console.log("Academic Performance Request:", {
//             schoolUUID,
//             body
//         });

//         const data = await postDashboardPayload(
//             schoolUUID,
//             "/dashboard/parent/student-academic-performance",
//             body
//         );

//         console.log(
//             "Academic Performance Full Response:",
//             JSON.stringify(data, null, 2)
//         );

//         console.log(
//             "Student Academic Performances:",
//             JSON.stringify(data)
            
//         );

//         console.log(
//             "K5 Performance:",
//             k5Performance
//         );

//         return data;

//     } catch (error) {
//         console.error("Academic Performance API Error:", error);
//         return null;
//     }
// }

/**
 * Progress Reports ("My Progress Reports", sidebar segment progress-detail) — legacy
 * studentProgressDetail.js. POST /{schoolUUID}/dashboard/parent/weekly-progress-reports-detail
 * (same "parent" controller as above, students reuse it). Response.details:
 * StudentWeeklyProgressReportDetailsDTO { studentWeeklyProgressReports: [{ daysType,
 * reportStartDate, reportEndDate, createdDate, playloadUrl }] } — playloadUrl is the backend's
 * own rendered gradebook report page (/dashboard/get-user-gradebook/{uniqueId}?payload=...).
 */
export async function getStudentWeeklyProgressReports({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/parent/weekly-progress-reports-detail", { userId, studentUserId: userId });
  } catch {
    return null;
  }
}

// Shared by the two Buzz progress-report calls below. ClientDashboardAzlixbuzzController
// declares a @RequestHeader("UNIQUEUUID") param, but SessionUtil.getUser(String) actually
// ignores that argument entirely (dead parameter - verified against the live source) and
// falls through to getUserId(), the SAME cookie-backed session read every other call in
// this file uses. So the session cookie must still be forwarded here, same as
// postDashboardPayload; the UNIQUEUUID header is sent too since the controller requires
// the header to be present, but it is not what grants access.
async function postBuzzProgressPayload(schoolUUID, path, body, uniqueId) {
  const baseUrl = await resolveServerBackendOrigin();
  const response = await fetch(`${baseUrl}/${schoolUUID}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", UNIQUEUUID: uniqueId || "", ...(await authHeaders()) },
    body: JSON.stringify({ payload: encodePayload(body) }),
  });
  return parseJsonResponse(response);
}

/**
 * Performance row click — the per-course progress breakdown modal (assignment
 * counts + items table). POST /{schoolUUID}/dashboard/get-student-progress-report-detail.
 */
export async function getStudentProgressReportDetail({ schoolUUID, uniqueId, studentUserId, lmsEnrollmentId, lmsCourseId }) {
  if (!hasBackendOrigin() || !schoolUUID || !uniqueId) return null;
  try {
    const data = await postBuzzProgressPayload(
      schoolUUID,
      "/dashboard/get-student-progress-report-detail",
      { studentUserId, lmsUserId: lmsEnrollmentId, entityId: lmsCourseId },
      uniqueId,
    );
    console.log("getStudentProgressReportDetail data:", JSON.stringify(data, null, 2));
    return data;
  } catch {
    return null;
  }
}

/**
 * Progress-detail item row click — the grade-history sub-modal.
 * POST /{schoolUUID}/dashboard/get-progress-report-grade-history.
 */
export async function getProgressReportGradeHistory({ schoolUUID, uniqueId, itemId, enrollId }) {
  if (!hasBackendOrigin() || !schoolUUID || !uniqueId) return null;
  try {
    return await postBuzzProgressPayload(schoolUUID, "/dashboard/get-progress-report-grade-history", { itemId, enrollId }, uniqueId);
  } catch {
    return null;
  }
}

/**
 * Progress Reports "View" — the gradebook report behind a row's playloadUrl, as JSON.
 * GET /{schoolUUID}/dashboard/get-user-gradebook/{uniqueId}?payload=...&format=json
 * (the same endpoint legacy loads as a JSP page; format=json returns its model data:
 * student fields, gradebookEnroll[], reportStartDate/EndDate, downloadUrl, reportMessage).
 * params is the row payload ({ data, startdate, enddate, subReportType }) with optional
 * new dates from the report's own date search. requestFrom/forDownload are pinned so a
 * view never creates a StudentWeeklyReportUpload row. rawPayload: the list's own encrypted
 * payload, sent back unchanged for the first view (the backend decrypts it).
 */
export async function getStudentGradebookReport({ schoolUUID, uniqueId, params, rawPayload }) {
  if (!hasBackendOrigin() || !schoolUUID || !/^[0-9a-f-]{36}$/i.test(uniqueId || "") || !(params?.data || rawPayload)) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    // Plain base64 of the JSON, like legacy: this endpoint reads the payload with AesUtil.decodeOrDecrypt, which only
    // takes base64 whose text starts with "{" and tries AES on anything else, so encodePayload's encodeURI ("%7B…") fails.
    const payload = params?.data
      ? Buffer.from(
          JSON.stringify({
            data: params.data,
            startdate: params.startdate || "",
            enddate: params.enddate || "",
            subReportType: params.subReportType || "",
            requestFrom: "true",
            forDownload: "false",
          }),
          "utf8",
        ).toString("base64")
      : String(rawPayload);
    const response = await fetch(
      `${baseUrl}/${schoolUUID}/dashboard/get-user-gradebook/${uniqueId}?payload=${encodeURIComponent(payload)}&format=json`,
      { headers: { ...(await authHeaders()) }, cache: "no-store" },
    );
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * One module's rights for this user — legacy getUserRights() (masterContent.js), called by
 * adminController.getContent() before every module page renders.
 * POST /{schoolUUID}/api/v1/module (CommonController.getModule -> ModulesUtil.getModuleRights).
 * Payload {schoolId, roleId, userId, moduleId}; returns RoleAndModuleDTO
 * { moduleId, moduleName, pageLink, viewed, added, ... }. Not session-gated (same as module-details).
 */
export async function getModuleRights({ schoolUUID, schoolId, roleId, userId, moduleId }) {
  if (!hasBackendOrigin() || !schoolUUID || !schoolId || !roleId || !moduleId) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/${schoolUUID}/api/v1/module`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({
        payload: encodePayload({ schoolId: String(schoolId), roleId: String(roleId), userId: String(userId), moduleId: String(moduleId) }),
      }),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * Clubs "Register Now" — legacy clubsCommon.js applyForClub(). POST /{schoolUUID}/save-club-request
 * (ClubController -> ClubUtil.saveClubRequest) with {userId, clubName}; clubName is the legacy card
 * title ("Spanish Club"), looked up by name server-side. status 1 = registered, 2 = already a member.
 */
export async function saveClubRequest({ schoolUUID, userId, clubName }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId || !clubName) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/save-club-request", { userId, clubName });
  } catch {
    return null;
  }
}

/**
 * Fee Details ("My Fee Details", sidebar segment fee-details) — legacy studentFeeDetails.js.
 * POST /{schoolUUID}/dashboard/parent/student-fee-details (students reuse the "parent"
 * controller, session-cookie-gated) with {userId, studentUserId}. Response.details:
 * StudentDueFeesDTO { userPaymentDetailsList: [{ id, scheduledPayDate, standardName, paymentName,
 * totalFeeWithMaterialFee, payDate, status, paymentTitle, paymentTransferType, pgName,
 * recieptLink }], nextUserPaymentDetailsId }.
 */
export async function getStudentFeeDetails({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/parent/student-fee-details", { userId, studentUserId: userId });
  } catch {
    return null;
  }
}

/**
 * Login History ("My Log in History", sidebar segment student-login-details) — legacy
 * studentLoginHistory.js. POST /{schoolUUID}/dashboard/parent/student-attendance (students reuse
 * the "parent" controller, session-cookie-gated) with {userId, studentUserId}. Response.details:
 * AttendanceDTO { firstLogin, lastLogin, duration, totalLoginDuretion, loginHistories: [{ loginTime,
 * logOutTime, loginLocation, totalLoginDuretion }] } ("Duretion" is the backend's spelling).
 */
export async function getStudentLoginHistory({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/parent/student-attendance", { userId, studentUserId: userId });
  } catch {
    return null;
  }
}

/**
 * Student academic details — POST /{schoolUUID}/dashboard/parent/student-academic-details
 * (students reuse the "parent" controller, session-cookie-gated) with {userId, studentUserId}.
 * Response.details: StudentAcademicDocumentDetailsDTO { userId, userName (USER.USER_FULL_NAME,
 * the legacy USER_FULL_NAME page global), ... }. Used for the student's display name.
 */
export async function getStudentAcademicDetails({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/parent/student-academic-details", { userId, studentUserId: userId });
  } catch {
    return null;
  }
}

/**
 * Demo student data row — legacy dummyStudentDashboardData.js hydrateDbRows().
 * POST /{schoolUUID}/dashboard/student/demo-data (ParentDashboardDemoDataController, session-gated,
 * demo student accounts only). No entityId is sent: the backend falls back to the demo row picked at
 * "view as user" time (session DEMO_DASHBOARD_USER). Response: { status: "1", details: [row] }.
 */
export async function getStudentDemoData({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/student/demo-data", { userId });
  } catch {
    return null;
  }
}

/**
 * Phase C — Syllabus ("Syllabus & Assigned Teacher", sidebar segment
 * syllabus-assigned-teacher — ONE_TO_ONE students only; BATCH students use a
 * separate syllabus-assigned-batch-teacher variant, out of scope here, same
 * as re-enrollment being its own branch). Despite the "parent" path segment,
 * students call these directly (ClientDashoboardParentController.java,
 * session-cookie-gated). The "assgined" typo in the path is real, not ours.
 */
export async function getStudentAssignedTeacher({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/${schoolUUID}/dashboard/parent/student-assgined-teacher?check-session=Y`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ payload: encodePayload({ userId, studentUserId: userId }) }),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * Per-course content drawer (opened by clicking a course in Syllabus) —
 * live Buzz LMS module/item list, thin for non-LMS course providers.
 * The answer is { status: "1", details: { lmsUserId, lmsCourseId, modules: [{ moduleName, items: [{ contentName, dueDate,
 * lmsProviderUrl, isPayLmsPaymentPending }] }] } } (studentSyllabusAssignedTeacher.js reads details.modules). Callers get
 * `details`, or null when the call failed (status other than "1").
 */
export async function getStudentCourseContent({ schoolUUID, userId, lmsUserId, lmsCourseId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId || !lmsUserId) return null;
  try {
    const response = await postDashboardPayload(schoolUUID, "/dashboard/parent/student-course-content", { userId, studentUserId: userId, lmsUserId, lmsCourseId });
    console.log("getStudentCourseContent response:", JSON.stringify(response, null, 2));
    return response && String(response.status) === "1" ? (response.details ?? { modules: [] }) : null;
  } catch {
    return null;
  }
}

/**
 * Phase C — Transcript ("My Transcript", sidebar segment student-transcript).
 * Uses the existing student-transcript-status endpoint
 * (ClientDashoboardMarksController.studentTranscriptStatus) which returns:
 *   - details.student  → { name, email, rollNumber, grade }
 *   - details.transcripts → [{ gradeName, viewPath }] per historical grade
 */
export async function getStudentTranscriptStatus({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/student-transcript-status", { studentUserId: userId });
  } catch {
    return null;
  }
}

/**
 * Phase C — My Attendance (sidebar segment student-attendance-overview).
 * POST /{schoolUUID}/dashboard/parent/student-attendance-full
 * (ClientDashoboardParentController -> DashboardParentUtil.getStudentFullAttendance),
 * the same call legacy studentAttendance.js makes for a student's own attendance:
 * self-access is allowed when the session user IS studentUserId. Session-cookie gated.
 *
 * NOTE this endpoint's envelope is inverted vs the rest of the file: `status` is
 * "SUCCESS" and `statusCode` carries the outcome ("1" ok, "3" session out,
 * "V00x" validation). Response.details: { summary: { classesToday,
 * attendancePercentThisMonth, attendanceDeltaFromLastMonth, latePercentThisMonth,
 * lateDeltaFromLastMonth, totalClassesHeldThisMonth, classesAttended, late,
 * earlyLeave, absent }, attendanceOverview: [{ monthKey "yyyy-MM", monthLabel
 * "Jan", attendancePercent, ... }] x 12 for the current year }.
 */
export async function getStudentAttendanceFull({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/parent/student-attendance-full", { userId, studentUserId: userId });
  } catch {
    return null;
  }
}

/**
 * Course Extension ("Academic Year Extension", sidebar segment academic-year-extention) — legacy
 * studentAcademicYearExtention.js. POST /{schoolUUID}/dashboard/academic-year-extention with
 * {userId, studentUserId}. The backend leaves status "0" on success and on every blocked case
 * (statusCode E003..E008 + message, no details); status "3" = session out. Response.details:
 * StudentAcademicYearExtensionDetailsDTO { message, courses: [{ subjectId, imgURl, bgColor,
 * subjectIcon, subjectName, standardName, courseType }] }.
 */
export async function getAcademicYearExtension({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/academic-year-extention", { userId: userId + "", studentUserId: userId + "" });
  } catch {
    return null;
  }
}

/**
 * One course of the extension list — POST /dashboard/academic-year-extention-proceed with
 * {userId, studentUserId, subjectId}. Response.details: { extension1Status "Yes"|"No",
 * extraSubjStatus, academicYearExtension: AcademicYearExtentionDTO { subjectId, subjectName, imgURl,
 * bgColor, extentionAvailStatus, currentExtentionType, extension2CanTakeStatus, extensionCount,
 * extentionCost, studentStandardId } }.
 */
export async function getAcademicYearExtensionProceed({ schoolUUID, userId, subjectId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId || !subjectId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/academic-year-extention-proceed", {
      userId: userId + "",
      studentUserId: userId + "",
      subjectId: subjectId + "",
    });
  } catch {
    return null;
  }
}

/**
 * Avail an extension — POST /dashboard/academic-year-extention-avail with {studentStandardId,
 * currentExtentionType "EXTENSION-1"|"EXTENSION-2", subjectId, userId}. statusCode "1" = ok;
 * Response.details: { userPaymentDetailsId (EXTENSION-2: the EXTENSION_FEE payment to pay), message }.
 */
export async function availAcademicYearExtension({ schoolUUID, userId, studentStandardId, subjectId, currentExtentionType }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/dashboard/academic-year-extention-avail", {
      studentStandardId,
      currentExtentionType,
      subjectId,
      userId,
    });
  } catch {
    return null;
  }
}

/**
 * Change the student's password — POST /{schoolUUID}/dashboard/changed-password-content
 * (ClientDashboardCommonController.changedPasswordContent → CommonUtil.resetPasswordDashbourd).
 * Each password field is individually encoded (btoa(encodeURI(val))) before the outer
 * payload wrapper, matching the legacy dashboardCommon.js changePassword() + the global
 * $.ajaxSetup beforeSend encoding chain. The controller requires a UNIQUEUUID header
 * (same as the Buzz progress-report calls). Response: {status, statusCode, message}.
 * Status "1" = success, "0"/"2" = error with message, "3" = session expired.
 */
export async function changePassword({ schoolUUID, uniqueId, oldpassword, newpassword, confirmpassword }) {
  if (!hasBackendOrigin() || !schoolUUID || !oldpassword || !newpassword || !confirmpassword) return null;
  try {
    const enc = (v) => btoa(encodeURI(v));
    const body = { oldpassword: enc(oldpassword), newpassword: enc(newpassword), confirmpassword: enc(confirmpassword) };
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/${schoolUUID}/dashboard/changed-password-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json", UNIQUEUUID: uniqueId || "", ...(await authHeaders()) },
      body: JSON.stringify({ payload: encodePayload(body) }),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * The student's short profile — POST /{schoolUUID}/api/v1/get-user-short-profile
 * (CommonController.getUserShortProfile → DashboardCommonUtil.getUserShortProfile).
 * Returns { parentId, hasPartialChild, partialChildName, partialChildUserId,
 * lastPassUpdatedDate, addSiblingFirstLogin, profileName }. For a STUDENT,
 * parentId is resolved via ParentStudentMapping; for a PARENT, directly from
 * the Parents table.
 */
export async function getUserShortProfile({ schoolUUID, userId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/api/v1/get-user-short-profile", { userId });
  } catch {
    return null;
  }
}

/**
 * ADD_SIBILING_BTN (CONFIGURATION) — the per-school toggle that gates the
 * "Add More Siblings" button on the student dashboard. Same getSettingValue
 * pattern as isDashboardViaNextjs above. Only the literal "true" counts.
 */
export async function isAddSiblingEnabled(schoolUUID) {
  const value = String(await getSettingValue(schoolUUID, "CONFIGURATION", "ADD_SIBILING_BTN")).trim().toLowerCase();
  return value === "true";
}

/**
 * Save the user's appearance preferences to the USER_THEME table via
 * POST /{schoolUUID}/api/v1/update-theme (CommonController.updateUserTheme
 * -> DashboardCommonUtil.updateUserTheme). The backend stores the whole
 * colorObj JSON in USER_THEME.COLOR_CODE and tracks edit counts.
 */
export async function saveUserTheme({ schoolUUID, userId, appearance }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  try {
    return await postDashboardPayload(schoolUUID, "/api/v1/update-theme", {
      userId,
      colorObj: { appearance },
    });
  } catch {
    return null;
  }
}

/**
 * "Need help?" WhatsApp contact for the header - legacy getChatEligibility(): POST /{schoolUUID}/api/v1/get-chat-eligibility
 * { userId, schoolId } -> { ELIGIBLE_FOR_NEED_HELP: "Y"|"N", whatsAppIsd, whatsAppNumber }. Returns the wa.me address
 * only when the school has a Need Help number, else null (no link shown).
 */
export async function getNeedHelpContact({ schoolUUID, userId, schoolNumericId }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId || !schoolNumericId) return null;
  try {
    const answer = await postDashboardPayload(schoolUUID, "/api/v1/get-chat-eligibility", { userId, schoolId: schoolNumericId });
    if (answer?.ELIGIBLE_FOR_NEED_HELP !== "Y") return null;
    const number = `${answer.whatsAppIsd ?? ""}${answer.whatsAppNumber ?? ""}`.replace(/\D/g, "");
    return number ? { href: `https://wa.me/+${number}?text=I+need+support.` } : null;
  } catch {
    return null;
  }
}

/**
 * App-install prompt eligibility - legacy checkAppActivityEligibility(): GET /{UNIQUEUUID}/api/v1/dashboard/app-last-activity
 * -> { status: 2, showInstallModal, appUsed }. The server decides (FCM install status + last-active grace);
 * true = this student has not used the app, so the install popup may show.
 */
export async function getAppInstallPromptEligible({ uniqueId }) {
  if (!hasBackendOrigin() || !uniqueId) return false;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/${encodeURIComponent(uniqueId)}/api/v1/dashboard/app-last-activity`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      cache: "no-store",
    });
    const answer = await parseJsonResponse(response);
    return Boolean(answer && String(answer.status) === "2" && (answer.showInstallModal === true || answer.appUsed === false));
  } catch {
    return false;
  }
}

/**
 * Activity details - legacy renderViewActitifyDetails(): POST /{schoolUUID}/dashboard/view-extra-activity
 * { activityId, meetingId, userId, occurrenceDate } -> { status: 1, categoryName, activityPurpose, activityTitle, filePath,
 * uploadFile, showLinkBeforeMinutes, joiningLink, ... }. Null on any failure.
 */
export async function getActivityDetails({ schoolUUID, userId, activityId, occurrenceDate }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId || !activityId) return null;
  try {
    const request = { activityId: String(activityId), meetingId: "", userId };
    if (occurrenceDate) request.occurrenceDate = occurrenceDate;
    return await postDashboardPayload(schoolUUID, "/dashboard/view-extra-activity", request);
  } catch {
    return null;
  }
}
