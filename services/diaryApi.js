"use server";

import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * "Student Diary" is the legacy School Diary teacher<->student/parent
 * messaging thread system (DiaryChatController, @RequestMapping("/api/diary"),
 * NOT schoolId-scoped). Payload/stateless-gated like the dashboard
 * endpoints: `sessionUserId` in the decoded body is resolved to a User
 * directly, no HTTP session cookie check — authorization instead comes from
 * per-endpoint checks against thread participants.
 *
 * A thread is teacher-created only (`thread/create` is teacher/diary-admin
 * gated) — the student side is read + reply only: list threads, read
 * messages, reply into an existing thread, mark read. No create/close from
 * here.
 */

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

async function postDiary(path, body) {
  const baseUrl = await resolveServerBackendOrigin();
  const response = await fetch(`${baseUrl}/api/diary${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: encodePayload(body) }),
  });
  return parseJsonResponse(response);
}

/**
 * The rail's real badge-count source (unlike News, this IS server-backed) —
 * legacy's #schoolDiaryBadge reads `details.unreadMessageCount`.
 */
export async function getDiaryUnreadCount({ sessionUserId }) {
  if (!hasBackendOrigin() || !sessionUserId) return null;
  try {
    return await postDiary("/thread/unread-count", { sessionUserId });
  } catch {
    return null;
  }
}

// details: { sourceTimezone, page, size, totalPages, totalElements, threads: [...] },
// each thread carrying its own unreadCount.
// `page` is 0-indexed server-side (Spring PageRequest, not the 1-indexed
// convention the website/news endpoints use) — getMyThreads defaults an
// invalid/missing page to 0, so requesting page 1 here silently skips the
// only page of results that exists.
export async function getDiaryThreadList({ sessionUserId, page = 0, size = 20 }) {
  if (!hasBackendOrigin() || !sessionUserId) return null;
  try {
    return await postDiary("/thread/my-list", { sessionUserId, page, size });
  } catch {
    return null;
  }
}

// details: { threadId, threadStatus, courseName, sourceTimezone, page, size, totalPages, totalElements, messages: [...] }.
// Same 0-indexed paging as getDiaryThreadList (see comment above).
export async function getDiaryThreadMessages({ sessionUserId, threadId, page = 0, size = 50 }) {
  if (!hasBackendOrigin() || !sessionUserId || !threadId) return null;
  try {
    return await postDiary("/thread/messages", { sessionUserId, threadId, page, size });
  } catch {
    return null;
  }
}

// details.messages: the new DiaryMessageResponseDTO just created.
export async function replyToDiaryThread({ sessionUserId, threadId, message }) {
  if (!hasBackendOrigin() || !sessionUserId || !threadId || !message) return null;
  try {
    return await postDiary("/message/reply", { sessionUserId, threadId, message });
  } catch {
    return null;
  }
}

export async function markDiaryThreadRead({ sessionUserId, threadId }) {
  if (!hasBackendOrigin() || !sessionUserId || !threadId) return null;
  try {
    return await postDiary("/thread/mark-read", { sessionUserId, threadId });
  } catch {
    return null;
  }
}
