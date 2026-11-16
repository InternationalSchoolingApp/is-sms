// Lets the calendar and its popups talk to the class feedback host (components/dashboard/ClassFeedbackHost.jsx), the
// same way the K-5 buddy is reached (components/k5/pico/picoEvents.js).

export const FEEDBACK_OPEN_EVENT = "is-feedback-open";
export const FEEDBACK_ENDED_EVENT = "is-feedback-ended";

/** Rate this class / activity now (the "Rate this class" buttons). `rightSlide`: the weekly list opens it as a side panel. */
export function openClassFeedback(info, { rightSlide = false } = {}) {
  if (typeof window === "undefined" || !info) return;
  window.dispatchEvent(new CustomEvent(FEEDBACK_OPEN_EVENT, { detail: { info, rightSlide } }));
}

/** A class / activity that was live has just ended: the host opens the feedback after the configured delay. */
export function notifyFeedbackEventEnded(info) {
  if (typeof window === "undefined" || !info) return;
  window.dispatchEvent(new CustomEvent(FEEDBACK_ENDED_EVENT, { detail: { info } }));
}
