import { SessionExpiredError, isSessionExpired, markSessionExpired } from "@/utils/sessionState";

/**
 * Client gate for Server Action calls that use the central backend helper (utils/backendRequest.js).
 *   - Session already expired: the call is blocked here - no request is made.
 *   - { ok: true, data }: returns data.
 *   - { sessionExpired: true }: opens the global dialog (once) and throws SessionExpiredError.
 *   - any other failure: throws Error("<code>: <backend message>") - the backend's own message is kept.
 */
export async function callServer(action) {
  if (isSessionExpired()) throw new SessionExpiredError();
  let result;
  try {
    result = await action();
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
  if (!result || typeof result !== "object") throw new Error("INVALID_RESPONSE: The server sent an empty response.");
  if (result.ok) return result.data;
  if (result.sessionExpired) {
    markSessionExpired();
    throw new SessionExpiredError();
  }
  throw new Error(result.code ? `${result.code}: ${result.message}` : String(result.message || "The request failed."));
}
