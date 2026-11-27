"use server";

import { getAccountSession, withSmsAuth } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Server Action for the Class Quality screen.
 *
 * Reads a single class's per-student class-analytics report from is-rest-api.
 * The report is produced by the class-app webhook receiver (new package
 * com.c2e.is.v1.classapp in is-rest-api), which folds the on-device derived
 * signals (camera/look/speaking/handRaised — no raw media) into per-student
 * durations and class averages, keyed to LENS_SESSION.SESSION_ID (the class's
 * externalId).
 *
 * Identity is the signed-in user's Bearer token (withSmsAuth), the same as the
 * AI Course Advisor actions — the backend reads it through AuthContext.
 *
 * Confirmed response JSON (the backend wraps the report with a status field —
 * "1" ok, "0" failed/not-found/no-report-yet, "3" signed out). On "0"/"3" the
 * report fields are null and `message` holds the reason:
 *   {
 *     status: "1",
 *     message: null,
 *     session: { externalId, startedAt, endedAt },   // endedAt null while live
 *     participantReports: [{
 *       externalId, role, presentSeconds, cameraOnSeconds, attentiveSeconds,
 *       attentionPercent, speakingSeconds, handRaisedSeconds, lookedAwayCount
 *     }],
 *     averages: { count, avgAttentionPercent, avgCameraOnSeconds, handsRaised, spoke30s }
 *   }
 * attentionPercent / avgAttentionPercent are decimals (e.g. 70.00); seconds are ints.
 */

// Confirmed with the is-rest-api read-endpoint session: a signed-in dashboard
// call — POST {backend}/{schoolUUID}/dashboard/classapp/session-report, gated on
// a Class Quality view right, body { payload: encodePayload({ sessionExternalId }) }.
// (The endpoint also accepts { lensClassId } to fall back to the latest Lens
// session for a class; this screen selects by session externalId.)
const CLASS_QUALITY_READ_PATH = "dashboard/classapp/session-report";

const SESSION_OUT = { ok: false, status: "3", error: "session-out" };

/**
 * Fetch the Class Quality report for one class/lens session.
 *
 * @param {string} schoolUUID  session.schoolUUID of the signed-in user.
 * @param {{ sessionExternalId: string }} args  the class's externalId (LENS_SESSION.SESSION_ID).
 * @returns {Promise<{ ok: true, data: object | null, message?: string | null } | { ok: false, status?: string, error: string }>}
 *   data is the report on status "1", or null with an optional `message` when there is no report yet (status "0").
 */
export async function getClassQualityReport(schoolUUID, { sessionExternalId } = {}) {
  const session = await getAccountSession();
  if (!session?.userId) return SESSION_OUT;

  if (!hasBackendOrigin() || !schoolUUID) {
    return { ok: false, error: "no-backend-origin" };
  }
  if (!sessionExternalId) {
    return { ok: false, error: "no-session-id" };
  }

  let response;
  try {
    response = await fetch(
      `${await resolveServerBackendOrigin()}/${schoolUUID}/${CLASS_QUALITY_READ_PATH}`,
      await withSmsAuth({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: encodePayload({ sessionExternalId }) }),
        cache: "no-store",
      })
    );
  } catch (err) {
    console.error("[classQuality] fetch failed:", err);
    return { ok: false, error: "fetch-failed" };
  }

  if (response.status === 401 || response.status === 403) return SESSION_OUT;
  if (!response.ok) return { ok: false, status: String(response.status), error: "backend-error" };

  const text = await response.text();
  if (!text) return { ok: false, error: "empty-response" };

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("[classQuality] non-JSON response");
    return { ok: false, error: "bad-json" };
  }

  // The backend answers 200 with a status wrapper: "1" ok, "0" failed/no-report,
  // "3" signed out. Fold it into the { ok, data } convention.
  if (body?.status === "3") return SESSION_OUT;
  if (body?.status === "1") {
    return {
      ok: true,
      data: {
        session: body.session ?? null,
        participantReports: Array.isArray(body.participantReports) ? body.participantReports : [],
        averages: body.averages ?? null,
      },
    };
  }
  // status "0" (or anything else): no usable report — render the empty/placeholder
  // state, surfacing the backend's reason when it gave one.
  return { ok: true, data: null, message: typeof body?.message === "string" ? body.message : null };
}
