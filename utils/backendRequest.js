import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { isSessionOutResponse } from "@/utils/sessionState";

/**
 * The central server-side door to the Java backend for session-aware calls (not a "use server" file itself:
 * "use server" services import it). One place that
 *   1. validates the signed-in user's SMS token BEFORE any request leaves the server (getAccountSession: verifies the
 *      access token, renews it with the refresh token when it has expired; no valid login -> session expired),
 *   2. sends that token as "Authorization: Bearer" (+ this server's service key) instead of any session cookie,
 *   3. recognises the backend's session-out answers, and
 *   4. never throws across the Server Action boundary (Next masks thrown messages in production):
 *      it always RETURNS { ok: true, data } or { ok: false, code, message, sessionExpired? }.
 * The client side turns that into real errors with utils/serverCall.js (callServer).
 *
 * `buildBody(session)` receives { userId, schoolUUID, schoolNumericId, email, uniqueId } from the session, so ids never
 * come from the browser. `headers(session)` adds request headers a legacy endpoint still reads (e.g. UNIQUEUUID). `path` is relative to the school: "dashboard/parent/..." -> {schoolUUID}/dashboard/...
 */

export const sessionExpiredResult = () => ({ ok: false, sessionExpired: true, code: "SESSION_EXPIRED", message: "Your session has been logged out" });
const failure = (code, message) => ({ ok: false, code, message });

export async function getSessionIdentity() {
  const session = await getAccountSession();
  if (!session?.userId || !session?.schoolUUID) return null;
  return {
    userId: Number(session.userId),
    schoolUUID: session.schoolUUID,
    schoolNumericId: session.schoolNumericId != null ? Number(session.schoolNumericId) : null,
    email: session.email || "",
    uniqueId: session.uniqueId || "",
  };
}

// The signed-in user's SMS access token (Bearer) + this server's service key. The backend knows the user from
// the token (lib/auth/session.js); the browser's cookies are no longer forwarded.
async function authHeaders() {
  return { ...serviceKeyHeaders(), ...(await smsAuthHeaders()) };
}

export async function backendRequest({ path, method = "POST", query, buildBody, headers, checkSession = "Y" }) {
  const identity = await getSessionIdentity();
  if (!identity) return sessionExpiredResult();
  if (!hasBackendOrigin()) return failure("CONFIG", "The backend is not configured.");

  const params = new URLSearchParams();
  if (checkSession) params.set("check-session", checkSession);
  Object.entries(query || {}).forEach(([key, value]) => value != null && params.set(key, String(value)));
  const queryString = params.toString();

  let response;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const url = `${baseUrl}/${identity.schoolUUID}/${path}${queryString ? `?${queryString}` : ""}`;
    const init = { method, headers: { "Content-Type": "application/json", ...(headers ? headers(identity) : {}), ...(await authHeaders()) }, cache: "no-store" };
    if (method !== "GET" && buildBody) init.body = JSON.stringify({ payload: encodePayload(buildBody(identity)) });
    response = await fetch(url, init);
  } catch (error) {
    return failure("NETWORK", error?.message || "The server could not be reached.");
  }

  const text = await response.text().catch(() => "");
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (isSessionOutResponse(data)) return sessionExpiredResult();
  if (response.status === 401) return sessionExpiredResult();
  if (!response.ok) return failure(`HTTP_${response.status}`, data?.message || `The request failed (${response.status}).`);
  if (data == null) return failure("INVALID_RESPONSE", "The server sent an invalid response.");
  return { ok: true, data };
}
