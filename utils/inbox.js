import { resolveTimeZone, todayYmd } from "./attendanceDates.js";

/**
 * Inbox (Communication) — the rules shared by the live source (services/inboxApi.js), the dummy source
 * (utils/dummyInbox.js), the hook (hooks/useInbox.js) and both looks of the page. Copied from the existing page
 * (is-rest-api inbox.js / InboxService): folders, filters, what a row shows, how a time is written.
 * No React and no server code here, so it can be imported from anywhere.
 */

// Folders, in the order of the design. `key` is what the backend calls the channel (InboxFilter.channel).
export const INBOX_FOLDERS = [
  { key: "ALL", label: "All", type: "All" },
  { key: "EMAIL", label: "Emails", type: "Email" },
  { key: "NOTIFICATION", label: "Notifications", type: "Notification" },
  { key: "ANNOUNCEMENT", label: "Announcements", type: "Announcement" },
  { key: "WHATSAPP", label: "WhatsApp", type: "WhatsApp" },
];
export const INBOX_CHANNELS = ["EMAIL", "NOTIFICATION", "ANNOUNCEMENT", "WHATSAPP"];
export const channelLabel = (channel) => INBOX_FOLDERS.find((f) => f.key === channel)?.type || "Message";

export const INBOX_PAGE_SIZE = 20;
export const READ_OPTIONS = [
  { value: "ALL", label: "Read and unread" },
  { value: "UNREAD", label: "Unread only" },
  { value: "READ", label: "Read only" },
];

// Date choices of the design. The backend refuses a range longer than a year, so there is no "All time".
export const DATE_PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
  { value: "YEAR", label: "This year" },
];
export const DEFAULT_DATE_PRESET = "30";

// The design's six categories; `value` is the backend's own category name (EMAIL_TYPE_CATEGORY.CATEGORY).
export const INBOX_CATEGORIES = [
  { value: "Fees & payments", label: "Fees and payments" },
  { value: "Classes & timetable", label: "Classes and timetable" },
  { value: "Progress & results", label: "Results and reports" },
  { value: "Enrolment & courses", label: "Enrolment" },
  { value: "Account & security", label: "Account and security" },
  { value: "Announcements & events", label: "Announcements and events" },
];
/** A category as the reader shows it: the design's label when it has one, else the backend name with "and". */
export const categoryLabel = (category) =>
  INBOX_CATEGORIES.find((c) => c.value === category)?.label || String(category || "").replace(/\s*&\s*/g, " and ");

export const DEFAULT_INBOX_FILTERS = { search: "", date: DEFAULT_DATE_PRESET, read: "ALL", category: "", withAttachments: false, starred: false };

const ymdMinusDays = (ymd, days) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
};

/** { from, to } as yyyy-MM-dd for a date choice, counted from "today" in the student's own time zone. */
export function dateRangeFor(preset, timeZone) {
  const to = todayYmd(resolveTimeZone(timeZone));
  if (preset === "YEAR") return { from: `${to.slice(0, 4)}-01-01`, to };
  const days = { 7: 7, 30: 30, 90: 90 }[preset] ?? 30;
  return { from: ymdMinusDays(to, days - 1), to };
}

/** The request for dashboard/inbox/list (InboxFilter). A student never sends a child. */
export function inboxListRequest({ folder, filters, page, timeZone }) {
  const { from, to } = dateRangeFor(filters.date, timeZone);
  return {
    channel: folder,
    read: filters.read,
    from,
    to,
    categories: filters.category ? [filters.category] : [],
    childUserId: null,
    search: String(filters.search || "").trim(),
    withAttachments: Boolean(filters.withAttachments),
    starred: Boolean(filters.starred),
    page,
    pageSize: INBOX_PAGE_SIZE,
  };
}

/** How many of the Filters choices differ from the default (shown on the Filters button). */
export function activeFilterCount(filters) {
  return Object.keys(DEFAULT_INBOX_FILTERS).filter((key) => filters[key] !== DEFAULT_INBOX_FILTERS[key]).length;
}

// ---- what a row / the reader shows ---------------------------------------------------------------------------

export const NO_SUBJECT = "(no subject)";
export const UNDELIVERED_ROW = "Not delivered to your email";
export const UNDELIVERED_NOTICE =
  "We couldn't deliver this email to your email address. You can read it here. Please check the email address in your profile, or ask the school office to update it.";
export const WHATSAPP_NOTE =
  "The school sent this through WhatsApp. Only the message's name is kept here, not its text: open WhatsApp on your phone to read it.";
export const WHATSAPP_UNDELIVERED = " Please check the mobile number in your profile, or ask the school office to update it.";

/** "BD" from "Ms. Bernadette Deticio (Teacher)": first letters of the first and last word of the name. */
export function initialsOf(name) {
  const words = String(name || "")
    .replace(/\(.*?\)/g, " ")
    .replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "?";
  const first = words[0][0] || "";
  const last = words.length > 1 ? words[words.length - 1][0] || "" : "";
  return (first + last).toUpperCase();
}

/** "Tara Iyer (Teacher)" -> { name: "Tara Iyer", role: "Teacher" }. */
export function splitSender(sender) {
  const text = String(sender || "").trim() || "School";
  const match = /^(.*?)\s*\(([^()]+)\)$/.exec(text);
  return match ? { name: match[1], role: match[2] } : { name: text, role: "" };
}

/** Notification / announcement text arrives as HTML: only its words are shown (existing page's ibPlainText). */
export function plainText(html) {
  const source = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  if (typeof DOMParser === "undefined") return source.replace(/<[^>]*>/g, "").trim();
  const text = new DOMParser().parseFromString(source, "text/html").body.textContent || "";
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

const partsIn = (epoch, timeZone, options) => new Intl.DateTimeFormat("en-US", { timeZone: resolveTimeZone(timeZone), ...options }).format(new Date(epoch));

/** A row's time: "9:12 AM" for today, "Oct 21" this year, "Oct 21, 2025" before that — in the student's time zone. */
export function rowTime(epoch, timeZone, now = new Date()) {
  if (!epoch) return "";
  const zone = resolveTimeZone(timeZone);
  const day = todayYmd(zone, new Date(epoch));
  const today = todayYmd(zone, now);
  if (day === today) return partsIn(epoch, zone, { hour: "numeric", minute: "2-digit" });
  if (day.slice(0, 4) === today.slice(0, 4)) return partsIn(epoch, zone, { month: "short", day: "numeric" });
  return partsIn(epoch, zone, { month: "short", day: "numeric", year: "numeric" });
}

/** The reader's time: "Thu, Oct 22, 2026, 9:12 AM" in the student's time zone. */
export function fullTime(epoch, timeZone) {
  if (!epoch) return "";
  return partsIn(epoch, timeZone, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Stored attachment names look like "123456789_homework.pdf": the part after the 9-digit prefix is shown. */
export const shownFileName = (name) => String(name || "").replace(/^[0-9]{9}_/, "") || "Attachment";

/** "37 messages", "1–20 of 37" and the "only the newest are listed" note of the existing page. */
export function listSummary({ total, page, pageSize, lastPage, shown }) {
  if (!total) return { count: "", range: "", note: "" };
  const start = (page - 1) * pageSize + 1;
  const reach = lastPage * pageSize;
  return {
    count: `${total.toLocaleString()} ${total === 1 ? "message" : "messages"}`,
    range: `${start.toLocaleString()}–${(start + shown - 1).toLocaleString()} of ${Math.min(total, reach).toLocaleString()}`,
    note: total > reach ? `The newest ${reach.toLocaleString()} are listed; choose shorter dates or search to find older ones.` : "",
  };
}

export const EMPTY_INBOX = "Nothing here for these filters.";
export const INBOX_SUBTITLE = "Emails, notifications, announcements and WhatsApp messages from the school.";
export const INBOX_TIP = "This is your Inbox. Read school messages here, or tap Write a message to talk to your teacher.";

// ---- writing a message (existing page: inbox.js compose, MailboxSender) -----------------------------------------

export const SENT_FOLDER = { key: "SENT", label: "Sent", type: "Sent" };
export const EMPTY_SENT = "You have not sent any messages in these dates.";

export const MAX_SUBJECT = 200;
export const MAX_MESSAGE = 10_000;
export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const FILE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "gif", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"];
export const FILE_ACCEPT = FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",");
export const FILE_HELP = "Up to 3 files, 5 MB each: PDF, Word, Excel, PowerPoint, pictures (JPG, PNG, GIF), text or CSV.";
export const PRIVACY_NOTE = "Your name and role are shown to the people you write to. Your email address is not.";
export const SEND_ERROR = "Your message could not be sent just now. Please try again in a minute; what you wrote is still here.";
export const SEND_UNREACHABLE = "Your message could not be sent: the server could not be reached. Check your connection and try again; what you wrote is still here.";
export const REPLY_ERROR = "This message cannot be answered just now. Please try again in a minute.";
export const COMPOSE_CLOSED = "Writing messages could not be opened just now. Please try again in a minute.";

const extensionOf = (name) => {
  const text = String(name || "");
  const dot = text.lastIndexOf(".");
  return dot < 0 ? "" : text.slice(dot + 1).toLowerCase();
};

/** The first thing wrong with the chosen files ({ name, size }), in the existing page's words; "" when all is well. */
export function fileProblem(files) {
  if (files.length > MAX_FILES) return "You can attach at most 3 files to one message.";
  for (const file of files) {
    if (!FILE_EXTENSIONS.includes(extensionOf(file.name))) {
      return `The file "${file.name}" cannot be attached. You can attach PDF, Word, Excel, PowerPoint, picture (JPG, PNG, GIF), text and CSV files.`;
    }
    if (file.size > MAX_FILE_BYTES) return `The file "${file.name}" is larger than 5 MB. Please make it smaller, or share a link to it instead.`;
    if (file.size === 0) return `The file "${file.name}" is empty. Please choose it again.`;
  }
  return "";
}

export const tooManyPeople = (max) => `You can write to at most ${max} people in one message.`;

/** What stops a send, checked in the existing page's order: { field, message } or null. A reply has its person and subject already. */
export function composeProblem({ to, subject, message, files, reply }) {
  if (!reply && !to.length) return { field: "to", message: "Please choose at least one person to write to." };
  if (!reply && !String(subject || "").trim()) return { field: "subject", message: "Please add a subject." };
  if (!String(message || "").trim()) return { field: "message", message: "Please write your message." };
  const problem = fileProblem(files);
  return problem ? { field: "files", message: problem } : null;
}

/** The two "check before sending" warnings of the existing page; they do not stop a send. */
export function composeWarnings({ subject, message, files }) {
  const warnings = [];
  if (/\b(attach|attached|attaching|attachment|attachments|file|files)\b/i.test(message || "") && !files.length) {
    warnings.push("No attachment found: your message mentions an attachment or a file, but nothing is attached.");
  }
  if (/<[^<>]{1,40}>|\[[^\[\]]{1,40}\]/.test(`${subject || ""} ${message || ""}`)) {
    warnings.push("Something is still to fill in: the subject or message has a word in <angle> or [square] brackets from the template.");
  }
  return warnings;
}

/** Something would be lost by starting again: text, files, or (a new message) a subject or people. */
export function isDraftDirty({ to, subject, message, files, reply }) {
  return Boolean(String(message || "").trim() || files.length || (!reply && (String(subject || "").trim() || to.length)));
}

export const charCount = (text) => `${String(text || "").length.toLocaleString()} of 10,000 characters`;
export const fileSize = (bytes) => `${Math.max(1, Math.round(bytes / 1024)).toLocaleString()} KB`;

const SENT_STATE = { NOT_SENT: "not sent by email; it is still in their Inbox", SENDING: "sending" };

/** A Sent row (MailboxSentFolder.SentItem) -> what the list shows: who it went to and anything that did not go. */
export function sentRow(item) {
  const names = (item.recipients || []).map((r) => r.name);
  const count = Math.max(item.recipientCount || 0, names.length);
  const to = names.length ? names.slice(0, 3).join(", ") + (count > 3 ? ` and ${count - 3} more` : "") : "nobody";
  const notSent = (item.recipients || []).filter((r) => r.state === "NOT_SENT").map((r) => r.name);
  const notSentCount = Math.max(item.notSentCount || 0, notSent.length);
  let note = "";
  if (item.progress) note = `Sending in the background: ${item.progress.done} of ${item.progress.total} people`;
  else if (item.state === "SENDING") note = "Sending…";
  if (notSentCount) note += `${note ? " " : ""}Not sent by email to ${notSentCount > 5 ? `${notSentCount} people` : notSent.join(", ")} (it is still in their Inbox)`;
  return { to, first: names[0] || "", note, failed: notSentCount > 0 };
}

/** The reader's "To:" line of a message the student wrote, with each person's state when it is not plain "sent". */
export function sentToLine(item) {
  const people = (item.recipients || []).map((r) => (SENT_STATE[r.state] ? `${r.name} (${SENT_STATE[r.state]})` : r.name));
  const more = (item.recipientCount || 0) - people.length;
  return people.join(", ") + (more > 0 ? ` and ${more} more` : "");
}

// ---- email settings (existing page: INBOX_SETTING_LABELS; EmailPreferences) -----------------------------------------

// Only the keys the backend sends are shown, in its order; a key with no label here is left out.
export const EMAIL_SETTING_LABELS = {
  "Announcements & events": ["Announcements and events", "School news, events and general announcements."],
  "School partnerships": ["School partnerships", "News about programmes the school runs with partners."],
  Other: ["Other school emails", "Anything the school has not put in another group."],
  WEEKLY_DIGEST: ["Weekly summary", "On Sundays, a short list of what you have not read yet."],
};
export const EMAIL_SETTINGS_INTRO = "Choose which emails reach your inbox. Everything stays here in your Inbox either way.";
export const EMAIL_SETTINGS_ALWAYS =
  "Fees and payments, classes and timetable, results, enrolment, account and security, admissions and other essential school emails are always sent.";
export const SETTING_ON = "Switched on.";
export const SETTING_OFF = "Switched off. These will still appear in your Inbox.";

/** The backend's { key: boolean } -> rows for the panel. Anything but an explicit false is "on". */
export function emailSettingRows(settings) {
  return Object.keys(settings || {})
    .filter((key) => EMAIL_SETTING_LABELS[key])
    .map((key) => ({ key, label: EMAIL_SETTING_LABELS[key][0], hint: EMAIL_SETTING_LABELS[key][1], on: settings[key] !== false }));
}

// ---- message templates (existing page: inboxComposeAssist.js) -------------------------------------------------------

export const TEMPLATE_HELP = "Words like <date> or <teacher name> that are left in the text are for you to fill in.";
const TEMPLATE_GROUPS = [
  ["TEACHER", "To a teacher"],
  ["OFFICE", "To the school office"],
  ["STUDENT", "To a student"],
  ["PARENT", "To a parent"],
  ["ADMIN", "To a school admin"],
  ["ANY", "To anyone"],
];

/** The kind of person a contact is, from its role label (as the existing page reads it). */
function kindOfContact(person) {
  const role = String(person?.role || "").trim().toLowerCase();
  if (role === "student") return "STUDENT";
  if (role === "parent") return "PARENT";
  if (role === "teacher") return "TEACHER";
  if (role === "school office") return "OFFICE";
  return "ADMIN";
}

/** Which templates to ask for: the one kind all chosen people share, else "ALL" (also when nobody is chosen). */
export function templateKind(people) {
  const kinds = new Set((people || []).map(kindOfContact));
  return kinds.size === 1 ? [...kinds][0] : "ALL";
}

/** Templates as the picker lists them: one flat list for a single kind, groups by who it is for under "ALL". */
export function templateGroups(templates, kind) {
  const list = Array.isArray(templates) ? templates : [];
  if (kind !== "ALL") return list.length ? [{ label: "", templates: list }] : [];
  return TEMPLATE_GROUPS.map(([key, label]) => ({ label, templates: list.filter((t) => t.recipientKind === key) })).filter((group) => group.templates.length);
}

/** Fills [Recipient name], [Child name], [Your name], [School name]; a name that is not known leaves its words in place. */
export function fillTemplate(text, { people = [], writerName = "", schoolName = "" } = {}) {
  const childName = /^Parent of (.+)$/.exec(people[0]?.context || "")?.[1] || "";
  const values = {
    "[Recipient name]": people.length === 1 ? people[0].name : "there",
    "[Child name]": childName,
    "[Your name]": writerName,
    "[School name]": schoolName,
  };
  return Object.entries(values).reduce((result, [token, value]) => (value ? result.split(token).join(value) : result), String(text || ""));
}

export const replaceWithTemplate = (title) => `Replace what you have written with the template "${title}"?`;
