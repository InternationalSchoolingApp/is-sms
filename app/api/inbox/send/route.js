import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { MAX_MESSAGE, MAX_SUBJECT, SEND_ERROR, SEND_UNREACHABLE, fileProblem } from "@/utils/inbox";
import { encodePayload } from "@/utils/payloadEncoding";
import { isSessionOutResponse } from "@/utils/sessionState";

/**
 * Inbox > send a message or a reply ({school}/dashboard/inbox/compose/send, multipart). A route, not a Server Action,
 * so three 5 MB files are not cut by the Server Action body limit (same reason as app/api/profile/document).
 * The browser posts: to (JSON array of contact ids), subject, message, inReplyToId, files. The writer is the
 * signed-in user, taken by the backend from the token; a student can only name people, never a whole group
 * (`audiences` is always sent empty). Everything is checked here and again by the backend (MailboxSender).
 *   200 { data }                 sent — data.sent false means "in their Inbox, but the email copy failed"
 *   400 { message }              the backend's own reason (safe to show), or a check that failed here
 *   401                          signed out
 *   502 { message }              the backend could not be reached / answered with an error
 */
const reply = (status, body) => NextResponse.json(body, { status });

export async function POST(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.schoolUUID) return reply(401, { message: "Your session has been logged out" });
  if (!hasBackendOrigin()) return reply(500, { message: "The backend is not configured." });

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { message: SEND_ERROR });
  }
  let to;
  try {
    to = JSON.parse(String(form.get("to") || "[]"));
  } catch {
    to = null;
  }
  if (!Array.isArray(to) || to.length > 1000 || !to.every((id) => Number.isSafeInteger(id))) return reply(400, { message: "Please choose at least one person to write to." });
  const replyId = Number(form.get("inReplyToId"));
  const inReplyToId = Number.isSafeInteger(replyId) && replyId > 0 ? replyId : null;
  const subject = String(form.get("subject") || "").trim();
  const message = String(form.get("message") || "");
  const files = form.getAll("files").filter((file) => file && typeof file !== "string");

  // The same checks, in the same words and order, as the page (utils/inbox.js) — the backend checks once more.
  if (!inReplyToId && !to.length) return reply(400, { message: "Please choose at least one person to write to." });
  if (!inReplyToId && !subject) return reply(400, { message: "Please add a subject." });
  if (subject.length > MAX_SUBJECT) return reply(400, { message: `The subject is too long: at most 200 characters (yours has ${subject.length}).` });
  if (!message.trim()) return reply(400, { message: "Please write your message." });
  if (message.length > MAX_MESSAGE) return reply(400, { message: `Your message is too long: at most 10,000 characters (yours has ${message.length.toLocaleString()}). Please shorten it, or attach a document.` });
  const problem = fileProblem(files);
  if (problem) return reply(400, { message: problem });

  const body = new FormData();
  body.append("payload", encodePayload({ to, audiences: [], subject, message, inReplyToId }));
  files.forEach((file) => body.append("files", file, file.name));

  let response;
  try {
    const base = await resolveServerBackendOrigin();
    response = await fetch(`${base}/${me.schoolUUID}/dashboard/inbox/compose/send?check-session=Y`, {
      method: "POST",
      headers: { ...serviceKeyHeaders(), Authorization: `Bearer ${me.accessToken}` },
      body,
      cache: "no-store",
    });
  } catch {
    return reply(502, { message: SEND_UNREACHABLE });
  }
  if (response.status === 401) return reply(401, { message: "Your session has been logged out" });
  const answer = await response.json().catch(() => null);
  if (isSessionOutResponse(answer)) return reply(401, { message: "Your session has been logged out" });
  const status = String(answer?.status ?? "");
  if (response.ok && status === "1" && answer.data) return reply(200, { data: answer.data });
  // "0": the backend refused and says why. Anything else is an error on its side.
  return reply(status === "0" ? 400 : 502, { message: answer?.message || SEND_ERROR });
}
