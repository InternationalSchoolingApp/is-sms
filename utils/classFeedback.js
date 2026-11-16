import { format, parseISO, isValid } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getEventStatus } from "@/utils/calendarEvents";

/**
 * Class feedback rules - a port of the legacy feedbackStudentTeacher.js and the feedback parts of dashboardCalendarNew.js
 * (canShowFeedbackButton, buildFeedbackInfo, the weekly "Pending Feedback" list). No DOM here.
 *
 * `info` is the same object the legacy calendar passed around: the event's id/type/title, its start as a wall-clock string
 * in the student's time zone ("yyyy-MM-ddTHH:mm:ss"), the teacher and the feedback flags the backend put on the event.
 */

// SETTINGS CONFIGURATION keys the legacy flow reads.
export const FEEDBACK_SETTING = {
  showFromDate: "FEEDBACK_SHOW_FROM_DATE", // classes before this date (yyyy-MM-dd) get no feedback
  testUsers: "USER_FOR_FEEDBACK_TEST", // comma list of user ids that skip the date rule and the "after class" switch
  afterClass: "FEEDBACK_SHOW_POPUP_AFTER_CLASS", // "TRUE": open the popup when a live class ends
  delayMinutes: "FEEDBACK_MODAL_DELAY_MIN", // minutes to wait after the class end
  bulkDay: "BULK_FEEDBACK_SHOW_DAY", // day of the week (0 = Sunday) of the weekly Pending Feedback popup
};

const WALL_CLOCK = "yyyy-MM-dd'T'HH:mm:ss";
export const wallClock = (date) => (date && isValid(date) ? format(date, WALL_CLOCK) : "");

/** "yyyy-MM-dd HH:mm:ss" in UTC for a wall-clock time in `timezone` (legacy convertToUTC). "" when it cannot be read. */
export function toUtcText(wall, timezone) {
  if (!wall) return "";
  const instant = fromZonedTime(String(wall).replace(" ", "T"), timezone);
  return isValid(instant) ? formatInTimeZone(instant, "UTC", "yyyy-MM-dd HH:mm:ss") : "";
}

/** The absolute moment (ms) of a wall-clock time in `timezone`. */
export function instantOf(wall, timezone) {
  if (!wall) return NaN;
  return fromZonedTime(String(wall).replace(" ", "T"), timezone).getTime();
}

export function isFeedbackActivity(info) {
  const id = String(info.id || info.eventId || "").toLowerCase();
  const category = String(info.category || "").toUpperCase();
  const eventType = String(info.eventType || "").toUpperCase();
  return id.indexOf("activity") === 0 || category.indexOf("ACTIVITY") === 0 || eventType.indexOf("ACTIVITY") !== -1;
}

/** The teacher a class feedback is about ("Teacher" when the event carries none). */
export function teacherNameOf(info) {
  const name = String(info.teacherName || info.name || "").trim();
  return name && name !== "N/A" ? name : "Teacher";
}

/** The name for the header, with Ms./Mr./Dr. in front when the event has a salutation. */
export function teacherDisplayOf(info) {
  const name = teacherNameOf(info);
  if (!name || name === "Teacher") return name;
  let salutation = String(info.salutation || info.teacherSalutation || "").trim();
  if (!salutation) return name;
  if (/^(Ms|Mr|Mrs|Dr|Prof)$/i.test(salutation)) salutation += ".";
  return `${salutation} ${name}`;
}

const dateOf = (wall) => {
  const date = wall ? parseISO(String(wall).replace(" ", "T")) : null;
  return date && isValid(date) ? date : null;
};

/** Purpose of a class feedback: the class name plus its date, as the legacy webhook describes it. */
export function purposeLabelOf(info) {
  const className = info.eventTitle || info.title || "Class";
  const start = dateOf(info.start);
  const dateLabel = start ? format(start, "MMM dd, yyyy") : "";
  if (info.eventType === "STUDENT_DOUBT_SESSION") return `${info.grade} | ${className} | ${dateLabel}`;
  if (info.eventType === "BATCH") return `${info.batchName ? `${info.batchName} | ` : ""}${className} | ${dateLabel}`;
  return dateLabel ? `${className} - ${dateLabel}` : className;
}

/** "Jun 09, 2026 10:30 AM" - the date and time badge in the header. */
export function classDateTimeOf(info) {
  const start = dateOf(info.start);
  return start ? format(start, "MMM dd, yyyy hh:mm a") : "";
}

/** The info object a calendar event is rated with (legacy buildFeedbackInfo); times are wall-clock in the student's zone. */
export function buildFeedbackInfo(event, timezone) {
  return {
    id: event.id,
    eventId: event.eventId || event.id,
    eventType: event.eventType,
    eventTitle: event.eventTitle || event.title || "",
    title: event.eventTitle || event.title || "",
    category: event.category,
    start: wallClock(event.startZoned) || event.start,
    end: wallClock(event.endZoned) || event.end,
    timezone,
    teacherName: event.teacherName || event.origName || "",
    name: event.origName || event.teacherName || "",
    salutation: event.salutation || event.teacherSalutation || "",
    teacherSalutation: event.teacherSalutation || event.salutation || "",
    feedbackUserIdTo: event.feedbackUserIdTo,
    isFeedbackFormMapped: event.isFeedbackFormMapped,
    isFeedbackSubmitted: event.isFeedbackSubmitted,
    grade: event.grade,
    feedbackForUserRole: event.feedbackForUserRole,
    feedbackSubmittedByRole: event.feedbackSubmittedByRole,
    feedbackSubmittedBySalutation: event.feedbackSubmittedBySalutation,
    courseName: event.courseName,
    subjectName: event.subjectName,
    className: event.className,
    batchName: event.batchName,
  };
}

export const isTestUserOf = (testUsersValue, userId) =>
  String(testUsersValue || "")
    .split(",")
    .map((id) => id.trim())
    .includes(String(userId));

/**
 * Whether a finished class/activity gets the "Rate this class/activity" button (legacy canShowFeedbackButton): the backend
 * mapped a feedback form to it, and either the student is a feedback test user or the class is on/after FEEDBACK_SHOW_FROM_DATE.
 */
export function canShowFeedbackButton(event, { showFromDate, testUsers, userId }, now = new Date()) {
  if (event.eventKind !== "class" && event.eventKind !== "activity") return false;
  if (getEventStatus(event, now) !== "completed") return false;
  if (event.isFeedbackFormMapped !== "Y") return false;
  if (isTestUserOf(testUsers, userId)) return true;
  const eventDate = event.startZoned ? format(event.startZoned, "yyyy-MM-dd") : event.localDateKey;
  return Boolean(showFromDate && eventDate && eventDate >= showFromDate);
}

/** Legacy shouldShowFeedbackPopupAfterClass: the switch is "TRUE", or the student is a test user. */
export function showsPopupAfterClass(afterClassValue, testUsersValue, userId) {
  return String(afterClassValue || "").trim().toUpperCase() === "TRUE" || isTestUserOf(testUsersValue, userId);
}

/** Legacy getFeedbackModalDelayMinutes in ms: a missing / invalid / negative value is 0. */
export function delayMsOf(delayValue) {
  const minutes = parseInt(delayValue, 10);
  return Number.isNaN(minutes) || minutes < 0 ? 0 : minutes * 60 * 1000;
}

/** Legacy shouldShowBulkFeedbackPopupToday: BULK_FEEDBACK_SHOW_DAY is today's day of the week. */
export function isBulkFeedbackDay(bulkDayValue, today = new Date()) {
  const day = parseInt(bulkDayValue, 10);
  return !Number.isNaN(day) && day === today.getDay();
}

/** Legacy getPreviousWeekDateRange: last Sunday to last Saturday, as yyyy-MM-dd. */
export function previousWeekRange(today = new Date()) {
  const end = new Date(today);
  end.setDate(today.getDate() - today.getDay() - 1);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return { startDate: format(start, "yyyy-MM-dd"), endDate: format(end, "yyyy-MM-dd") };
}

/**
 * The embed address of the feedback form with the student's identity and the class context in its query string
 * (legacy buildClassFeedbackEmbedUrl): without userName / userId the form rejects the answer.
 */
export function buildEmbedUrl(url, { userName, userId, profileRole, webhook, origin, uiOrigin }) {
  try {
    const feedbackUrl = new URL(url, origin);
    // Local development: the backend in "dev" mode always names http://localhost:3000 (the feedback UI's own port), which is this
    // app when it runs there. NEXT_PUBLIC_FEEDBACK_UI_ORIGIN points the form at wherever the feedback UI really runs; the path and
    // token stay the backend's. Unset (every real environment) the backend's address is used as it is. Web addresses only.
    const override = uiOrigin ? new URL(uiOrigin) : null;
    if (override && /^https?:$/.test(override.protocol)) {
      feedbackUrl.protocol = override.protocol;
      feedbackUrl.host = override.host;
    }
    feedbackUrl.searchParams.set("userName", String(userName || ""));
    if (userId) feedbackUrl.searchParams.set("userId", String(userId));
    if (profileRole) feedbackUrl.searchParams.set("optionalValue2", String(profileRole));
    if (webhook && Object.keys(webhook).length > 0) feedbackUrl.searchParams.set("webhookData", JSON.stringify(webhook));
    feedbackUrl.searchParams.set("hideHeader", "1");
    return feedbackUrl.toString();
  } catch {
    return url;
  }
}

/** The class context the feedback form forwards to its webhook (legacy updateFeedbackWebhook). */
export function buildWebhook(info, { userId, timezone }) {
  const name = teacherNameOf(info);
  return {
    userId,
    entityId: info.eventId,
    entityType: info.eventType,
    feedbackDateTime: toUtcText(info.start, timezone),
    purpose: purposeLabelOf(info),
    category: info.category || info.eventType || "",
    feedbackFor: info.salutation === "" || info.salutation === undefined ? name : `${info.salutation}. ${name}`,
    feedbackUserIdTo: info.feedbackUserIdTo,
    feedbackForUserRole: info.feedbackForUserRole,
    feedbackSubmittedByRole: info.feedbackSubmittedByRole,
    feedbackSubmittedBySalutation: "",
    feedbackForSalutation: info.salutation,
  };
}

const firstText = (...values) => values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");

/**
 * The cards of the weekly "Pending Feedback" popup (legacy showPendingFeedbackPopup): last week's classes / activities the
 * student has not rated (isFeedbackSubmitted "N"), that have a feedback form, and are on/after FEEDBACK_SHOW_FROM_DATE.
 * `events` are normalized calendar events.
 */
export function pendingFeedbackOf(events, { showFromDate, timezone }) {
  const items = [];
  let activities = 0;
  let classes = 0;
  (events || []).forEach((event) => {
    const id = String(event.id || "");
    if (id.startsWith("announce") || id.startsWith("holiday")) return;
    if (event.isFeedbackSubmitted !== "N") return;
    if (event.isFeedbackFormMapped === "N") return;
    const eventDate = event.startZoned ? format(event.startZoned, "yyyy-MM-dd") : "";
    if (showFromDate && eventDate && eventDate < showFromDate) return;

    const info = buildFeedbackInfo(event, timezone);
    const category = String(event.category || event.eventType || "N/A");
    const categoryName = category.toUpperCase();
    const isActivity = categoryName.indexOf("ACTIVITY") > -1;
    const title = event.eventTitle || event.title || "Class";
    const courseName =
      firstText(event.courseName, event.subjectName, event.className) ?? (id.startsWith("activity") ? String(event.title || "").split("~")[0] : title);
    let teacher = "";
    if (isActivity) {
      activities += 1;
    } else if (categoryName.indexOf("BATCH") > -1) {
      classes += 1;
    } else {
      classes += 1;
      teacher = firstText(event.teacherName, event.teacher, event.instructorName, event.instructor, event.hostName, event.name) || "N/A";
    }
    items.push({
      id: event.id,
      info,
      isActivity,
      courseName,
      category,
      teacher,
      dateText: event.startZoned ? format(event.startZoned, "MMM dd, yyyy") : "N/A",
      timeText: event.startZoned && event.endZoned ? `${format(event.startZoned, "hh:mm a")} - ${format(event.endZoned, "hh:mm a")}` : "N/A",
    });
  });
  return { items, total: items.length, activities, classes };
}
