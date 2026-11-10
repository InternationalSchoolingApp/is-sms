// This browser's own random id for payments, kept in localStorage (the dashboard uses the same key). Sent with
// Pay so that, when this browser comes back after its checkout tab was closed, the "payment already in progress"
// pop-up can be skipped. "" when storage is unavailable (private mode, server render): the pop-up then shows.
const KEY = "isPaymentBrowserId";

export function getPaymentBrowserId() {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

// The browser that started the open payment is back. Same fee and gateway with a checkout to reopen: return
// that URL. Otherwise null, and the caller closes it at the gateway and starts again.
export function resumeUrlForThisBrowser(attempt, chosenGatewayName) {
  if (!attempt?.sameBrowser || attempt.sameFee === false || !attempt.canContinue) return null;
  if (String(attempt.gateway || "").toLowerCase() !== String(chosenGatewayName || "").toLowerCase()) return null;
  return typeof attempt.continueUrl === "string" && /^https?:\/\//i.test(attempt.continueUrl) ? attempt.continueUrl : null;
}
