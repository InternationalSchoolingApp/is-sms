import { NextResponse } from "next/server";
import { getAccountSession } from "@/lib/auth/session";
import { getDiaryBadgeVersion, getDiaryMentionUsers, getDiaryThreadList, getDiaryThreadMessages, getDiaryUnreadCount, markDiaryThreadRead } from "@/services/diaryApi";

/**
 * The School Diary reads for the student dashboard, as a Route Handler instead of Server Actions.
 *
 * Server Actions are sent one at a time by the browser (Next.js: "Server Actions are queued. Using them for data fetching
 * introduces sequential execution"). On the dashboard many slow calls run as actions, so the diary badge's refresh waited
 * behind all of them and showed up a minute late, or was dropped when it was asked for again. Plain requests to this route
 * run side by side with everything else.
 *
 * The person is always the signed-in user of this tab (the X-Account header the page adds to its own requests, read by
 * getAccountSession) - never an id sent by the browser. The backend calls are the existing ones in services/diaryApi.js
 * (same /api/diary endpoints, same payload and token); nothing new on the backend.
 *
 * POST { action: "unread-count" | "threads" | "messages" | "mark-read" | "badge-version", page?, size?, threadId?, etag? }
 * -> the backend's own answer (badge-version: { status, version, etag }), 401 when nobody is signed in, 502 when the
 * backend did not answer.
 */
const reply = (status, body) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const toInt = (value, fallback) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

export async function POST(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.userId) {
    return reply(401, { message: "Your session has been logged out" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { message: "Bad request" });
  }
  const sessionUserId = me.userId;
  const threadId = body?.threadId != null && /^\d+$/.test(String(body.threadId)) ? Number(body.threadId) : null;
  const page = toInt(body?.page, 0);
  const size = Math.min(toInt(body?.size, 20), 50);

  let answer;
  switch (body?.action) {
    case "unread-count":
      answer = await getDiaryUnreadCount({ sessionUserId });
      break;
    case "threads":
      answer = await getDiaryThreadList({ sessionUserId, page, size });
      break;
    case "messages":
      if (!threadId) return reply(400, { message: "Bad request" });
      answer = await getDiaryThreadMessages({ sessionUserId, threadId, page, size });
      break;
    case "mention-users":
      if (!threadId) return reply(400, { message: "Bad request" });
      answer = await getDiaryMentionUsers({ sessionUserId, threadId });
      break;
    case "mark-read":
      if (!threadId) return reply(400, { message: "Bad request" });
      answer = await markDiaryThreadRead({ sessionUserId, threadId });
      break;
    case "badge-version": {
      const version = await getDiaryBadgeVersion({ etag: typeof body?.etag === "string" ? body.etag.slice(0, 64) : undefined });
      return reply(200, version);
    }
    default:
      return reply(400, { message: "Bad request" });
  }
  return answer ? reply(200, answer) : reply(502, { message: "The diary could not be loaded right now." });
}
