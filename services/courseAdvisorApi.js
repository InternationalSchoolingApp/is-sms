"use server";

import { auth } from "@/auth";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Server Actions for the AI Course Advisor on Step 3 (backend:
 * ClientCourseAdvisorController in is-rest-api). Kept apart from
 * studentSignupBackendApi.js because these calls prove WHO is asking
 * differently: the backend does not trust a payload userId on its own, so
 * every call here adds `userId` + `loginHash` read from the next-auth session
 * on the server (never from the browser), and the backend checks the hash
 * against USER_LOGIN_HASH. No cookies are forwarded.
 *
 * All endpoints answer 200 with { status, statusCode, message, ... };
 * status "3" means session out. Every call here is user-initiated — nothing
 * runs until the student opens the AI Suggester.
 */

const BASE_PATH = "student/enrollment/ai-course-advisor";
const SESSION_OUT = { status: "3" };

async function identity() {
  const session = await auth();
  if (!session?.userId) return null;
  return { userId: session.userId, loginHash: session.userLoginHash || "" };
}

async function postAdvisor(schoolUUID, path, data) {
  const who = await identity();
  if (!who) return SESSION_OUT;
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID are required for the AI Course Advisor");
  }
  const response = await fetch(`${resolveServerBackendOrigin()}/${schoolUUID}/${BASE_PATH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // `who` last, so nothing the browser sent can replace the session's identity.
    body: JSON.stringify({ payload: encodePayload({ ...data, ...who }) }),
  });
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Questions, marksheet limits, consent note, last confirmed marksheet. No AI call. */
export async function getAdvisorStart(schoolUUID) {
  return postAdvisor(schoolUUID, "init", {});
}

/** answers: { questionId: [optionValue, ...] }; marksheetId: a confirmed marksheet, optional. */
export async function getAdvisorSuggestions(schoolUUID, { answers, marksheetId }) {
  return postAdvisor(schoolUUID, "recommend", { answers: answers || {}, marksheetId: marksheetId ?? null });
}

/** itemIds: all suggestions or only the ticked ones; confirmations: types the student agreed to. */
export async function applyAdvisorSuggestions(schoolUUID, { recommendationId, itemIds, confirmations }) {
  return postAdvisor(schoolUUID, "apply", { recommendationId, itemIds: itemIds || [], confirmations: confirmations || [] });
}

export async function dismissAdvisorSuggestions(schoolUUID, { recommendationId, itemIds }) {
  return postAdvisor(schoolUUID, "dismiss", { recommendationId, itemIds: itemIds || [] });
}

export async function confirmAdvisorMarksheet(schoolUUID, { marksheetId, board, gradeLevel, subjects }) {
  return postAdvisor(schoolUUID, "marksheet/confirm", { marksheetId, board, gradeLevel, subjects: subjects || [] });
}

/** history: earlier turns [{ role: "student" | "advisor", text }]; the backend caps and normalises it. */
export async function askAdvisor(schoolUUID, { question, history, marksheetId }) {
  return postAdvisor(schoolUUID, "chat", { question, history: history || [], marksheetId: marksheetId ?? null });
}
