// My Performance (K–5 look). Every number comes worked out from the backend ("My Performance — API Formula
// Reference", read from the daily cron's tables); this file only formats it.

// Mockup star ladder (Playful.dc.html LV) with its tile colours and the score bubble message (pkM_*).
// `id` names the level's messages (k5Performance.stars.<id>.*); label / range / msg stay the English originals.
export const STAR_LEVELS = [
  { id: "superstar", min: 90, stars: 5, label: "Superstar", range: "90–100%", bg: "#FFF1C2", fg: "#7A4E00", acc: "#FFC531", msg: "Amazing work! You are a superstar." },
  { id: "great", min: 80, stars: 4, label: "Great", range: "80–89%", bg: "var(--k5-gT)", fg: "var(--k5-gX)", acc: "var(--k5-gI)", msg: "Great job! A little more to become a Superstar." },
  { id: "good", min: 70, stars: 3, label: "Good", range: "70–79%", bg: "var(--k5-bT)", fg: "var(--k5-bI)", acc: "var(--k5-bI)", msg: "Good going! Keep practising to earn more stars." },
  { id: "gettingThere", min: 60, stars: 2, label: "Getting there", range: "60–69%", bg: "var(--k5-vT)", fg: "var(--k5-vX)", acc: "var(--k5-vI)", msg: "You are getting there! Every try makes you better." },
  { id: "practise", min: 0, stars: 1, label: "Let’s practise", range: "Below 60%", bg: "var(--k5-oT)", fg: "var(--k5-oI)", acc: "var(--k5-oI)", msg: "Let’s practise together. You can do it!" },
];
export const PERFECT_MSG = "Perfect score! You got every answer right.";

export function starLevel(score) {
  const pct = parseFloat(score) || 0;
  return STAR_LEVELS.find((l) => pct >= l.min) || STAR_LEVELS[STAR_LEVELS.length - 1];
}

// Mockup streak badges (MS). `id` names the badge's message (k5Performance.streak.badges.<id>).
export const STREAK_BADGES = [
  { id: "spark", need: 3, name: "Spark" },
  { id: "flame", need: 5, name: "Flame" },
  { id: "blaze", need: 10, name: "Blaze" },
  { id: "fireStar", need: 20, name: "Fire Star" },
];

export const courseKey = (course) => course.lmsEnrollmentId || course.courseName;

export const num = (v) => {
  const n = parseFloat(String(v ?? "").replace(/%$/, ""));
  return Number.isNaN(n) ? null : n;
};

export function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// Subject colours (mockup --sLaI / --sLaT …), picked from the course name; unknown subjects take turns.
const SUBJECTS = ["La", "Ma", "Sc", "Ar", "Cs"];
function subjectOf(name) {
  const n = String(name || "").toLowerCase();
  if (/computer|coding|technology|digital/.test(n)) return "Cs";
  if (/math/.test(n)) return "Ma";
  if (/science|biology|chemistry|physics/.test(n)) return "Sc";
  if (/\bart\b|music|drama|design/.test(n)) return "Ar";
  if (/language|english|reading|writing|literacy/.test(n)) return "La";
  return null;
}
export function courseTone(course, index) {
  const k = subjectOf(course.courseName) || SUBJECTS[index % SUBJECTS.length];
  return { col: `var(--k5-s${k}I)`, lt: `var(--k5-s${k}T)` };
}

// ---- dates: always calendar days in the student's timezone ("today" comes from the backend) ---------------
const DAY = 86_400_000;
/** "2026-10-27" -> a UTC timestamp for that calendar day (no local-time shift). */
export const isoTime = (iso) => (iso ? Date.parse(`${iso}T00:00:00Z`) : NaN);
export const toIso = (t) => new Date(t).toISOString().slice(0, 10);
export const addDays = (iso, n) => toIso(isoTime(iso) + n * DAY);
export const daysBetween = (fromIso, toIsoDate) => Math.round((isoTime(toIsoDate) - isoTime(fromIso)) / DAY);
// `tag` (optional): the dashboard language's BCP 47 tag (useLocaleTag), so month / day names follow the language.
export const fmtShort = (iso, tag = "en-US") =>
  iso ? new Date(isoTime(iso)).toLocaleDateString(tag, { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }) : "N/A";
export const fmtDay = (iso, tag = "en-US") => (iso ? new Date(isoTime(iso)).toLocaleDateString(tag, { month: "short", day: "numeric", timeZone: "UTC" }) : "");
export const fmtWeekday = (iso, tag = "en-US") => (iso ? new Date(isoTime(iso)).toLocaleDateString(tag, { weekday: "short", timeZone: "UTC" }) : "");

// ---- pace (Shared calculations §4) ------------------------------------------------------------------------
// `id` names the pace's messages (k5Performance.pace.<id>.*).
const PACE = {
  ahead: { key: "A", id: "ahead", bg: "var(--k5-gT)", fg: "var(--k5-gX)", label: "Ahead" },
  on_track: { key: "O", id: "onTrack", bg: "var(--k5-bT)", fg: "var(--k5-bI)", label: "On Track" },
  behind: { key: "B", id: "behind", bg: "var(--k5-rT)", fg: "var(--k5-red)", label: "Behind" },
};

/**
 * Pace chip + course-page note, e.g. "Ahead — 6.8% ahead of today’s target". `label` / `text` are English; a page
 * translates them from `id` and `gap` (the note's number).
 */
export function paceInfo(course) {
  const p = PACE[course.pace] || PACE.on_track;
  const gap = Math.abs(num(course.paceGap) ?? 0).toFixed(1);
  const text =
    course.pace === "ahead"
      ? `Ahead — ${gap}% ahead of today’s target`
      : course.pace === "behind"
        ? `Behind — ${gap}% behind today’s target`
        : "On Track — right around today’s target";
  return { ...p, text, gap };
}

/**
 * Session pill: the earliest course start date and the latest course end date (both from the performance answer: each
 * course's startDate / endDate). Without a start date the pill shows the end only, as before.
 */
export function sessionInfo(tiles, courses = []) {
  const parts = sessionParts(tiles, courses);
  if (!parts) return null;
  const { startYear, endYear, startsTx, endsTx } = parts;
  return {
    label: `Session ${startYear}–${endYear} · ${startsTx ? `Starts ${startsTx} · ` : ""}Ends ${endsTx}`,
    startsTx,
    endsTx,
    days: tiles.daysLeft ?? 0,
  };
}

/** The pieces of the session pill (years as shown, dates formatted with `tag`), for a translated label; null without an end date. */
export function sessionParts(tiles, courses = [], tag = "en-US") {
  if (!tiles?.endDate) return null;
  const endYear = Number(tiles.endDate.slice(0, 4));
  const startIso = asArray(courses)
    .map((course) => String(course?.startDate || "").slice(0, 10))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()[0];
  const startYear = startIso ? Number(startIso.slice(0, 4)) : endYear - 1;
  return { startYear, endYear: String(endYear).slice(2), startsTx: startIso ? fmtShort(startIso, tag) : "", endsTx: fmtShort(tiles.endDate, tag) };
}

// ---- My Goals ---------------------------------------------------------------------------------------------
export const GOAL_SCORES = [
  [80, "B"],
  [85, "B+"],
  [90, "A"],
  [95, "A+"],
];

/** days_to_finish = max(1, finish_by − today). */
export const daysTo = (finishBy, today) => Math.max(1, daysBetween(today, finishBy));
/** per_week = max(1, ⌈assignments_left ÷ (days_to_finish ÷ 7)⌉). */
export const perWeek = (left, finishBy, today) => Math.max(1, Math.ceil(left / (daysTo(finishBy, today) / 7)));
/** "1 assignment a week" / "3 assignments a week". */
export const perWeekText = (left, finishBy, today) => {
  const n = perWeek(left, finishBy, today);
  return `${n} assignment${n === 1 ? "" : "s"} a week`;
};

// ---- Achievements -----------------------------------------------------------------------------------------
// Medal colours from the mockup (.pkemb); Halfway / On Target are only drawn locked there, so they borrow the
// teal and orange tint pairs.
const MEDALS = {
  EARLY_SUBMITTER: { icon: "clock", ribbon: "#93B8F5", fill: "#4F8BF0", ring: "#1E5BC6", glyph: "#FFFFFF", bg: "var(--k5-bT)", fg: "var(--k5-bI)" },
  CLEAN_SWEEP: { icon: "bolt", ribbon: "#C7B0F2", fill: "#9A6BEA", ring: "#5B33B5", glyph: "#FFFFFF", bg: "var(--k5-vT)", fg: "var(--k5-vX)" },
  PERFECT_SCORE: { icon: "star", ribbon: "#FFE08A", fill: "#FFC531", ring: "#B97800", glyph: "#5A3B00", bg: "var(--k5-gT)", fg: "var(--k5-gX)" },
  HALFWAY: { icon: "flag", ribbon: "#A9E8DE", fill: "#2BB3A0", ring: "#0F766E", glyph: "#FFFFFF", bg: "var(--k5-tT)", fg: "var(--k5-tX)" },
  ON_TARGET: { icon: "target", ribbon: "#FFC8A0", fill: "#F28C28", ring: "#B35F00", glyph: "#FFFFFF", bg: "var(--k5-oT)", fg: "var(--k5-oI)" },
};

// How each badge is unlocked (API Formula Reference, Achievements).
const UNLOCK = {
  EARLY_SUBMITTER: "5 assignments before the due date",
  CLEAN_SWEEP: "100% three times in a row",
  PERFECT_SCORE: "100% in two courses",
  HALFWAY: "50% done in any course",
};

/**
 * Stored badges (earned ones keep their date) with the mockup medal and the unlock / earned line (`desc`, English;
 * a page translates it from id / earned / earnedOn / goalScore).
 */
export function badgeView(badges, goalScore) {
  return asArray(badges).map((b) => {
    const how = b.id === "ON_TARGET" ? `${goalScore}% average score` : UNLOCK[b.id] || "";
    return {
      ...b,
      medal: MEDALS[b.id] || MEDALS.EARLY_SUBMITTER,
      desc: b.earned ? `Earned ${fmtShort(b.earnedOn)}` : `Locked · ${how}`,
      goalScore,
    };
  });
}
