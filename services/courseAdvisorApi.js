"use server";

import { getAccountSession, withSmsAuth } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Server Actions for the AI Course Advisor on Step 3 (backend:
 * ClientCourseAdvisorController in is-rest-api). Identity is established via
 * the Bearer token in withSmsAuth — the backend reads it through AuthContext
 * and does not require userId/loginHash in the payload body.
 *
 * All endpoints answer 200 with { status, statusCode, message, ... };
 * status "3" means session out. Every call here is user-initiated — nothing
 * runs until the student opens the AI Suggester.
 *
 * Add Another Student: the session is the parent's (or a sibling's), so each
 * call also names the child in `studentUserId`. The backend only accepts it
 * for a child of the same parent and then works entirely as that child.
 */

const BASE_PATH = "student/enrollment/ai-course-advisor";
const SESSION_OUT = { status: "3" };

/** Adds studentUserId only when a child is named, so the main signup sends exactly what it did before. */
function forStudent(data, studentUserId) {
  return studentUserId ? { ...data, studentUserId: Number(studentUserId) } : data;
}

async function postAdvisor(schoolUUID, path, data) {
  const session = await getAccountSession();
  if (!session?.userId) return SESSION_OUT;
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID are required for the AI Course Advisor");
  }
  const response = await fetch(
    `${await resolveServerBackendOrigin()}/${schoolUUID}/${BASE_PATH}/${path}`,
    withSmsAuth({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: encodePayload(data) }),
    })
  );
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
export async function getAdvisorStart(schoolUUID, { studentUserId } = {}) {
  return postAdvisor(schoolUUID, "init", forStudent({}, studentUserId));
}

/** answers: { questionId: [optionValue, ...] }; marksheetId: a confirmed marksheet, optional. */
export async function getAdvisorSuggestions(schoolUUID, { answers, marksheetId, studentUserId }) {
  return postAdvisor(schoolUUID, "recommend", forStudent({ answers: answers || {}, marksheetId: marksheetId ?? null }, studentUserId));
}

/** itemIds: all suggestions or only the ticked ones; confirmations: types the student agreed to. */
export async function applyAdvisorSuggestions(schoolUUID, { recommendationId, itemIds, confirmations, studentUserId }) {
  return postAdvisor(
    schoolUUID,
    "apply",
    forStudent({ recommendationId, itemIds: itemIds || [], confirmations: confirmations || [] }, studentUserId)
  );
}

export async function dismissAdvisorSuggestions(schoolUUID, { recommendationId, itemIds, studentUserId }) {
  return postAdvisor(schoolUUID, "dismiss", forStudent({ recommendationId, itemIds: itemIds || [] }, studentUserId));
}

export async function confirmAdvisorMarksheet(schoolUUID, { marksheetId, board, gradeLevel, subjects, studentUserId }) {
  return postAdvisor(
    schoolUUID,
    "marksheet/confirm",
    forStudent({ marksheetId, board, gradeLevel, subjects: subjects || [] }, studentUserId)
  );
}

/** history: earlier turns [{ role: "student" | "advisor", text }]; the backend caps and normalises it. */
export async function askAdvisor(schoolUUID, { question, history, marksheetId, studentUserId }) {
  return postAdvisor(
    schoolUUID,
    "chat",
    forStudent({ question, history: history || [], marksheetId: marksheetId ?? null }, studentUserId)
  );
}
