"use server";

import { cookies } from "next/headers";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { getSettingValue } from "@/services/studentSignupApi";

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
 * Uses the EXISTING backend endpoint — POST /api/v1/module-details
 * (CommonController.getModuleDetails -> ModulesUtil.getRoleAssignModuleList),
 * which returns a RoleAndModuleAssignDTO with each module's children in
 * `chiledRoleModulesDTO`. This is NOT school-slug-scoped (it is a bare
 * /api/v1/... path), and it reads identity from the payload, so no cookie is
 * needed. moduleType "M" + parentId 0 = the top-level menu (with nested
 * children). Returns null (→ caller falls back to static STUDENT_NAV) when the
 * backend/roleId is unavailable.
 *
 * Request body matches the controller: { payload: encode({schoolId, roleId,
 * userId, moduleType, parentId}) } where encode = base64(encodeURI(json))
 * (AesUtil.decode on the server).
 */
export async function getDashboardMenu({ schoolId, roleId, userId }) {
  if (!hasBackendOrigin() || !roleId || !schoolId) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const body = { payload: encodePayload({ schoolId, roleId, userId, moduleType: "M", parentId: 0 }) };
    const response = await fetch(`${baseUrl}/api/v1/module-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log(response)
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
 * the event's own `url` field (CalendarEventDTO.url), which returns a
 * calendarMeetingLinkValidateStudent-shaped JSON (status, dateStatus:
 * "past"|"future"|"between", commonJoinUrlOfSMS, meetingJoinModalHideMin,
 * joinType, userRole) rather than an HTML page — the browser is sent to
 * `commonJoinUrlOfSMS` only once we know dateStatus is "between" (live).
 * Ported from static analysis of dashboardCalendarNew.js's
 * classDetailsOnModal/proceedwithControll — not yet confirmed against a
 * live class session, so treat unexpected response shapes defensively.
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
