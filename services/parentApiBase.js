import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Shared server-side plumbing of the parent dashboard BFF files (services/parent*Api.js, each "use server").
 * Not itself a "use server" file: it is only imported by those, never by the browser.
 *
 * Every call is POST {backend}/{schoolUUID}<path> with the standard {payload: encodePayload(body)} envelope, the
 * signed-in parent's SMS token as Bearer and this server's service key. The parent is always the session user;
 * the child (studentUserId) is passed by the page and verified by the backend against the parent-student mapping.
 */

async function authHeaders() {
  return { ...serviceKeyHeaders(), ...(await smsAuthHeaders()) };
}

async function parseJson(response) {
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The signed-in parent's user id (from the session), or null when nobody is signed in. */
export async function parentSessionUserId() {
  const session = await getAccountSession();
  return session?.userId ?? null;
}

/**
 * POST a parent dashboard endpoint. `query` is an optional object of query-string params (e.g. {"check-session": "Y"}).
 * Returns the parsed JSON, or null when there is no backend, the school is missing, or the call failed.
 */
export async function parentPost(schoolUUID, path, body, query) {
  if (!hasBackendOrigin() || !schoolUUID) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const qs = query && Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
    const response = await fetch(`${baseUrl}/${schoolUUID}${path}${qs}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ payload: encodePayload(body) }),
    });
    return await parseJson(response);
  } catch {
    return null;
  }
}
