import { encodePayload, encodeRawString } from "@/utils/payloadEncoding";
import { isBackendOverrideAllowed, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { getHash, getSystemTimezone } from "@/utils/common";
import { withServiceKey } from "@/lib/auth/session";

/**
 * Exchanges a one-time SSO token (issued by the legacy Java login page,
 * Login.jsp, when a STUDENT with an in-progress enrollment logs in there)
 * for that user's identity — the backend invalidates the token after this
 * call, so it can only ever be exchanged once. Called only from
 * auth.js's "sso-token" CredentialsProvider (server-side, inside
 * app/api/sso/route.js's signIn() call), same reasoning as login() above
 * for using resolveServerBackendOrigin() instead of the browser-facing one.
 *
 * Endpoint: POST {schoolId}/api/v1/common/sso/exchange — CommonController
 * (where this endpoint and loginUser() both live) has a class-level
 * {schoolId} path prefix, so — same as login() above — schoolUUID must be
 * included even though it wasn't obvious the caller (app/api/sso/route.js)
 * would need it: the backend puts it in the SSO redirect URL's own `school`
 * query param specifically so this call can include it (see
 * CommonUtil#getLogin's SSO branch on the backend).
 *
 * @param {string} schoolUUID
 * @param {string} ssoToken
 * @param {string} [backendOverride] On a UAT deployment with multiple
 *   backend instances (see components/common/BackendSwitcher.jsx), a
 *   student can land on Login.jsp on ANY of them directly — there is no
 *   picker involved, so the uat_backend_override cookie is never set before
 *   this handoff happens. app/api/sso/route.js detects which instance the
 *   browser came from (via the Referer header on the handoff navigation)
 *   and passes it explicitly here, so the exchange call hits the SAME
 *   instance that issued the token — not whatever NEXT_PUBLIC_BACKEND_BASE_URL
 *   happens to be configured to. Falls back to resolveServerBackendOrigin()
 *   (the cookie/env chain) when absent, same as every other caller.
 * @returns {Promise<{status: string, uniqueId?: string, userId?: number,
 *   userLoginHash?: string, schoolUUID?: string, schoolNumericId?: number,
 *   schoolName?: string, message?: string}|null>}
 */
export async function exchangeSsoToken(schoolUUID, ssoToken, backendOverride) {
  const baseUrl = (isBackendOverrideAllowed() && backendOverride) || (await resolveServerBackendOrigin());
  if (!baseUrl || !schoolUUID || !ssoToken) {
    console.error("exchangeSsoToken: missing baseUrl, schoolUUID or ssoToken", {
      baseUrl,
      schoolUUID,
      hasToken: !!ssoToken,
    });
    return null;
  }

  const url = `${baseUrl}/${schoolUUID}/api/v1/common/sso/exchange`;
  let response;
  try {
    response = await fetch(url, withServiceKey({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: encodePayload({ ssoToken }) }),
    }));
  } catch (err) {
    console.error("exchangeSsoToken: fetch threw", url, err);
    return null;
  }

  // Temporary diagnostic — this is the first live run of this path; remove
  // once the handoff is confirmed working end to end.
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("exchangeSsoToken: non-OK response", url, response.status, text);
    return null;
  }
  return response.json();
}

