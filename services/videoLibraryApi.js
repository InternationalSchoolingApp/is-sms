"use server";

import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Video Library (sidebar pageLink `student-video-library`) — legacy studentVideoLibrary.js ->
 * VideoLibraryController ({schoolUUID}/api/v1/video-library/student/...) -> VideoLibraryUtil.
 * Every endpoint is an existing JSON endpoint; body = { payload: encode({schoolId, userId, ...}) }
 * with the numeric school id. Answers use ResponseCommon: status "SUCCESS" / "FAILED" / "EXCEPTION".
 *
 * VideoLibraryUtil trusts the userId in the payload, so identity (userId, school) is read from the
 * next-auth session on the server, never taken from the browser (same as services/cartApi.js).
 * Non-2xx / empty / non-JSON responses come back as null.
 */

async function identity() {
  const session = await getAccountSession();
  if (!session?.userId || !session?.schoolUUID || !session?.schoolNumericId) return null;
  return { userId: Number(session.userId), schoolUUID: session.schoolUUID, schoolId: Number(session.schoolNumericId) };
}

// The signed-in user's SMS access token (Bearer) + this server's service key. The backend knows the user from
// the token (lib/auth/session.js); the browser's cookies are no longer forwarded.
async function authHeaders() {
  return { ...serviceKeyHeaders(), ...(await smsAuthHeaders()) };
}

async function parseJsonResponse(response) {
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function callVideoLibrary(path, extra = {}) {
  const me = await identity();
  if (!hasBackendOrigin() || !me) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/${me.schoolUUID}/api/v1/video-library/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ payload: encodePayload({ schoolId: me.schoolId, userId: me.userId, ...extra }) }),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * The student's course playlists — student/playlists. details = VideoStudentLibraryDTO
 * { access: VideoAccessDTO | null, playlists: VideoPlaylistDetailDTO[] } (an older server answers a
 * plain list = no paywall). Locked courses carry titles / thumbnails only.
 */
export async function getStudentVideoPlaylists() {
  return callVideoLibrary("student/playlists");
}

/** Watch progress — student/progress {videoId, position, duration, ended}; details = VideoProgressDTO. */
export async function saveVideoWatchProgress({ videoId, position, duration, ended }) {
  return callVideoLibrary("student/progress", {
    videoId: Number(videoId),
    position: Math.max(0, Math.floor(Number(position) || 0)),
    duration: Math.max(0, Math.floor(Number(duration) || 0)),
    ended: Boolean(ended),
  });
}

/** The one-time free trial — student/trial/start; details = the access after it. */
export async function startVideoLibraryTrial() {
  return callVideoLibrary("student/trial/start");
}

/** The plans the student can buy now — student/subscription/options; details = VideoCheckoutOptionsDTO. */
export async function getVideoSubscriptionOptions() {
  return callVideoLibrary("student/subscription/options");
}

/**
 * Start paying a plan — student/subscription/checkout {planCode, subjectIds}. The server prices it and
 * returns { userPaymentDetailsId, paymentLink } for the shared payment-gateway flow.
 */
export async function startVideoSubscriptionCheckout({ planCode, subjectIds }) {
  return callVideoLibrary("student/subscription/checkout", {
    planCode: String(planCode || ""),
    subjectIds: (Array.isArray(subjectIds) ? subjectIds : []).map(Number).filter(Boolean),
  });
}
