// Local checks for the Attendance Details helpers - no server, no browser.
// Covers utils/attendanceDates.js (date filters, custom range, timezone resolution, UTC -> user timezone display)
// and utils/sessionState.js (one-time session-expired marking, session-out detection).
// Run: node scripts/verifyAttendanceDetails.mjs

import assert from "node:assert/strict";
import {
  STATUS_OPTIONS,
  addDaysYmd,
  apiStatus,
  customBounds,
  formatClassDate,
  formatDateTimeInZone,
  formatTimeInZone,
  isValidTimeZone,
  localDateInZone,
  monthStartYmd,
  pickerDateToYmd,
  rangeForFilter,
  resolveTimeZone,
  todayYmd,
  toDisplayRow,
  validateCustomRange,
  weekStartYmd,
  ymdToPickerDate,
} from "../utils/attendanceDates.js";
import { SESSION_EXPIRED_MESSAGE, SessionExpiredError, isSessionExpired, isSessionExpiredError, isSessionOutResponse, markSessionExpired, resetSessionExpiredForTests, subscribeSessionExpired } from "../utils/sessionState.js";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("PASS", name);
  } catch (error) {
    console.log("FAIL", name, "\n     ", error.message);
    process.exitCode = 1;
  }
}

// ---- date filters ------------------------------------------------------------------------------------------
// 2026-11-06 is a Friday.
test("today / yesterday", () => {
  assert.deepEqual(rangeForFilter("TODAY", "2026-11-06"), { from: "2026-11-06", to: "2026-11-06" });
  assert.deepEqual(rangeForFilter("YESTERDAY", "2026-11-06"), { from: "2026-11-05", to: "2026-11-05" });
  assert.deepEqual(rangeForFilter("YESTERDAY", "2026-03-01"), { from: "2026-02-28", to: "2026-02-28" });
  assert.deepEqual(rangeForFilter("YESTERDAY", "2027-01-01"), { from: "2026-12-31", to: "2026-12-31" });
});
test("week starts on the project's first day (Sunday) and ends today", () => {
  assert.deepEqual(rangeForFilter("WEEK", "2026-11-06"), { from: "2026-11-01", to: "2026-11-06" });
  assert.deepEqual(rangeForFilter("WEEK", "2026-11-01"), { from: "2026-11-01", to: "2026-11-01" });
  assert.equal(weekStartYmd("2026-11-06", 1), "2026-11-02"); // Monday start, if the project ever switches
});
test("month: first day of the current month to today (default filter)", () => {
  assert.deepEqual(rangeForFilter("MONTH", "2026-11-06"), { from: "2026-11-01", to: "2026-11-06" });
  assert.equal(monthStartYmd("2026-02-28"), "2026-02-01");
});
test("custom has no preset range", () => assert.equal(rangeForFilter("CUSTOM", "2026-11-06"), null));
test("leap day arithmetic", () => assert.equal(addDaysYmd("2028-03-01", -1), "2028-02-29"));

// ---- custom range (days always come from the backend setting) -------------------------------------------------
test("custom bounds follow the configured number of days", () => {
  assert.deepEqual(customBounds("2026-11-06", 60), { min: "2026-09-07", max: "2026-11-06" });
  assert.deepEqual(customBounds("2026-11-06", 30), { min: "2026-10-07", max: "2026-11-06" });
  assert.deepEqual(customBounds("2026-11-06", 7), { min: "2026-10-30", max: "2026-11-06" });
});
test("custom validation: inside, edge, too old, future, wrong To", () => {
  const today = "2026-11-06";
  assert.equal(validateCustomRange("2026-10-20", today, today, 60), null);
  assert.equal(validateCustomRange("2026-09-07", today, today, 60), null);
  assert.match(validateCustomRange("2026-09-06", today, today, 60), /60 days/);
  assert.match(validateCustomRange("2026-11-07", today, today, 60), /Future/);
  assert.match(validateCustomRange("2026-10-20", "2026-11-05", today, 60), /To date/);
  assert.match(validateCustomRange("nope", today, today, 60), /valid date/);
});

// ---- picker dates never shift a day -----------------------------------------------------------------------------
test("picker round trip keeps the calendar day", () => {
  for (const ymd of ["2026-01-01", "2026-03-29", "2026-10-25", "2026-12-31"]) assert.equal(pickerDateToYmd(ymdToPickerDate(ymd)), ymd);
  assert.equal(pickerDateToYmd(new Date("x")), null);
});

// ---- timezone resolution --------------------------------------------------------------------------------------
test("valid timezone is kept, invalid / blank / missing become Asia/Singapore", () => {
  assert.equal(resolveTimeZone("Asia/Kolkata"), "Asia/Kolkata");
  assert.equal(resolveTimeZone(" America/New_York "), "America/New_York");
  assert.equal(resolveTimeZone("Not/AZone"), "Asia/Singapore");
  assert.equal(resolveTimeZone(""), "Asia/Singapore");
  assert.equal(resolveTimeZone(null), "Asia/Singapore");
  assert.equal(resolveTimeZone(undefined), "Asia/Singapore");
  assert.equal(isValidTimeZone("UTC"), true);
});
test("today is computed in the resolved timezone", () => {
  const instantUtc = new Date("2026-11-06T20:30:00Z"); // 02:00 on the 7th in Kolkata, 04:30 on the 7th in Singapore, 15:30 on the 6th in New York
  assert.equal(todayYmd("Asia/Kolkata", instantUtc), "2026-11-07");
  assert.equal(todayYmd("Asia/Singapore", instantUtc), "2026-11-07");
  assert.equal(todayYmd("America/New_York", instantUtc), "2026-11-06");
  assert.equal(todayYmd("garbage", instantUtc), "2026-11-07"); // falls back to Singapore
});

// ---- UTC -> user timezone ---------------------------------------------------------------------------------------
const row = { className: "Mathematics", classDate: "2025-10-14", startTime: "2025-10-14T01:00:00Z", endTime: "2025-10-14T01:50:00Z", joinedTime: "2025-10-14T01:15:00Z", status: "PRESENT", absentLabel: null, late: true, lateByMinutes: 15 };
test("Asia/Kolkata (+05:30)", () => {
  assert.equal(formatDateTimeInZone(row.startTime, "Asia/Kolkata"), "2025-10-14 06:30 AM");
  assert.equal(formatDateTimeInZone(row.endTime, "Asia/Kolkata"), "2025-10-14 07:20 AM");
  assert.equal(formatDateTimeInZone(row.joinedTime, "Asia/Kolkata"), "2025-10-14 06:45 AM");
});
test("Asia/Singapore (+08:00)", () => {
  assert.equal(formatDateTimeInZone(row.startTime, "Asia/Singapore"), "2025-10-14 09:00 AM");
  assert.equal(formatDateTimeInZone(row.endTime, "Asia/Singapore"), "2025-10-14 09:50 AM");
  assert.equal(formatDateTimeInZone(row.joinedTime, "Asia/Singapore"), "2025-10-14 09:15 AM");
});
test("America/New_York (-04:00 in October, DST)", () => {
  assert.equal(formatDateTimeInZone(row.startTime, "America/New_York"), "2025-10-13 09:00 PM");
  assert.equal(formatTimeInZone(row.joinedTime, "America/New_York"), "9:15 PM");
});
test("invalid timezone falls back to Singapore", () => assert.equal(formatTimeInZone(row.startTime, "Not/AZone"), "9:00 AM"));
test("null / empty / invalid instants stay empty", () => {
  assert.equal(formatTimeInZone(null, "Asia/Kolkata"), null);
  assert.equal(formatTimeInZone("", "Asia/Kolkata"), null);
  assert.equal(formatTimeInZone("not a date", "Asia/Kolkata"), null);
  assert.equal(formatDateTimeInZone(undefined, "Asia/Kolkata"), null);
  assert.equal(localDateInZone(null, "Asia/Kolkata"), null);
});
test("classDate is a date-only value and never shifts", () => {
  assert.equal(formatClassDate("2025-10-14"), "Tue, Oct 14, 2025");
  assert.equal(formatClassDate("2026-01-01"), "Thu, Jan 01, 2026");
  assert.equal(formatClassDate("2026-12-31"), "Thu, Dec 31, 2026");
  assert.equal(formatClassDate("garbage"), "");
  for (const zone of ["Asia/Kolkata", "Asia/Singapore", "America/New_York", "Pacific/Kiritimati"]) {
    assert.equal(toDisplayRow(row, zone).classDate, "2025-10-14");
    assert.equal(toDisplayRow(row, zone).classDateLabel, "Tue, Oct 14, 2025");
  }
});
test("toDisplayRow: raw row untouched, status / late / lateByMinutes / absentLabel as the backend sent them", () => {
  const copy = JSON.parse(JSON.stringify(row));
  const display = toDisplayRow(row, "Asia/Kolkata");
  assert.deepEqual(row, copy);
  assert.equal(display.raw, row);
  assert.deepEqual([display.status, display.late, display.lateByMinutes, display.absentLabel], ["PRESENT", true, 15, null]);
  assert.equal(display.start.time, "6:30 AM");
  assert.equal(display.joined.time, "6:45 AM");
});
test("null joinedTime stays null; absent row keeps its label", () => {
  const absent = { className: "English", classDate: "2025-10-12", startTime: "2025-10-12T03:00:00Z", endTime: "2025-10-12T03:50:00Z", joinedTime: null, status: "ABSENT", absentLabel: "Missed by Student", late: false, lateByMinutes: 0 };
  const display = toDisplayRow(absent, "Asia/Kolkata");
  assert.equal(display.joined.time, null);
  assert.equal(display.absentLabel, "Missed by Student");
  assert.equal(display.start.time, "8:30 AM");
});
test("a class that crosses midnight in the user's zone shows the other day", () => {
  const late = { ...row, classDate: "2025-10-14", startTime: "2025-10-14T19:00:00Z", endTime: "2025-10-14T19:50:00Z", joinedTime: "2025-10-14T19:05:00Z" };
  const display = toDisplayRow(late, "Asia/Kolkata"); // 00:30 on the 15th
  assert.equal(display.start.time, "12:30 AM");
  assert.equal(display.start.shiftedDate, "Wed, Oct 15, 2025");
  assert.equal(display.classDate, "2025-10-14"); // the class date itself is untouched
  assert.equal(toDisplayRow(late, "UTC").start.shiftedDate, null);
});

// ---- status ---------------------------------------------------------------------------------------------------------
test("status labels map to backend values; default is ALL", () => {
  assert.equal(apiStatus(""), "ALL");
  assert.equal(apiStatus("all"), "ALL");
  assert.equal(apiStatus("present"), "PRESENT");
  assert.equal(apiStatus("late"), "LATE");
  assert.equal(apiStatus("absent"), "ABSENT");
  assert.equal(apiStatus("something else"), "ALL");
  assert.deepEqual(STATUS_OPTIONS.map((s) => s.label), ["Select Status", "All", "Present", "Late", "Absent"]);
});

// ---- session state ----------------------------------------------------------------------------------------------------
test("session-out answers are recognised, normal answers are not", () => {
  assert.equal(isSessionOutResponse({ status: "3", statusCode: "E002", message: "Your session has been timed out" }), true);
  assert.equal(isSessionOutResponse({ status: "SUCCESS", statusCode: "3", message: "Your session has been timed out" }), true);
  assert.equal(isSessionOutResponse({ status: "SUCCESS", statusCode: "1", message: "Student attendance details" }), false);
  assert.equal(isSessionOutResponse({ status: "SUCCESS", statusCode: "3", message: "Something else" }), false);
  assert.equal(isSessionOutResponse(null), false);
  assert.equal(isSessionOutResponse("text"), false);
});
test("the session is marked expired once: one dialog, one notification", () => {
  resetSessionExpiredForTests();
  let notified = 0;
  subscribeSessionExpired(() => (notified += 1));
  assert.equal(isSessionExpired(), false);
  assert.equal(markSessionExpired(), true);
  assert.equal(markSessionExpired(), false);
  assert.equal(markSessionExpired(), false);
  assert.equal(isSessionExpired(), true);
  assert.equal(notified, 1);
  resetSessionExpiredForTests();
});
test("SessionExpiredError carries the exact dialog message and is recognisable", () => {
  const error = new SessionExpiredError();
  assert.equal(error.message, "Your session has been logged out");
  assert.equal(SESSION_EXPIRED_MESSAGE, "Your session has been logged out");
  assert.equal(isSessionExpiredError(error), true);
  assert.equal(isSessionExpiredError({ code: "SESSION_EXPIRED" }), true);
  assert.equal(isSessionExpiredError(new Error("boom")), false);
});

console.log(process.exitCode ? "\nSome checks FAILED." : `\nAll ${passed} checks passed.`);
