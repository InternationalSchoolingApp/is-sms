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
