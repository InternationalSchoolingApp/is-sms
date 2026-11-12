"use server";

import { backendRequest } from "@/utils/backendRequest";

/**
 * What a student still has to do before the dashboard: the legacy "additional layer" screens
 * (school e-mail / Outlook setup, overdue fee, Azure user, Confirm Your Time Zone) and Dashboard Setup
 * (Academic Year Start Date, School System Training).
 *
 *   {school}/dashboard/additinal-layer-details  { userId }   (DashboardStudentUtil#getAddtionalLayer)
 *
 * userId always comes from the signed-in token, never from the browser. The backend answer also carries
 * the school e-mail password and the due-fee rows; only the flags (and the setup data the setup page
 * needs) leave the server.
 *
 * getOnboardingStatus returns { ok, data: { outlookSetup, paymentOverDue, azureUser, timezone, dashboardSetup, setup } }
 * or { ok: false, code, message, sessionExpired? }.
 */
const SESSION_EXPIRED = { ok: false, sessionExpired: true, code: "SESSION_EXPIRED", message: "Your session has been logged out" };
// Project timezone rule: Asia/Singapore when the student's time zone is missing / unknown.
const FALLBACK_TIMEZONE = "Asia/Singapore";

async function fetchLayerDetails() {
  const result = await backendRequest({
    path: "dashboard/additinal-layer-details",
    buildBody: (me) => ({ userId: me.userId }),
  });
  if (!result.ok) return result;
  const answer = result.data;
  if (String(answer?.status) === "3") return SESSION_EXPIRED;
  if (String(answer?.status ?? "") !== "1") {
    return { ok: false, code: String(answer?.statusCode || "FAILED"), message: answer?.message || "Your pending steps could not be checked." };
  }
  return { ok: true, details: answer.details || {} };
}

function flagsOf(details) {
  return {
    outlookSetup: details.outlookSetupPending === true,
    paymentOverDue: details.paymentOverDue === true,
    azureUser: details.createAzureUser === true,
    timezone: details.changeTimezone === true,
    dashboardSetup: details.dashboardSetupPending === true,
    setup: details.dashboardSetupPending === true ? details.dashboardSetup || null : null,
  };
}

export async function getOnboardingStatus() {
  const r = await fetchLayerDetails();
  if (!r.ok) return r;
  return { ok: true, data: flagsOf(r.details) };
}

// Legacy option label (additionalLayerContent.js timezoneCard): "(UTC +05:30) - India/Kolkata".
function timezoneOption(tz) {
  const offset = tz.extra || tz.value || "";
  const zone = [tz.extra1, tz.extra3].filter(Boolean).join("/");
  return { value: String(tz.key ?? ""), label: `(${offset}) - ${zone}`, zone };
}

/**
 * Data for the Welcome page (/{school}/student/welcome): the flags plus what the screens show.
 *   timezone: { options: [{ value, label }], selected }  - the detected zone pre-selected (legacy), else
 *             Asia/Singapore when nothing usable was detected (project timezone rule)
 *   dueFees:  the overdue, unpaid fee rows (legacy paymentOverDueCard skips SUCCESS / not overdue)
 */
export async function getWelcomeDetails() {
  const r = await fetchLayerDetails();
  if (!r.ok) return r;
  const details = r.details;
  let timezone = null;
  if (details.changeTimezone === true) {
    const tzData = details.timeZone || {};
    const options = (Array.isArray(tzData.timezones) ? tzData.timezones : []).map(timezoneOption).filter((o) => o.value);
    const detected = options.find((o) => o.value === String(tzData.currentTimezoneId ?? ""));
    const fallback = options.find((o) => o.zone === FALLBACK_TIMEZONE);
    timezone = {
      options: options.map(({ value, label }) => ({ value, label })),
      selected: (detected || fallback)?.value || "",
    };
  }
  const rows = details.paymentOverDue === true ? details.studentDueFees?.userPaymentDetailsList : null;
  const dueFees = (Array.isArray(rows) ? rows : [])
    .filter((item) => item && item.status !== "SUCCESS" && item.isOverDue)
    .map((item) => ({
      id: item.id,
      standardName: item.standardName || "",
      paymentName: item.paymentName || "",
      amount: Number(item.totalFeeWithMaterialFee || 0),
      dueDate: item.scheduledPayDate || "",
      status: item.status || "",
    }));
  return { ok: true, data: { ...flagsOf(details), timezone, dueFees } };
}

// ---- Dashboard Setup (/{school}/student/setup) - legacy DashboardSetup.jsp ----

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad2 = (n) => String(n).padStart(2, "0");

// "2026-11-13" -> { mmm: "Nov 13, 2026" (legacy changeDateFormat "MMM-dd-yyyy"), mdy: "11-13-2026" } or null.
function legacyDates(iso) {
  const m = ISO_DATE.exec(String(iso || ""));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return { mmm: `${MONTHS[mo - 1]} ${pad2(d)}, ${y}`, mdy: `${pad2(mo)}-${pad2(d)}-${y}` };
}

// "10:30:00" + 30 min -> "11:00:00" (legacy getTimePlusInterval + convertTo24Hour + ":00").
function addMinutes(hms, minutes) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hms || ""));
  if (!m) return null;
  const total = (Number(m[1]) * 60 + Number(m[2]) + Number(minutes || 0)) % (24 * 60);
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}:00`;
}

const failedAnswer = (answer) => ["0", "2", "3", "FAILED"].includes(String(answer?.status ?? "").toUpperCase());

/** The Dashboard Setup data (same as the gate's `setup`), or { setup: null } when there is nothing to set up. */
export async function getSetupDetails() {
  const r = await fetchLayerDetails();
  if (!r.ok) return r;
  const flags = flagsOf(r.details);
  return { ok: true, data: { setup: flags.setup } };
}

async function setupFacts() {
  const r = await fetchLayerDetails();
  if (!r.ok) return r;
  const setup = flagsOf(r.details).setup;
  if (!setup?.studentStandardId) return { ok: false, code: "NOTHING_TO_SET_UP", message: "There is nothing left to set up." };
  return { ok: true, setup };
}

async function fetchTrainingSlots(mmm) {
  const result = await backendRequest({
    path: "api/v1/orientation/get-orientation-time",
    buildBody: (me) => ({ userId: me.userId, userRole: "STUDENT", schoolId: me.schoolNumericId, slotType: "SYS-TRAINING", bookDate: mmm }),
  });
  if (!result.ok) return result;
  if (String(result.data?.status) === "3") return SESSION_EXPIRED;
  if (failedAnswer(result.data)) return { ok: false, code: "SLOTS", message: result.data?.message || "The training times could not be loaded." };
  const list = Array.isArray(result.data?.demoFreeSlotsList) ? result.data.demoFreeSlotsList : [];
  return {
    ok: true,
    slots: list
      .filter((s) => s && s.stTime)
      .map((s) => ({ stTime: String(s.stTime), label: String(s.startTime || s.stTime), duration: Number(s.meetingDuration || 0), timeZone: s.studentTimeZone || "" })),
  };
}

/**
 * Free School System Training times on a date ({school}/api/v1/orientation/get-orientation-time, slotType SYS-TRAINING;
 * legacy callOrientationtime). Returns { slots: [{ stTime, label, duration }], timeZone }.
 */
export async function getTrainingSlots(isoDate) {
  const dates = legacyDates(isoDate);
  if (!dates) return { ok: false, code: "BAD_DATE", message: "Please choose your school system training date." };
  const r = await fetchTrainingSlots(dates.mmm);
  if (!r.ok) return r;
  return { ok: true, data: { slots: r.slots.map(({ stTime, label, duration }) => ({ stTime, label, duration })), timeZone: r.slots[0]?.timeZone || "" } };
}

async function saveTimePreference(body) {
  const result = await backendRequest({ path: "report/save-time-preference", buildBody: body });
  if (!result.ok) return result;
  const answer = result.data || {};
  if (String(answer.status) === "3") return SESSION_EXPIRED;
  if (failedAnswer(answer)) return { ok: false, code: String(answer.statusCode || "SAVE_FAILED"), message: answer.message || "Your choice could not be saved." };
  return { ok: true, data: { message: answer.message || "" } };
}

/**
 * Book the School System Training (legacy saveTeacherTimePreferenceStudent('systemtraining'), saveType ORIENT):
 * books the slot and, when the student has none yet, sets the academic year start date to the training date.
 * The chosen time is checked against that date's free slots on the server (its duration comes from there too).
 */
export async function bookSystemTraining({ date, stTime } = {}) {
  const dates = legacyDates(date);
  if (!dates) return { ok: false, code: "BAD_DATE", message: "Please choose your school system training date." };
  if (!stTime) return { ok: false, code: "BAD_TIME", message: "Please choose your school system training time." };
  const facts = await setupFacts();
  if (!facts.ok) return facts;
  const free = await fetchTrainingSlots(dates.mmm);
  if (!free.ok) return free;
  const slot = free.slots.find((s) => s.stTime === String(stTime));
  if (!slot) return { ok: false, code: "SLOT_GONE", message: "This time is no longer available. Please choose another time." };
  const bookEndTime = addMinutes(slot.stTime, slot.duration);
  return saveTimePreference((me) => ({
    userId: me.userId,
    schoolId: me.schoolNumericId,
    slotAddUserId: me.userId,
    studentStandardId: facts.setup.studentStandardId,
    userRole: "STUDENT",
    saveType: "ORIENT",
    semesterStartDate: dates.mdy,
    bookDate: dates.mmm,
    bookStartTime: slot.stTime,
    bookEndTime,
    teacherTimeList: [{ startDate: dates.mmm, startTime: "09:00:00", endTime: "09:00:00" }],
  })).then((r) => (r.ok ? { ok: true, data: { message: r.data.message, dateTime: `${dates.mmm} ${slot.label}` } } : r));
}

/**
 * Academic Year Start Date (legacy saveTeacherTimePreferenceStudent('academicYear'), saveType SKIP): sets the start
 * date only - it cannot be changed later.
 */
export async function saveAcademicYearStart({ date } = {}) {
  const dates = legacyDates(date);
  if (!dates) return { ok: false, code: "BAD_DATE", message: "Please choose your academic year start date." };
  const facts = await setupFacts();
  if (!facts.ok) return facts;
  return saveTimePreference((me) => ({
    userId: me.userId,
    schoolId: me.schoolNumericId,
    slotAddUserId: me.userId,
    studentStandardId: facts.setup.studentStandardId,
    userRole: "STUDENT",
    saveType: "SKIP",
    semesterStartDate: dates.mdy,
    teacherTimeList: [],
  }));
}

/**
 * Confirm Your Time Zone -> {school}/api/v1/common/save-user-new-timezone (legacy proceedWithUserChangedTimezone).
 * Saves the user's time zone, moves their classes to it and logs the confirmation (USER_TIMEZONE_LOG), so the
 * screen is not shown again.
 */
export async function saveTimezone(timezoneId) {
  const id = Number(timezoneId);
  if (!(id > 0)) return { ok: false, code: "REQUIRED", message: "Please select your time zone." };
  const result = await backendRequest({
    path: "api/v1/common/save-user-new-timezone",
    buildBody: (me) => ({
      authentication: { userType: "common", userId: me.userId, schoolId: me.schoolNumericId, schoolUUID: me.schoolUUID },
      // A string, like the legacy <select> value: the backend reads it with both optInt and getString,
      // and org.json's getString throws on a number (after the user row is already saved).
      data: { timezoneId: String(id) },
    }),
  });
  if (!result.ok) return result;
  const answer = result.data || {};
  if (String(answer.status) === "3") return SESSION_EXPIRED;
  if (String(answer.status ?? "") !== "1") {
    return { ok: false, code: String(answer.statusCode || "FAILED"), message: answer.message || "There is an error while updating timezone. Please try again." };
  }
  return { ok: true, data: { message: answer.message || "" } };
}
