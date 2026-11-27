// Pure helpers of the parent's Academic Performance (no React, so they can be checked with a plain node script).

// Agilix Buzz providers: only these get the Pace / Pending / Progress columns and the course detail view
// (legacy getParentAcademicPerformanceSupportsDetailedView).
export const DETAILED_PROVIDERS = [36, 37, 38];

export function supportsDetailedView(courseProviderId) {
  return DETAILED_PROVIDERS.includes(parseInt(courseProviderId, 10));
}

// Legacy getParentAcademicPerformancePaceHtml (the backend's own static icons, PATH_FOLDER_IMAGE2).
export const PACE = {
  Ahead: { label: "Ahead", className: "text-green-600", image: "forward.gif", size: 27 },
  OnTrack: { label: "On Track", className: "text-primary", image: "still.png", size: 24 },
  Behind: { label: "Behind", className: "text-red-600", image: "behind.gif", size: 24 },
  GettingStarted: { label: "Get Started", className: "text-primary", image: "still.png", size: 24 },
};

// Legacy getSalutationByGender.
export function salutation(gender) {
  const normalized = String(gender ?? "").trim().toLowerCase();
  if (normalized === "male") return "Mr.";
  if (normalized === "female") return "Ms.";
  return "";
}

// Legacy parentAcademicPerformanceFormatPercent: "85.50%", or "N/A" for something that is not a number.
export function formatPercent(value) {
  const percent = parseFloat(value || 0);
  return Number.isNaN(percent) ? "N/A" : `${percent.toFixed(2)}%`;
}

// Legacy getParentAcademicPerformanceProgressHtml: a bar value clamped to 0-100.
export function clampProgress(value) {
  const progress = parseFloat(value || 0);
  if (Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}

// The teacher cell: salutation by gender + name, "N/A" when there is no name.
export function teacherLabel(course) {
  const name = String(course?.teacherName ?? "").trim();
  return [name ? salutation(course?.teacherGender) : "", name || "N/A"].filter(Boolean).join(" ");
}

// The grade-history / progress rows hold lists that Buzz sends as an array, a single object or nothing.
export function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

// The backend sends Bootstrap text classes for due / score colouring; only these known ones are honoured.
const TEXT_CLASSES = {
  "text-danger": "text-red-600",
  "text-success": "text-green-600",
  "text-warning": "text-amber-600",
  "text-primary": "text-primary",
};
export const textClass = (value) => TEXT_CLASSES[String(value ?? "").trim()] ?? "";

// Legacy parentAcademicPerformanceBindItemsRows: "Late (2 days)" style submitted status.
export function submitStatusText(item) {
  return item?.submissionStatus ? item.submissionStatus + (item.lateTime ? ` (${item.lateTime})` : "") : "";
}

// Course colours of the design (ring + left edge): [strong, tint]. Picked by subject name, otherwise cycled by position.
const SUBJECT_COLORS = {
  la: ["#1D6FE8", "#E4EEFE"],
  sci: ["#13802B", "#E2F3E6"],
  art: ["#0E93CC", "#DFF3FC"],
  math: ["#B98200", "#FFF2CC"],
  cs: ["#D21F4C", "#FCE4EA"],
  soc: ["#7A4BD8", "#EFE8FD"],
};
const SUBJECT_ORDER = ["la", "sci", "math", "soc", "cs", "art"];
export function subjectColors(name, index = 0) {
  const n = String(name ?? "").toLowerCase();
  const key = /math/.test(n)
    ? "math"
    : /comput/.test(n)
      ? "cs"
      : /scien/.test(n)
        ? "sci"
        : /language|english|reading|writing/.test(n)
          ? "la"
          : /social|histor|geograph/.test(n)
            ? "soc"
            : /\bart\b|paint|draw/.test(n)
              ? "art"
              : SUBJECT_ORDER[index % SUBJECT_ORDER.length];
  return SUBJECT_COLORS[key];
}

// Stars (1-5), a short word and the tooltip of the design for a course score (a percent number).
export function scoreRating(score, firstName) {
  const s = Number(score) || 0;
  const stars = s <= 0 ? 0 : s >= 95 ? 5 : s >= 85 ? 4 : s >= 70 ? 3 : s >= 40 ? 2 : 1;
  // Encouraging words only from 70% up; a low score just shows its stars (never "Good!" for 0%).
  const word = s >= 95 ? "Superstar!" : s >= 85 ? "Great!" : s >= 70 ? "Good!" : "";
  const who = firstName || "Your child";
  const tip = !word ? "" : s >= 95 ? `Amazing! ${who} is a Superstar in this course.` : "Great job! A little more to become a Superstar.";
  return { stars, word, tip };
}

// "Jul 04, 2027"-style or any text date -> time value, NaN when it cannot be read.
export const dateValue = (text) => new Date(text).getTime();
