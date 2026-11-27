"use server";

import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Class feedback (legacy feedbackStudentTeacher.js openClassFeedback): POST /{schoolUUID}/dashboard/get-feedback-submission
 * (ClientSchoolCalendarController.getFeedbackSubmission -> DashboardSchoolCalendarUtil). The backend decides what to show:
 *   S001 feedback already submitted     -> details = the embed URL of the submitted answers
 *   S002 feedback not submitted yet     -> details = the embed URL of the form
 *   S003 the student did not attend     -> nothing to show
 *   S004 no feedback form is mapped     -> nothing to show
 * The signed-in student (userId) and school (schoolId) come from the session on the server, never from the browser; the
 * name and the event are what the legacy page sent. The backend finds the student's role itself.
 *
 * Returns { ok: true, data: { statusCode, message, details } } or { ok: false, code, message, sessionExpired? } -
 * call it through callServer() (utils/serverCall.js).
 */
export async function getFeedbackSubmission({ entityType, entityId, userFullName, eventDateTime }) {
  const me = await getAccountSession();
  if (!me?.userId || !me?.schoolUUID || !hasBackendOrigin()) {
    return { ok: false, sessionExpired: true, code: "AUTH", message: "Please sign in again." };
  }
  if (!entityType || !entityId || !userFullName || !eventDateTime) {
    return { ok: false, code: "V001", message: "This class cannot be rated right now." };
  }
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/${me.schoolUUID}/dashboard/get-feedback-submission`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...serviceKeyHeaders(), ...(await smsAuthHeaders()) },
      body: JSON.stringify({
        payload: encodePayload({
          entityType: String(entityType),
          entityId: String(entityId),
          userId: me.userId,
          schoolId: me.schoolNumericId,
          userFullName: String(userFullName),
          eventDateTime: String(eventDateTime),
        }),
      }),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, code: "HTTP", message: "Something went wrong. Please try again." };
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!data) return { ok: false, code: "EMPTY", message: "Something went wrong. Please try again." };
    if (String(data.status) === "3") return { ok: false, sessionExpired: true, code: "AUTH", message: data.message || "Session expired." };
    // The embed URL is put in an iframe: only a web address is ever handed to the browser.
    const details = typeof data.details === "string" && /^https?:\/\//i.test(data.details) ? data.details : "";
    return { ok: true, data: { statusCode: data.statusCode || "", message: data.message || "", details } };
  } catch {
    return { ok: false, code: "NET", message: "Something went wrong. Please try again." };
  }
}
