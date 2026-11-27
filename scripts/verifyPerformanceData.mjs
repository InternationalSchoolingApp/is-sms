// My Performance page helpers (components/k5/pages/k5PerformanceData.js) against
// "My Performance — API Formula Reference". Run: npm run verify:performance-data
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  badgeView,
  daysBetween,
  daysTo,
  fmtShort,
  fmtWeekday,
  paceInfo,
  perWeek,
  perWeekText,
  sessionInfo,
  starLevel,
} from "../components/k5/pages/k5PerformanceData.js";

test("per_week = max(1, ⌈assignments_left ÷ (days_to_finish ÷ 7)⌉)", () => {
  // Economics: 35 ÷ (242 ÷ 7) = 1.01 → 2
  assert.equal(perWeek(35, "2027-06-20", "2026-10-21"), 2);
  // Cybersecurity: 34 ÷ (273 ÷ 7) = 0.87 → 1
  assert.equal(perWeek(34, "2027-08-06", "2026-11-06"), 1);
  // Weekly total: 194 ÷ (242 ÷ 7) = 5.6 → 6
  assert.equal(perWeek(194, "2027-06-20", "2026-10-21"), 6);
  assert.equal(perWeek(0, "2027-06-20", "2026-10-21"), 1, "never below 1");
});

test("days_to_finish = max(1, finish_by − today), also when the date has passed", () => {
  assert.equal(daysTo("2027-06-20", "2026-10-21"), 242);
  assert.equal(daysTo("2026-10-01", "2026-10-21"), 1);
  assert.equal(perWeek(10, "2026-10-01", "2026-10-21"), 70, "past finish date uses 1 day");
});

test("assignment / assignments wording", () => {
  assert.equal(perWeekText(5, "2027-06-20", "2026-10-21"), "1 assignment a week");
  assert.equal(perWeekText(194, "2027-06-20", "2026-10-21"), "6 assignments a week");
});

test("pace note uses |pace_gap|", () => {
  assert.equal(paceInfo({ pace: "ahead", paceGap: 6.8 }).text, "Ahead — 6.8% ahead of today’s target");
  assert.equal(paceInfo({ pace: "behind", paceGap: -5.24 }).text, "Behind — 5.2% behind today’s target");
  assert.equal(paceInfo({ pace: "on_track", paceGap: -2.7 }).label, "On Track");
  assert.equal(paceInfo({ pace: "behind" }).key, "B");
});

test("calendar days never shift with the browser's timezone", () => {
  assert.equal(fmtShort("2026-10-16"), "Oct 16, 2026");
  assert.equal(fmtWeekday("2026-11-09"), "Mon");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysBetween("2026-10-29", "2027-08-20"), 295);
  assert.equal(fmtShort(null), "N/A");
});

test("session pill and days left from the tiles", () => {
  assert.deepEqual(sessionInfo({ endDate: "2027-08-06", daysLeft: 270 }), {
    label: "Session 2026–27 · Ends Aug 06, 2027",
    endsTx: "Aug 06, 2027",
    days: 270,
  });
  assert.equal(sessionInfo(null), null);
});

test("badges keep their earned date; locked ones say how to unlock", () => {
  const [early, onTarget] = badgeView(
    [
      { id: "EARLY_SUBMITTER", name: "Early Submitter", earned: true, earnedOn: "2026-11-09" },
      { id: "ON_TARGET", name: "On Target", earned: false, earnedOn: null },
    ],
    90
  );
  assert.equal(early.desc, "Earned Nov 09, 2026");
  assert.equal(onTarget.desc, "Locked · 90% average score");
  assert.ok(early.medal && onTarget.medal);
});

test("star ladder boundaries (90 / 80 / 70 / 60)", () => {
  assert.equal(starLevel(90).stars, 5);
  assert.equal(starLevel(89.99).stars, 4);
  assert.equal(starLevel(60).stars, 2);
  assert.equal(starLevel(0).stars, 1);
});
