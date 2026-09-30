/**
 * Single source of truth for the wizard step number <-> route path mapping.
 * The backend (nextSessionStage/wizardStep, SSO handoff `step` param) only
 * knows steps as numbers 1-4; the routes themselves are the named paths
 * below. Anything that needs to turn one into the other (SSO handoff,
 * wizard-resume, proxy auth matcher) should import this instead of
 * hardcoding "/step/N".
 */
export const STEP_ROUTES = {
  1: "/step/student-details",
  2: "/step/parent-details",
  3: "/step/course-selection",
  4: "/step/review-and-payment",
};
