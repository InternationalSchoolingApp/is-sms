/*
 * Browser side of the School Diary reads: requests to this app's /api/diary route (app/api/diary/route.js) instead of
 * Server Actions, so they are not queued behind the dashboard's other (slow) server actions. Same answers as the old
 * services/diaryApi.js calls: the backend's JSON, or null when it could not be read.
 *
 * `account` is the dashboard's own user (context.uniqueId, the id the browser's sign-in cookies are named after). It goes
 * in the X-Account header so the route answers for the student whose dashboard this is. Without it the route would fall
 * back to whatever account the tab last remembered - with several people signed in to one browser that can be someone
 * else, whose diary has no unread notes, and the badge then never shows. (The proxy that picks the account for page
 * requests does not run for /api routes.) It only chooses among the accounts this browser is already signed in to.
 */
import { diaryLog } from "@/utils/diaryDebug";

const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;

async function askDiary(action, params = {}, account) {
  const headers = { "Content-Type": "application/json" };
  if (typeof account === "string" && ACCOUNT_ID.test(account)) headers["X-Account"] = account;
  const started = Date.now();
  diaryLog(`request ${action}`, { ...params, account: headers["X-Account"] || "(none - tab's remembered account)" });
  try {
    const response = await fetch("/api/diary", {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({ action, ...params }),
    });
    if (!response.ok) {
      diaryLog(`answer ${action} FAILED`, { httpStatus: response.status, ms: Date.now() - started });
      return null;
    }
    const answer = await response.json();
    diaryLog(`answer ${action}`, {
      httpStatus: response.status,
      ms: Date.now() - started,
      unreadMessageCount: answer?.details?.unreadMessageCount,
      unreadThreadCount: answer?.details?.unreadThreadCount,
      threads: Array.isArray(answer?.details?.threads) ? answer.details.threads.map((t) => `${t.threadId}:${t.unreadCount}`).join(",") : undefined,
      badgeVersion: action === "badge-version" ? answer : undefined,
    });
    return answer;
  } catch (error) {
    diaryLog(`answer ${action} ERROR`, { error: String(error), ms: Date.now() - started });
    return null;
  }
}

/** details.unreadMessageCount is the badge (legacy #schoolDiaryBadge). */
export const getDiaryUnreadCount = ({ account } = {}) => askDiary("unread-count", {}, account);

/** details: { sourceTimezone, page, size, totalPages, totalElements, threads }, pages are 0-indexed. */
export const getDiaryThreadList = ({ account, page = 0, size = 20 } = {}) => askDiary("threads", { page, size }, account);

/** details: { threadId, threadStatus, courseName, sourceTimezone, page, size, totalPages, messages } (each page oldest first). */
export const getDiaryThreadMessages = ({ account, threadId, page = 0, size = 20 }) => askDiary("messages", { threadId, page, size }, account);

export const markDiaryThreadRead = ({ account, threadId }) => askDiary("mark-read", { threadId }, account);

/** { status: 200, version, etag } | { status: 304 } | { status: <error> } | { status: 0 } (could not reach the app). */
export async function getDiaryBadgeVersion({ account, etag } = {}) {
  return (await askDiary("badge-version", etag ? { etag } : {}, account)) || { status: 0 };
}
