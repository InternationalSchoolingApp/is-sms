"use server";

import { resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { withSmsAuth } from "@/lib/auth/session";

/**
 * Cross-app single-logout support: asks the Java backend (is-rest-api) whether this
 * uniqueId is still logged in THERE — independently of this app's own session.
 * Backend: GET {schoolId}/api/v1/common/session-status/{uniqueId}
 * (CommonController#getSessionStatusByUniqueId), looked up purely from the user's
 * USER_LOGIN_HASH column (set on login, nulled on logout — see CommonUtil#sessionOut)
 * rather than an HttpSession, so it works cross-origin with no shared cookie.
 *
 * A server action, not a browser fetch: this app is served over HTTPS while the
 * backend is plain HTTP on UAT, and browsers refuse an http:// request from an
 * https:// page as mixed active content — the poll was blocked every minute. Asking
 * from the server has no such restriction, and resolveServerBackendOrigin() still
 * honours the UAT backend-override cookie, so the picker keeps working.
 *
 * The endpoint needs a signed-in user, so the call carries the tab's SMS token (withSmsAuth). Sent without one it
 * was refused with 401, which the rule below read as "still logged in": the poll never logged anyone out.
 *
 * Returns true (assume valid) on any network/parse failure so a flaky request never
 * logs a user out by mistake — only an explicit `false` from the backend does that.
 *
 * @param {string} schoolUUID
 * @param {string} uniqueId
 * @returns {Promise<boolean>}
 */
export async function checkBackendSessionStatus(schoolUUID, uniqueId) {
  if (!schoolUUID || !uniqueId) return true;
  const baseUrl = await resolveServerBackendOrigin();
  if (!baseUrl) return true;

  try {
    const response = await fetch(
      `${baseUrl}/${schoolUUID}/api/v1/common/session-status/${encodeURIComponent(uniqueId)}`,
      await withSmsAuth({ method: "GET", cache: "no-store" })
    );
    if (!response.ok) return true;
    const stillValid = await response.json();
    return stillValid !== false;
  } catch (err) {
    console.error("checkBackendSessionStatus: fetch threw", err);
    return true;
  }
}
