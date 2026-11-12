/**
 * Re-enrollment (existing student moving to the next grade / repeating) screens.
 * The backend decides the order: eligibility / select-option return `steps`, e.g.
 *   payment first : ["PAYMENT", "COURSE_SELECTION", "REVIEW"]  (["COURSE_SELECTION", "REVIEW"] once the grade fee is paid)
 *   courses first : ["COURSE_SELECTION", "PAYMENT", "REVIEW"]  (Flexy / Dual Diploma / Take Individual Course)
 * Routes: /{school}/student/re-enrollment (choose option) and /{school}/student/re-enrollment/{payment,course-selection,review},
 * inside the student dashboard layout.
 */
export const STEP_PAYMENT = "PAYMENT";
export const STEP_COURSE_SELECTION = "COURSE_SELECTION";
export const STEP_REVIEW = "REVIEW";

const STEP_SLUGS = {
  [STEP_PAYMENT]: "payment",
  [STEP_COURSE_SELECTION]: "course-selection",
  [STEP_REVIEW]: "review",
};

// Route segment -> step name (the shell's stepper highlight).
export const SEGMENT_TO_STEP = {
  payment: STEP_PAYMENT,
  "course-selection": STEP_COURSE_SELECTION,
  review: STEP_REVIEW,
};

export const STEP_LABELS = {
  [STEP_PAYMENT]: "Payment",
  [STEP_COURSE_SELECTION]: "Course Selection",
  [STEP_REVIEW]: "Review",
};

export function reEnrollmentBasePath(school) {
  return `/${school}/student/re-enrollment`;
}

/** Route of a step; the option screen (base path) for an unknown / empty step. */
export function reEnrollmentStepPath(school, step) {
  const slug = STEP_SLUGS[step];
  return slug ? `${reEnrollmentBasePath(school)}/${slug}` : reEnrollmentBasePath(school);
}

/**
 * The screen after `current`. Once the grade fee is paid the backend drops PAYMENT from `steps`, so after
 * PAYMENT the next screen is simply the first remaining one. null = `current` was the last screen.
 */
export function nextStepAfter(steps, current) {
  const index = steps.indexOf(current);
  if (index >= 0) return steps[index + 1] ?? null;
  if (current === STEP_PAYMENT) return steps.find((step) => step !== STEP_PAYMENT) ?? null;
  return null;
}

/** The screen before `current`, null for the first one (the option is already selected, there is nothing to go back to). */
export function previousStepBefore(steps, current) {
  const index = steps.indexOf(current);
  return index > 0 ? steps[index - 1] : null;
}
