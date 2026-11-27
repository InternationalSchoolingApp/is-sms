"use server";

import { backendRequest } from "@/utils/backendRequest";
import { INBOX_CHANNELS, INBOX_PAGE_SIZE } from "@/utils/inbox";

/**
 * Inbox (is-rest-api InboxController, {school}/dashboard/inbox/*). The reader is always the signed-in user, taken by
 * the backend from the token (utils/backendRequest.js): no user id is ever sent, and every value that comes from
 * the browser is checked here before it goes into the request.
 *
 * The backend answers { status: "1" ok | "0" refused | "2" error, message, data }. Each action returns
 *   { ok: true, data }
 *   { ok: false, refused: true, message }                     status "0": the server's own words, safe to show
 *   { ok: false, refused: false, message, sessionExpired? }   status "2", no answer, signed out
 * The client side reads these through hooks/useInbox.js.
 */

const ERROR_MESSAGE = "Your inbox could not be loaded just now. Please try again in a minute.";
const UNREACHABLE_MESSAGE = "Your inbox could not be reached. Check your connection and try again.";

async function post(name, request = {}) {
  const result = await backendRequest({ path: `dashboard/inbox/${name}`, buildBody: () => request });
  if (!result.ok) {
    const message = result.sessionExpired ? result.message : result.code === "NETWORK" ? UNREACHABLE_MESSAGE : ERROR_MESSAGE;
    return { ok: false, refused: false, code: result.code, message, sessionExpired: result.sessionExpired === true };
  }
  const answer = result.data;
  const status = String(answer?.status ?? "");
  if (status === "1") return { ok: true, data: answer.data ?? {} };
  const refused = status === "0";
  return { ok: false, refused, code: refused ? "REFUSED" : "ERROR", message: answer?.message || ERROR_MESSAGE };
}

const LIST_CHANNELS = ["ALL", ...INBOX_CHANNELS];
const READ = ["ALL", "UNREAD", "READ"];
const ymd = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : null);
const text = (value, max) => (value === null || value === undefined ? "" : String(value).trim().slice(0, max));
const id = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
};

/** -> { items: Item[], total, page, pageSize, lastPage } (InboxService.Page). */
export async function listInbox(filter = {}) {
  return post("list", {
    channel: LIST_CHANNELS.includes(filter.channel) ? filter.channel : "ALL",
    read: READ.includes(filter.read) ? filter.read : "ALL",
    from: ymd(filter.from),
    to: ymd(filter.to),
    categories: Array.isArray(filter.categories) ? filter.categories.slice(0, 12).map((c) => text(c, 60)).filter(Boolean) : [],
    // A student has no children; any value here is refused by the backend.
    childUserId: null,
    search: text(filter.search, 200),
    withAttachments: filter.withAttachments === true,
    starred: filter.starred === true,
    page: Math.max(1, Math.min(25, Number(filter.page) || 1)),
    pageSize: INBOX_PAGE_SIZE,
  });
}

/** -> { EMAIL, NOTIFICATION, ANNOUNCEMENT, TOTAL }: unread in the last 30 days (WhatsApp is not counted). */
export async function getInboxUnread() {
  return post("unread");
}

/** -> EmailDetail; marks the user's own copy read. */
export async function openInboxEmail({ id: emailId } = {}) {
  return post("email", { id: id(emailId) });
}

/** -> { title, message, at }; marks it seen. */
export async function openInboxNotification({ id: notificationId } = {}) {
  return post("notification", { id: id(notificationId) });
}

/** -> { title, message, at, attachment, requiresAck, acknowledged }; marks it seen. */
export async function openInboxAnnouncement({ id: announcementId } = {}) {
  return post("announcement", { id: id(announcementId) });
}

/** "I have read this" -> { acknowledged: true, new }. */
export async function acknowledgeInboxAnnouncement({ id: announcementId } = {}) {
  return post("acknowledge", { id: id(announcementId) });
}

/** Emails and notifications; announcements are marked when opened. -> { marked } */
export async function markAllInboxRead() {
  return post("mark-all-read");
}

/** A toggle -> { starred }. The channel name is case-sensitive on the backend. */
export async function toggleInboxStar({ channel, id: itemId } = {}) {
  return post("star", { channel: INBOX_CHANNELS.includes(channel) ? channel : "", id: id(itemId) });
}

// ---- writing a message (MailboxContacts / MailboxSentFolder; the send itself is app/api/inbox/send) -------------

/** Who this user may write to -> Book { enabled, canCompose, reason, maxRecipients, contacts, writer, … }. */
export async function getComposeContacts() {
  return post("compose/contacts", { search: "", role: "", page: 0 });
}

/** A reply to a person-written message -> { inReplyToId, to: Contact, subject: "Re: …" }. */
export async function getReplyDraft({ id: emailId } = {}) {
  return post("compose/reply", { id: id(emailId) });
}

/** Messages this user wrote -> { items: SentItem[], total, page, pageSize, lastPage }. */
export async function listInboxSent(filter = {}) {
  return post("sent", {
    from: ymd(filter.from),
    to: ymd(filter.to),
    search: text(filter.search, 200),
    page: Math.max(1, Number(filter.page) || 1),
    pageSize: INBOX_PAGE_SIZE,
  });
}

// ---- email settings and message templates -----------------------------------------------------------------------

const SETTING_KEYS = ["Announcements & events", "School partnerships", "Other", "WEEKLY_DIGEST"];
const TEMPLATE_KINDS = ["OFFICE", "TEACHER", "STUDENT", "PARENT", "ADMIN", "ANY", "ALL"];

/** -> { "<key>": true | false }: which optional emails reach the user's own mailbox. */
export async function getEmailSettings() {
  return post("email-settings");
}

/** -> all settings after the save. */
export async function saveEmailSetting({ key, on } = {}) {
  return post("email-settings/save", { key: SETTING_KEYS.includes(key) ? key : "", on: on === true });
}

/** Message templates for this writer and kind of recipient -> Template[] ({ title, subject, body, recipientKind, … }). */
export async function getComposeTemplates({ recipientKind } = {}) {
  return post("compose/templates", { recipientKind: TEMPLATE_KINDS.includes(recipientKind) ? recipientKind : "ALL" });
}
