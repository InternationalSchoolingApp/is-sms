// Inbox: the shared rules (utils/inbox.js) and the dummy student's inbox (utils/dummyInbox.js) against the rules of
// the existing page (is-rest-api inbox.js / InboxService). No server needed.
// Run: npm run verify:inbox
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_INBOX_FILTERS, activeFilterCount, categoryLabel, dateRangeFor, fullTime, initialsOf, inboxListRequest, listSummary, plainText, rowTime,
  composeProblem, composeWarnings, emailSettingRows, fileProblem, fillTemplate, isDraftDirty, templateGroups, templateKind, sentRow, sentToLine, shownFileName, splitSender,
} from "../utils/inbox.js";
import { getDummyInbox } from "../utils/dummyInbox.js";

const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;

test("date choices count back from today in the student's time zone and never pass one year", () => {
  for (const [preset, length] of [["7", 7], ["30", 30], ["90", 90]]) {
    const { from, to } = dateRangeFor(preset, "America/New_York");
    assert.equal(days(from, to), length);
  }
  const year = dateRangeFor("YEAR", "Asia/Tokyo");
  assert.equal(year.from.slice(5), "01-01");
  assert.equal(year.from.slice(0, 4), year.to.slice(0, 4));
  assert.ok(days(year.from, year.to) <= 366);
  assert.equal(days(...Object.values(dateRangeFor("nonsense", "Asia/Tokyo"))), 30);
});

test("a missing or invalid time zone falls back to Asia/Singapore", () => {
  const at = Date.UTC(2026, 10, 12, 18, 30); // 02:30 on 13 Nov in Singapore
  assert.match(fullTime(at, ""), /Nov 13, 2026/);
  assert.match(fullTime(at, "Not/AZone"), /Nov 13, 2026/);
  assert.match(fullTime(at, "America/New_York"), /Nov 12, 2026/);
  assert.deepEqual(dateRangeFor("7", null), dateRangeFor("7", "Asia/Singapore"));
});

test("the list request never carries a child and sends the backend's category name", () => {
  const request = inboxListRequest({ folder: "EMAIL", filters: { ...DEFAULT_INBOX_FILTERS, category: "Progress & results", search: "  quiz " }, page: 2, timeZone: "Asia/Singapore" });
  assert.equal(request.channel, "EMAIL");
  assert.equal(request.childUserId, null);
  assert.deepEqual(request.categories, ["Progress & results"]);
  assert.equal(request.search, "quiz");
  assert.equal(request.page, 2);
  assert.equal(request.pageSize, 20);
  assert.match(request.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(activeFilterCount(DEFAULT_INBOX_FILTERS), 0);
  assert.equal(activeFilterCount({ ...DEFAULT_INBOX_FILTERS, starred: true, date: "7" }), 2);
});

test("what a row shows", () => {
  assert.equal(initialsOf("Ms. Bernadette Cruz Deticio (Teacher)"), "BD");
  assert.equal(initialsOf("School"), "S");
  assert.equal(initialsOf(""), "?");
  assert.deepEqual(splitSender("Tara Iyer (Teacher)"), { name: "Tara Iyer", role: "Teacher" });
  assert.deepEqual(splitSender(""), { name: "School", role: "" });
  assert.equal(shownFileName("123456789_homework.pdf"), "homework.pdf");
  assert.equal(shownFileName("report-2026.pdf"), "report-2026.pdf");
  assert.equal(categoryLabel("Progress & results"), "Results and reports");
  assert.equal(categoryLabel("Messages"), "Messages");
  assert.equal(plainText("<p>Hello</p><p>Line<br>two</p><b>bold</b>"), "Hello\nLine\ntwo\nbold");
  const now = new Date(Date.UTC(2026, 10, 13, 6, 0));
  assert.equal(rowTime(Date.UTC(2026, 10, 13, 1, 12), "Asia/Singapore", now), "9:12 AM");
  assert.equal(rowTime(Date.UTC(2026, 9, 21, 4, 0), "Asia/Singapore", now), "Oct 21");
  assert.equal(rowTime(Date.UTC(2025, 9, 21, 4, 0), "Asia/Singapore", now), "Oct 21, 2025");
});

test("the list summary and the 'newest are listed' note", () => {
  assert.deepEqual(listSummary({ total: 0, page: 1, pageSize: 20, lastPage: 1, shown: 0 }), { count: "", range: "", note: "" });
  const one = listSummary({ total: 37, page: 2, pageSize: 20, lastPage: 2, shown: 17 });
  assert.equal(one.count, "37 messages");
  assert.equal(one.range, "21–37 of 37");
  assert.equal(one.note, "");
  const capped = listSummary({ total: 812, page: 1, pageSize: 20, lastPage: 25, shown: 20 });
  assert.match(capped.note, /^The newest 500 are listed/);
});

const fresh = (band = "elementary") => getDummyInbox({ key: `test-${Math.random()}`, band, studentName: "Mia Tan", schoolName: "Test School" });
const all = (inbox, over = {}) =>
  inbox.list({ ...inboxListRequest({ folder: "ALL", filters: { ...DEFAULT_INBOX_FILTERS, date: "YEAR" }, page: 1, timeZone: "Asia/Singapore" }), from: "2000-01-01", ...over });

test("dummy inbox: folders, newest first, and the same filter rules as the backend", async () => {
  const inbox = fresh();
  const page = await all(inbox);
  assert.equal(page.total, 12);
  assert.ok(page.items.every((item, i) => i === 0 || page.items[i - 1].at >= item.at));
  assert.ok(page.items.every((item) => item.childUserId === null));
  assert.ok(page.items.every((item) => !/International Schooling/.test(`${item.title} ${item.preview} ${item.sender}`)));

  const emails = await all(inbox, { channel: "EMAIL" });
  assert.ok(emails.total > 0 && emails.items.every((item) => item.channel === "EMAIL"));
  // A category means emails only; "with attachments" drops notifications and WhatsApp; "unread only" drops WhatsApp.
  const fees = await all(inbox, { categories: ["Fees & payments"] });
  assert.ok(fees.items.length === 1 && fees.items[0].channel === "EMAIL");
  const withFiles = await all(inbox, { withAttachments: true });
  assert.ok(withFiles.items.every((item) => item.attachments && item.channel === "EMAIL"));
  const unread = await all(inbox, { read: "UNREAD" });
  assert.equal(unread.total, 3);
  assert.ok(unread.items.every((item) => item.channel !== "WHATSAPP"));
  assert.equal((await all(inbox, { starred: true })).total, 1);
  assert.equal((await all(inbox, { search: "payment received" })).total, 1);
  assert.equal((await all(inbox, { search: "no such words" })).total, 0);
  // The default 30 days leaves the older ones out.
  const recent = await inbox.list(inboxListRequest({ folder: "ALL", filters: DEFAULT_INBOX_FILTERS, page: 1, timeZone: "Asia/Singapore" }));
  assert.ok(recent.total < 12);
});

test("dummy inbox: opening marks read, the unread count follows, mark all leaves announcements", async () => {
  const inbox = fresh("middle");
  assert.deepEqual(await inbox.unread(), { EMAIL: 2, NOTIFICATION: 1, ANNOUNCEMENT: 0, TOTAL: 3 });
  const email = await inbox.openEmail(1);
  assert.match(email.bodyText, /^Hi Mia,/);
  assert.equal(email.canReply, true);
  assert.equal(email.attachments.length, 1);
  assert.equal((await inbox.unread()).EMAIL, 1);
  assert.equal((await inbox.openEmail(6)).canReply, false);
  assert.deepEqual(await inbox.markAllRead(), { marked: 2 });
  assert.equal((await inbox.unread()).TOTAL, 0);
  await assert.rejects(() => inbox.openEmail(999), /This email could not be found in your inbox\./);
});

test("dummy inbox: star is a toggle and 'I have read this' is remembered", async () => {
  const inbox = fresh("high");
  assert.deepEqual(await inbox.star("NOTIFICATION", 2), { starred: true });
  assert.deepEqual(await inbox.star("NOTIFICATION", 2), { starred: false });
  const before = await inbox.openAnnouncement(5);
  assert.equal(before.requiresAck, true);
  assert.equal(before.acknowledged, false);
  assert.deepEqual(await inbox.acknowledge(5), { acknowledged: true, new: true });
  assert.deepEqual(await inbox.acknowledge(5), { acknowledged: true, new: false });
  assert.equal((await inbox.openAnnouncement(5)).acknowledged, true);
  const file = await inbox.downloadAttachment({ name: "Reading-log.pdf" });
  assert.ok(file.size > 0);
});

test("dummy inbox: each demo student keeps their own copy", async () => {
  const a = getDummyInbox({ key: "a", band: "elementary", studentName: "Ana", schoolName: "" });
  const b = getDummyInbox({ key: "b", band: "elementary", studentName: "Ben", schoolName: "" });
  await a.markAllRead();
  assert.equal((await a.unread()).TOTAL, 0);
  assert.equal((await b.unread()).TOTAL, 3);
  assert.equal((await getDummyInbox({ key: "a", band: "elementary", studentName: "Ana", schoolName: "" }).unread()).TOTAL, 0);
});

const file = (name, size = 1000) => ({ name, size });

test("attachments: the existing page's limits, in its order and words", () => {
  assert.equal(fileProblem([file("a.pdf"), file("b.PNG"), file("c.csv")]), "");
  assert.equal(fileProblem([file("a.pdf"), file("b.pdf"), file("c.pdf"), file("d.pdf")]), "You can attach at most 3 files to one message.");
  assert.match(fileProblem([file("run.exe")]), /^The file "run.exe" cannot be attached\./);
  assert.match(fileProblem([file("noextension")]), /cannot be attached/);
  assert.match(fileProblem([file("big.pdf", 5 * 1024 * 1024 + 1)]), /is larger than 5 MB/);
  assert.equal(fileProblem([file("edge.pdf", 5 * 1024 * 1024)]), "");
  assert.match(fileProblem([file("empty.txt", 0)]), /is empty\. Please choose it again\./);
});

test("what stops a send, in order; a reply needs only its message", () => {
  const draft = { to: [], subject: "", message: "", files: [] };
  assert.deepEqual(composeProblem(draft), { field: "to", message: "Please choose at least one person to write to." });
  assert.equal(composeProblem({ ...draft, to: [{ userId: 0 }] }).message, "Please add a subject.");
  assert.equal(composeProblem({ ...draft, to: [{ userId: 0 }], subject: " Hi " }).message, "Please write your message.");
  assert.equal(composeProblem({ ...draft, to: [{ userId: 0 }], subject: "Hi", message: "Hello", files: [file("x.exe")] }).field, "files");
  assert.equal(composeProblem({ ...draft, to: [{ userId: 0 }], subject: "Hi", message: "Hello" }), null);
  assert.equal(composeProblem({ ...draft, reply: true }).message, "Please write your message.");
  assert.equal(composeProblem({ ...draft, reply: true, message: "Thanks" }), null);
});

test("the two warnings inform and never block; a draft is dirty once something would be lost", () => {
  assert.equal(composeWarnings({ subject: "Hi", message: "See you", files: [] }).length, 0);
  assert.match(composeWarnings({ subject: "Hi", message: "Please see the attached file", files: [] })[0], /^No attachment found/);
  assert.equal(composeWarnings({ subject: "Hi", message: "Please see the attached file", files: [file("a.pdf")] }).length, 0);
  assert.match(composeWarnings({ subject: "About <date>", message: "Hello", files: [] })[0], /^Something is still to fill in/);
  assert.equal(composeWarnings({ subject: "Hi", message: "[Child name] is ill, file attached", files: [] }).length, 2);
  assert.equal(isDraftDirty({ to: [], subject: "", message: "  ", files: [] }), false);
  assert.equal(isDraftDirty({ to: [{ userId: 1 }], subject: "", message: "", files: [] }), true);
  // A reply's person and subject come with it: only text or files make it dirty.
  assert.equal(isDraftDirty({ to: [{ userId: 1 }], subject: "Re: x", message: "", files: [], reply: {} }), false);
  assert.equal(isDraftDirty({ to: [{ userId: 1 }], subject: "Re: x", message: "ok", files: [], reply: {} }), true);
});

test("a Sent row: who it went to and what did not go out", () => {
  const people = (n, state = "SENT") => Array.from({ length: n }, (_, i) => ({ name: `P${i + 1}`, role: "Teacher", state }));
  assert.equal(sentRow({ recipients: people(2), recipientCount: 2 }).to, "P1, P2");
  assert.equal(sentRow({ recipients: people(5), recipientCount: 7 }).to, "P1, P2, P3 and 4 more");
  assert.equal(sentRow({ recipients: [] }).to, "nobody");
  assert.equal(sentRow({ recipients: people(1), state: "SENDING" }).note, "Sending…");
  assert.equal(sentRow({ recipients: people(1), progress: { done: 3, total: 9 } }).note, "Sending in the background: 3 of 9 people");
  const failed = sentRow({ recipients: people(2, "NOT_SENT"), recipientCount: 2 });
  assert.equal(failed.failed, true);
  assert.equal(failed.note, "Not sent by email to P1, P2 (it is still in their Inbox)");
  assert.equal(sentToLine({ recipients: [{ name: "A", state: "SENT" }, { name: "B", state: "NOT_SENT" }], recipientCount: 4 }), "A, B (not sent by email; it is still in their Inbox) and 2 more");
});

test("dummy inbox: who a student may write to, a send lands in Sent, a reply goes to the writer", async () => {
  const inbox = fresh("middle");
  const book = await inbox.contacts();
  assert.equal(book.canCompose, true);
  assert.equal(book.contacts[0].name, "School office");
  assert.equal(book.contacts[0].userId, 0);
  assert.ok(book.contacts.slice(1).every((c) => c.role === "Teacher" && c.context === "Your teacher"));
  assert.equal(book.writer.role, "Student");

  await assert.rejects(() => inbox.send({ to: [], subject: "Hi", message: "Hello", files: [] }), /Please choose at least one person/);
  await assert.rejects(() => inbox.send({ to: [0], subject: "", message: "Hello", files: [] }), /Please add a subject/);
  await assert.rejects(() => inbox.send({ to: [0], subject: "Hi", message: " ", files: [] }), /Please write your message/);
  await assert.rejects(() => inbox.send({ to: [9999], subject: "Hi", message: "Hello", files: [] }), /Please choose at least one person/);

  const before = (await inbox.sent({ from: "2000-01-01", to: "2999-01-01", page: 1 })).total;
  const result = await inbox.send({ to: [0, 101], subject: "Hi", message: "Hello", files: [file("note.pdf")] });
  assert.equal(result.sent, true);
  assert.equal(result.people, 2);
  const sent = await inbox.sent({ from: "2000-01-01", to: "2999-01-01", page: 1 });
  assert.equal(sent.total, before + 1);
  assert.equal(sent.items[0].subject, "Hi");
  assert.equal(sent.items[0].attachments, true);
  const opened = await inbox.openEmail(sent.items[0].id);
  assert.equal(opened.canReply, false);
  assert.equal(opened.bodyText, "Hello");

  const draft = await inbox.replyDraft(1);
  assert.equal(draft.subject, "Re: Bring your reading log to today's class");
  await assert.rejects(() => inbox.replyDraft(6), /Only messages written by a person can be answered/);
  const reply = await inbox.send({ inReplyToId: 1, message: "Thank you", files: [] });
  assert.deepEqual(reply.names, [draft.to.name]);
  const again = await inbox.sent({ from: "2000-01-01", to: "2999-01-01", search: "re: bring", page: 1 });
  assert.equal(again.total, 1);
  assert.equal(again.items[0].inReplyToId, 1);
});

test("email settings: only known keys, in the backend's order; anything but false is on", () => {
  const rows = emailSettingRows({ WEEKLY_DIGEST: false, "Announcements & events": true, Unknown: true, Other: null });
  assert.deepEqual(rows.map((r) => [r.key, r.on]), [["WEEKLY_DIGEST", false], ["Announcements & events", true], ["Other", true]]);
  assert.equal(rows[0].label, "Weekly summary");
  assert.deepEqual(emailSettingRows(null), []);
});

test("templates follow who the message is for, and fill only the names that are known", () => {
  const teacher = { name: "Tara Iyer", role: "Teacher", context: "Your teacher" };
  const office = { name: "School office", role: "School office" };
  assert.equal(templateKind([]), "ALL");
  assert.equal(templateKind([teacher, teacher]), "TEACHER");
  assert.equal(templateKind([office]), "OFFICE");
  assert.equal(templateKind([teacher, office]), "ALL");
  assert.equal(templateKind([{ name: "X", role: "Admin" }]), "ADMIN");

  const list = [{ id: 1, title: "A", recipientKind: "OFFICE" }, { id: 2, title: "B", recipientKind: "TEACHER" }, { id: 3, title: "C", recipientKind: "ANY" }];
  assert.deepEqual(templateGroups(list, "ALL").map((g) => [g.label, g.templates.length]), [["To a teacher", 1], ["To the school office", 1], ["To anyone", 1]]);
  assert.deepEqual(templateGroups(list, "TEACHER"), [{ label: "", templates: list }]);
  assert.deepEqual(templateGroups([], "TEACHER"), []);
  assert.deepEqual(templateGroups(null, "ALL"), []);

  const body = "Hello [Recipient name], [Child name] and <date>. [Your name], [School name]";
  assert.equal(fillTemplate(body, { people: [teacher], writerName: "Mia", schoolName: "" }), "Hello Tara Iyer, [Child name] and <date>. Mia, [School name]");
  assert.equal(fillTemplate(body, { people: [teacher, office], writerName: "", schoolName: "Test School" }), "Hello there, [Child name] and <date>. [Your name], Test School");
  assert.equal(fillTemplate("[Child name]", { people: [{ name: "P", role: "Parent", context: "Parent of Asha Rao" }] }), "Asha Rao");
});

test("dummy inbox: email settings are saved, and a student's templates match the recipient", async () => {
  const inbox = fresh("high");
  assert.deepEqual(await inbox.emailSettings(), { "Announcements & events": true, WEEKLY_DIGEST: true });
  assert.deepEqual(await inbox.saveEmailSetting("WEEKLY_DIGEST", false), { "Announcements & events": true, WEEKLY_DIGEST: false });
  assert.equal((await inbox.emailSettings()).WEEKLY_DIGEST, false);
  await assert.rejects(() => inbox.saveEmailSetting("Fees & payments", false), /This email setting cannot be changed\./);
  assert.equal((await inbox.templates("TEACHER")).length, 3);
  assert.deepEqual((await inbox.templates("OFFICE")).map((t) => t.title), ["Portal problem"]);
  assert.equal((await inbox.templates("ALL")).length, 4);
  assert.equal((await inbox.templates("PARENT")).length, 0);
});
