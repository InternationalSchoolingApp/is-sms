"use server";

import { cookies } from "next/headers";
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJsonResponse(response);
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
      headers: { "Content-Type": "application/json" },
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
 * gates on sessionUtil.getUserId() — i.e. a real HTTP session, not just the
 * decoded payload — so the browser's own session cookie must be forwarded on
 * this server-to-server call (see getSessionCookieHeader doc comment).
 */
async function getSessionCookieHeader() {
  // Deliberately forwards every cookie the browser sent on the incoming
  // request (not just one known name): the Java backend's own session
  // cookie's name isn't something this codebase owns/controls, and the
  // local dev proxy (next.config.mjs's /:schoolId/dashboard/:path* rewrite)
  // keeps it same-origin, so it rides along with everything else next-auth
  // already sets on this origin.
  try {
    return (await cookies()).toString();
  } catch {
    return "";
  }
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
    headers: { "Content-Type": "application/json", Cookie: await getSessionCookieHeader() },
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
      headers: { "Content-Type": "application/json", Cookie: await getSessionCookieHeader() },
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
      headers: { "Content-Type": "application/json", Cookie: await getSessionCookieHeader() },
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
      headers: { Cookie: await getSessionCookieHeader() },
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
