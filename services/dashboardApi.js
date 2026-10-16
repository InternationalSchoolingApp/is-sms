"use server";

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
