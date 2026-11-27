// Global session-expired state, shared by every API entry point (no React, no server code).
//
// Two places notice a dead session and both call markSessionExpired():
//   - the central server helper (utils/backendRequest.js) answers { sessionExpired: true }, which the client
//     gate (utils/serverCall.js) turns into a SessionExpiredError, and
//   - the dashboard's query-cache watcher (hooks/useDashboardSessionExpiry.js) for every other query.
// Once marked, the gate refuses new calls, the query client pauses (components/providers/QueryProvider.jsx)
// and the global dialog (components/providers/SessionExpiredDialog.jsx) opens - once.

export const SESSION_EXPIRED_MESSAGE = "Your session has been logged out";
export const SESSION_EXPIRED_CODE = "SESSION_EXPIRED";

export class SessionExpiredError extends Error {
  constructor() {
    super(SESSION_EXPIRED_MESSAGE);
    this.name = "SessionExpiredError";
    this.code = SESSION_EXPIRED_CODE;
  }
}

export const isSessionExpiredError = (error) => error instanceof SessionExpiredError || error?.code === SESSION_EXPIRED_CODE;

// SeriConstant.STATUS_CODE_SESSION_OUT: the Java side answers {status: "3", statusCode: "E002", ...} when its
// HttpSession is gone; the ResponseCommon endpoints keep status "SUCCESS" and put "3" in statusCode with the
// "session has been timed out" message.
export function isSessionOutResponse(data) {
  if (data == null || typeof data !== "object") return false;
  if (String(data.status) === "3") return true;
  return String(data.statusCode) === "3" && /session/i.test(String(data.message || ""));
}

let expired = false;
const listeners = new Set();

export const isSessionExpired = () => expired;

/** Marks the session as expired. Returns true only the first time (so only one dialog ever opens). */
export function markSessionExpired() {
  if (expired) return false;
  expired = true;
  listeners.forEach((listener) => listener());
  return true;
}

export function subscribeSessionExpired(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// For tests only.
export function resetSessionExpiredForTests() {
  expired = false;
  listeners.clear();
}
