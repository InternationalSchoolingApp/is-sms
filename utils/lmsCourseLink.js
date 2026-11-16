import toast from "react-hot-toast";
import { markSessionExpired } from "@/utils/sessionState";

/**
 * Opens an LMS link (a "…/lms-platform/redirect-user-to-LMS/{uniqueId}?lmsId=N" address of the backend) in a new tab.
 * The browser cannot go there itself — the backend page does not know a student signed in on this app — so the
 * server (app/api/lms/redirect) makes the request with the student's token and answers with the LMS address.
 * The tab is opened first, inside the click, so the browser does not block it as a pop-up, then pointed there.
 */
export async function openLmsLink(lmsProviderUrl) {
  const tab = window.open("", "_blank");
  try {
    const response = await fetch(`/api/lms/redirect?url=${encodeURIComponent(lmsProviderUrl)}`, { cache: "no-store" });
    const body = await response.json().catch(() => null);
    if (response.status === 401 && body?.sessionExpired) markSessionExpired();
    if (!response.ok || !body?.url) throw new Error(body?.message || "The course could not be opened right now. Please try again.");
    if (tab) tab.location.href = body.url;
    else window.location.href = body.url;
  } catch (error) {
    if (tab) tab.close();
    toast.error(String(error?.message || "The course could not be opened right now. Please try again."));
  }
}

/**
 * A lesson of the course calendar (legacy redirectLmsFromStudentCourse, dashboardCommon.js): a pending LMS payment
 * shows its message instead, a lesson without a link says so, otherwise the LMS opens in a new tab.
 */
export function openLmsLesson({ isPayLmsPaymentPending, lmsProviderUrl }) {
  if (isPayLmsPaymentPending) {
    toast.error(String(isPayLmsPaymentPending));
    return;
  }
  if (!lmsProviderUrl) {
    toast.error("Course content is not available.");
    return;
  }
  openLmsLink(lmsProviderUrl);
}

/** The calendar answers "N/A" for a lesson with no targeted due date. */
export const hasDueDate = (dueDate) => Boolean(dueDate) && String(dueDate).trim().toUpperCase() !== "N/A";
