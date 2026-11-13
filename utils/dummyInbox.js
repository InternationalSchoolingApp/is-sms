import { INBOX_PAGE_SIZE, MAX_MESSAGE, MAX_SUBJECT, fileProblem, tooManyPeople } from "./inbox.js";

/**
 * Inbox for the dummy (demo) student: the sample messages of the three designs (Playful / Middle / High .dc.html,
 * cmData), answered in the same shapes as the backend (InboxService) so the page cannot tell the difference.
 * Nothing leaves the browser. Reading, starring and "I have read this" change this copy only, and it starts again
 * on a page reload. Dates are counted back from today, so the demo never looks old.
 */

const DAY = 86_400_000;
const CATEGORY = {
  classes: "Classes & timetable",
  results: "Progress & results",
  events: "Announcements & events",
  fees: "Fees & payments",
  account: "Account & security",
  enrol: "Enrolment & courses",
};
const CHANNEL = { email: "EMAIL", noti: "NOTIFICATION", ann: "ANNOUNCEMENT", wa: "WHATSAPP" };

// What differs between the three designs: the class teacher, the courses and the grade.
const BANDS = {
  elementary: { grade: "Grade 3", lastGrade: "Grade 2", science: "Science", math: "Mathematics", mathTeacher: "Ms. Bernadette Cruz Deticio", scienceTeacher: "Ms. Bernadette Cruz Deticio" },
  middle: { grade: "Grade 7", lastGrade: "Grade 6", science: "Comprehensive Science II", math: "Mathematics", mathTeacher: "Ms. Priya Nair", scienceTeacher: "Mr. Daniel Reyes" },
  high: { grade: "Grade 10", lastGrade: "Grade 9", science: "Chemistry I", math: "Integrated Math II", mathTeacher: "Ms. Priya Nair", scienceTeacher: "Mr. Daniel Reyes" },
};

// [id, type, category, sender, days ago, "h:mm", unread, starred, subject, body, attachment]
function sampleRows(band, first, school) {
  const b = BANDS[band] || BANDS.high;
  const kid = band === "elementary";
  const teacher = (name) => `${name} (Teacher)`;
  return [
    [1, "email", "classes", teacher("Ms. Bernadette Cruz Deticio"), 0, "9:12", true, false,
      kid ? "Bring your reading chart today" : "Bring your reading log to today's class",
      kid
        ? `Hi ${first}!\n\nToday we will read a fun story together. Please bring your reading chart and a pencil.\n\nIf you lost your chart, a new one is attached. Ask a grown-up to print it.\n\nSee you in class!\nMs. Bernadette`
        : `Hi ${first},\n\nIn today's class we will discuss chapters 4 and 5. Please bring your reading log and two questions you want to ask the group.\n\nThe reading log template is attached if you need a fresh copy.\n\nSee you soon,\nMs. Bernadette`,
      kid ? "Reading-chart.pdf" : "Reading-log.pdf"],
    [2, "noti", "classes", "School", 0, "7:45", true, false, `${b.science} starts at 8:00 AM`,
      `Your live class ${b.science} starts at 8:00 AM today. Join from your dashboard 5 minutes early so you don't miss the start.`],
    [3, "wa", "classes", "School", 1, "18:30", false, false, "Class Reminder", "Sent to the WhatsApp number ending 4821."],
    [4, "email", "results", teacher(b.mathTeacher), 2, "16:10", true, false,
      kid ? "Super work on your math quiz!" : "Your Unit 2 quiz is marked",
      kid
        ? `Hi ${first},\n\nYou got 9 out of 10 on your math quiz. Amazing work! Your star certificate is attached.\n\nKeep it up!\nMs. Bernadette`
        : `Hi ${first},\n\nGreat effort on the Unit 2 quiz – you scored 18 out of 20. I've left notes on questions 7 and 12 in the attached feedback sheet.\n\nIf you'd like to go over them, book a short help session with me this week.\n\nMs. Priya`,
      kid ? "Star-certificate.pdf" : "Unit-2-feedback.pdf"],
    [5, "ann", "events", "School", 4, "10:00", false, true,
      kid ? "Costume Day – this Friday" : "Virtual Science Fair – next Friday",
      kid
        ? "Dear students,\n\nCome to your live classes dressed as your favourite book character this Friday. We can't wait to see you!\n\nSchool Office"
        : "Dear students,\n\nOur Virtual Science Fair takes place next Friday. Projects can be solo or in pairs. Register your project title from the Clubs page.\n\nThere are prizes for the top three projects in every grade.\n\nSchool Office"],
    [6, "email", "fees", "Fees & Accounts Office", 7, "11:20", false, false, "Payment received – thank you",
      "Hello,\n\nWe have received your payment. Your receipt is attached. You can see all your payments under My Fee Details.\n\nFees & Accounts Office", "Receipt.pdf"],
    [7, "noti", "account", "School", 10, "20:05", false, false, "New sign-in to your account",
      kid
        ? "Your account was signed in on a new device.\n\nIf this was not you, ask a grown-up to change your password from My profile."
        : "Your account was signed in on a new device.\n\nIf this was you, there is nothing to do. If not, change your password from My profile and tell Student Support."],
    [8, "email", "classes", teacher(b.scienceTeacher), 14, "14:45", false, false,
      kid ? "Show and tell on Monday" : "Watch the lab safety video before Monday",
      kid
        ? `Hi ${first},\n\nOn Monday we have show and tell! Bring one thing you love and tell us why it is special.\n\nMs. Bernadette`
        : `Hi ${first},\n\nBefore Monday's lab, please watch the 8-minute lab safety video in your LMS and complete the short check (3 questions).\n\nThanks,\nMr. Daniel`],
    [9, "ann", "events", "School", 20, "9:00", false, false, "Parent–teacher meetings",
      "Dear families,\n\nParent–teacher meetings will be held online this month. Each meeting is 15 minutes.\n\nSchool Office"],
    [10, "wa", "fees", "School", 24, "10:15", false, false, "Fee Reminder", "Sent to the WhatsApp number ending 4821."],
    [11, "email", "enrol", "Admissions Team", 38, "9:30", false, false, `Welcome to ${b.grade}!`,
      `Dear ${first},\n\nWelcome to ${b.grade}${school ? ` at ${school}` : ""}! Your welcome pack with the school calendar and the Student Handbook is attached.\n\nWe're excited to learn with you this year.\n\nAdmissions Team`, "Welcome-pack.pdf"],
    [12, "noti", "results", "School", 124, "17:00", false, false, `Your ${b.lastGrade} report is ready`,
      `Your ${b.lastGrade} report card is ready. You can see it under Academic Reports.`],
  ];
}

function buildMessages({ band, studentName, schoolName }) {
  const first = String(studentName || "").trim().split(/\s+/)[0] || "there";
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return sampleRows(band, first, schoolName).map(([id, type, cat, sender, daysAgo, time, unread, starred, title, body, file]) => {
    const [hours, minutes] = time.split(":").map(Number);
    // Today's messages never sit in the future: they are placed a little before "now".
    const at = Math.min(midnight.getTime() - daysAgo * DAY + (hours * 60 + minutes) * 60_000, Date.now() - id * 60_000);
    return {
      channel: CHANNEL[type],
      id,
      at,
      title,
      body,
      sender,
      category: type === "email" ? CATEGORY[cat] : null,
      read: type === "wa" ? true : !unread,
      starred,
      file: file || "",
      person: /\(Teacher\)$/.test(sender),
      requiresAck: type === "ann" && id === 5,
      acknowledged: false,
    };
  });
}

// Who the demo student may write to (design: people): the school office first, then their teachers by name.
const TEACHERS = {
  elementary: ["Ms. Bernadette Cruz Deticio"],
  middle: ["Mr. Daniel Reyes", "Mr. Thomas Greene", "Ms. Aisha Khan", "Ms. Bernadette Cruz Deticio", "Ms. Priya Nair"],
  high: ["Mr. Daniel Reyes", "Mr. Thomas Greene", "Ms. Aisha Khan", "Ms. Bernadette Cruz Deticio", "Ms. Priya Nair", "Sra. Lucía Morales"],
};
const MAX_PEOPLE = 10;
const OFFICE = { userId: 0, name: "School office", role: "School office", context: "Your school's contact address", emailOnly: false };
const contactsOf = (band) => [OFFICE, ...(TEACHERS[band] || TEACHERS.high).map((name, i) => ({ userId: 101 + i, name, role: "Teacher", context: "Your teacher", emailOnly: false }))];

// The templates a student is given (64_1_0_COMMUNICATION.sql seeds these four titles for STUDENT writers).
const TEMPLATES = [
  { id: 1, writerRole: "STUDENT", recipientKind: "TEACHER", title: "Doubt about a topic", subject: "Doubt about <topic>", body: "Hello [Recipient name],\n\nI have a doubt about <topic> from our class on <date>.\n\n<Write your question here>\n\nThank you,\n[Your name]", sortOrder: 1, active: true, owner: false },
  { id: 2, writerRole: "STUDENT", recipientKind: "TEACHER", title: "More time for an assignment", subject: "More time for <assignment name>", body: "Hello [Recipient name],\n\nCould I have more time for <assignment name>? I can hand it in by <date>.\n\nThank you,\n[Your name]", sortOrder: 2, active: true, owner: false },
  { id: 3, writerRole: "STUDENT", recipientKind: "TEACHER", title: "Absence", subject: "I will miss class on <date>", body: "Hello [Recipient name],\n\nI will not be able to join the class on <date> because <reason>.\n\nPlease let me know what to catch up on.\n\nThank you,\n[Your name]", sortOrder: 3, active: true, owner: false },
  { id: 4, writerRole: "STUDENT", recipientKind: "OFFICE", title: "Portal problem", subject: "Problem with the portal", body: "Hello [School name],\n\nI have a problem with <the dashboard / the LMS>. This is what I see: <describe the problem>.\n\nThank you,\n[Your name]", sortOrder: 1, active: true, owner: false },
];

const stores = new Map();
const refuse = (message) => {
  throw new Error(message);
};
const preview = (text) => String(text || "").replace(/\s+/g, " ").trim().slice(0, 160);
const dayStart = (ymd) => new Date(`${ymd}T00:00:00`).getTime();

function toItem(m) {
  return {
    channel: m.channel,
    id: m.id,
    at: m.at,
    title: m.title,
    preview: preview(m.body),
    sender: m.sender,
    category: m.category,
    childUserId: null,
    childName: null,
    read: m.read,
    starred: m.starred,
    attachments: Boolean(m.file),
    undelivered: false,
  };
}

/**
 * The dummy student's inbox. Same calls, same answers as the live one (hooks/useInbox.js picks between them).
 * `key` keeps one copy per demo student and look for as long as the page stays open.
 */
export function getDummyInbox({ key, band, studentName, schoolName }) {
  if (!stores.has(key)) {
    const first = String(studentName || "").trim().split(/\s+/)[0] || "";
    const teacher = contactsOf(band)[1];
    stores.set(key, {
      messages: buildMessages({ band, studentName, schoolName }),
      // One message the student already wrote (design: sent).
      sent: [{ id: 1001, at: Date.now() - 12 * DAY, subject: "Question about my homework", message: `Hello,\n\nI'm not sure how to start question 4 in my homework. Could you give me a hint in our next class?\n\nThank you,\n${first}`, to: [teacher], files: [], inReplyToId: null }],
      nextId: 1002,
      settings: { "Announcements & events": true, WEEKLY_DIGEST: true },
    });
  }
  const store = stores.get(key);
  const { messages, sent } = store;
  const contacts = contactsOf(band);
  const writer = { kind: "STUDENT", name: String(studentName || "").trim() || "Demo Student", role: "Student" };
  const find = (channel, id, what) => messages.find((m) => m.channel === channel && m.id === Number(id)) || refuse(`This ${what} could not be found in your inbox.`);

  return {
    dummy: true,

    async list(request) {
      const from = dayStart(request.from);
      const to = dayStart(request.to) + DAY;
      const term = String(request.search || "").toLowerCase();
      const categories = request.categories || [];
      const rows = messages
        .filter((m) => request.channel === "ALL" || m.channel === request.channel)
        .filter((m) => m.at >= from && m.at < to)
        // As on the backend: a category means emails only; "with attachments" leaves out notifications and
        // WhatsApp; "unread only" leaves out WhatsApp (it has no read state).
        .filter((m) => !categories.length || (m.channel === "EMAIL" && categories.includes(m.category)))
        .filter((m) => !request.withAttachments || Boolean(m.file))
        .filter((m) => request.read !== "UNREAD" || (!m.read && m.channel !== "WHATSAPP"))
        .filter((m) => request.read !== "READ" || m.read)
        .filter((m) => !request.starred || m.starred)
        .filter((m) => !term || `${m.title} ${m.body} ${m.sender}`.toLowerCase().includes(term))
        .sort((a, b) => b.at - a.at);
      const pageSize = INBOX_PAGE_SIZE;
      const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
      const page = Math.min(Math.max(1, request.page || 1), lastPage);
      return { items: rows.slice((page - 1) * pageSize, page * pageSize).map(toItem), total: rows.length, page, pageSize, lastPage };
    },

    async unread() {
      const since = Date.now() - 30 * DAY;
      const count = (channel) => messages.filter((m) => m.channel === channel && !m.read && m.at >= since).length;
      const counts = { EMAIL: count("EMAIL"), NOTIFICATION: count("NOTIFICATION"), ANNOUNCEMENT: count("ANNOUNCEMENT") };
      return { ...counts, TOTAL: counts.EMAIL + counts.NOTIFICATION + counts.ANNOUNCEMENT };
    },

    async openEmail(id) {
      const mine = sent.find((s) => s.id === Number(id));
      if (mine) {
        return {
          id: mine.id, subject: mine.subject, sender: `${writer.name} (Student)`, at: mine.at, category: "Messages", childName: null,
          attachments: mine.files.map((name) => ({ name, payload: "" })), undelivered: false, contentPayload: "", bodyText: mine.message,
          message: true, canReply: false,
          inReplyTo: mine.inReplyToId ? { id: mine.inReplyToId, subject: messages.find((m) => m.id === mine.inReplyToId)?.title || null, visible: true } : null,
        };
      }
      const m = find("EMAIL", id, "email");
      m.read = true;
      return {
        id: m.id,
        subject: m.title,
        sender: m.sender,
        at: m.at,
        category: m.category || "Other",
        childName: null,
        attachments: m.file ? [{ name: m.file, payload: "" }] : [],
        undelivered: false,
        contentPayload: "",
        // Dummy only: the words of the email (a live email is HTML, shown through /api/inbox/email-content).
        bodyText: m.body,
        message: m.person,
        canReply: m.person,
        inReplyTo: null,
      };
    },

    async openNotification(id) {
      const m = find("NOTIFICATION", id, "notification");
      m.read = true;
      return { title: m.title, message: m.body, at: m.at };
    },

    async openAnnouncement(id) {
      const m = find("ANNOUNCEMENT", id, "announcement");
      m.read = true;
      return { title: m.title, message: m.body, at: m.at, attachment: "", childName: null, requiresAck: m.requiresAck, acknowledged: m.acknowledged };
    },

    async acknowledge(id) {
      const m = find("ANNOUNCEMENT", id, "announcement");
      const fresh = !m.acknowledged;
      m.acknowledged = true;
      return { acknowledged: true, new: fresh };
    },

    async markAllRead() {
      const unread = messages.filter((m) => !m.read && (m.channel === "EMAIL" || m.channel === "NOTIFICATION"));
      unread.forEach((m) => (m.read = true));
      return { marked: unread.length };
    },

    async star(channel, id) {
      const m = find(channel, id, "message");
      m.starred = !m.starred;
      return { starred: m.starred };
    },

    async contacts() {
      return { enabled: true, canCompose: true, reason: null, search: false, maxRecipients: MAX_PEOPLE, contacts, writer, backgroundFrom: 100, filter: false, more: false };
    },

    async replyDraft(id) {
      const m = find("EMAIL", id, "email");
      if (!m.person) refuse("Only messages written by a person can be answered from the Inbox.");
      const name = m.sender.replace(/\s*\(.*\)$/, "");
      const to = contacts.find((c) => c.name === name) || { userId: 100, name, role: "Teacher", context: "Wrote this message", emailOnly: false };
      return { inReplyToId: m.id, to: { ...to, context: "Wrote this message" }, subject: `Re: ${m.title.replace(/^(re:\s*)+/i, "")}` };
    },

    /** The backend's checks in the backend's words (MailboxSender), then the message goes into this copy's Sent. */
    async send({ to = [], subject = "", message = "", inReplyToId = null, files = [] }) {
      const reply = inReplyToId ? await this.replyDraft(inReplyToId) : null;
      const text = String(message).trim();
      if (!text) refuse("Please write your message.");
      if (text.length > MAX_MESSAGE) refuse(`Your message is too long: at most 10,000 characters (yours has ${text.length.toLocaleString()}). Please shorten it, or attach a document.`);
      const problem = fileProblem(files);
      if (problem) refuse(problem);
      const title = reply ? reply.subject : String(subject).trim();
      if (!title) refuse("Please add a subject.");
      if (title.length > MAX_SUBJECT) refuse(`The subject is too long: at most 200 characters (yours has ${title.length}).`);
      const people = reply ? [reply.to] : to.map((userId) => contacts.find((c) => c.userId === Number(userId))).filter(Boolean);
      if (!people.length) refuse("Please choose at least one person to write to.");
      if (people.length > MAX_PEOPLE) refuse(`${tooManyPeople(MAX_PEOPLE)} Please remove ${people.length - MAX_PEOPLE} and try again.`);
      sent.unshift({ id: store.nextId++, at: Date.now(), subject: title, message: text, to: people, files: files.map((f) => f.name), inReplyToId: reply ? reply.inReplyToId : null });
      const names = people.map((p) => p.name);
      return { sent: true, people: names.length, names, skipped: [], message: `Your message was sent to ${names.length === 1 ? names[0] : `${names.length} people`}.`, background: false, emailOnly: 0, group: `demo-${sent[0].id}` };
    },

    async sent(request) {
      const from = dayStart(request.from);
      const to = dayStart(request.to) + DAY;
      const term = String(request.search || "").toLowerCase();
      const rows = sent.filter((s) => s.at >= from && s.at < to && (!term || s.subject.toLowerCase().includes(term))).sort((a, b) => b.at - a.at);
      const pageSize = INBOX_PAGE_SIZE;
      const lastPage = Math.max(1, Math.ceil(rows.length / pageSize));
      const page = Math.min(Math.max(1, request.page || 1), lastPage);
      const items = rows.slice((page - 1) * pageSize, page * pageSize).map((s) => ({
        id: s.id, at: s.at, subject: s.subject, attachments: s.files.length > 0, inReplyToId: s.inReplyToId,
        recipients: s.to.map((p) => ({ name: p.name, role: p.role, state: "SENT" })), state: "SENT", progress: null, recipientCount: s.to.length, notSentCount: 0,
      }));
      return { items, total: rows.length, page, pageSize, lastPage };
    },

    async emailSettings() {
      return { ...store.settings };
    },

    async saveEmailSetting(settingKey, on) {
      if (!(settingKey in store.settings)) refuse("This email setting cannot be changed.");
      store.settings[settingKey] = on === true;
      return { ...store.settings };
    },

    /** One kind returns that kind (plus "to anyone"); "ALL" returns every kind — as MailboxTemplateService does. */
    async templates(recipientKind) {
      return TEMPLATES.filter((template) => recipientKind === "ALL" || template.recipientKind === recipientKind || template.recipientKind === "ANY");
    },

    /** A small text file stands in for the real attachment. */
    async downloadAttachment(attachment) {
      return new Blob([`${attachment.name}\n\nThis is a sample file from the demo inbox.\n`], { type: "text/plain" });
    },
  };
}
