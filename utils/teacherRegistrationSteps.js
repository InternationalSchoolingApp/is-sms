/**
 * Single source of truth for the teacher registration wizard: step number <-> route slug.
 * The backend (TeacherRegistrationNextjsUtil / CommonUtil#resolveTeacherWizardStep, and the SSO handoff's `step`
 * param) only knows the six steps as numbers 1-6; the routes are the named segments below:
 *   /{school}/teacher-registration/step/{slug}
 *
 * Anything that turns a step number into a path (the SSO handoff, wizard resume, the steps' Back/Continue
 * navigation) imports from here instead of hardcoding the path. Same idea as utils/wizardSteps.js for students.
 */
export const TEACHER_STEP_SLUGS = {
  1: "personal-details",
  2: "professional-details",
  3: "review",
  4: "contract",
  5: "verification",
  6: "bank-details",
};

export const TEACHER_STEP_COUNT = Object.keys(TEACHER_STEP_SLUGS).length;

// Route segment (the step folder name) -> step number.
export const TEACHER_SEGMENT_TO_STEP = Object.fromEntries(
  Object.entries(TEACHER_STEP_SLUGS).map(([step, slug]) => [slug, Number(step)])
);

/** True for a whole step number 1-6 (a number or its string form). */
export function isTeacherStep(step) {
  const value = Number(step);
  return Number.isInteger(value) && value >= 1 && value <= TEACHER_STEP_COUNT;
}

/** /{school}/teacher-registration: the public landing page (account creation). */
export function teacherRegistrationPath(school) {
  return `/${school}/teacher-registration`;
}

export function teacherStepBasePath(school) {
  return `${teacherRegistrationPath(school)}/step`;
}

/** Full route path for a step number (falls back to step 1 for unknown input). */
export function teacherStepPath(school, step) {
  const slug = TEACHER_STEP_SLUGS[isTeacherStep(step) ? Number(step) : 1];
  return `${teacherStepBasePath(school)}/${slug}`;
}
