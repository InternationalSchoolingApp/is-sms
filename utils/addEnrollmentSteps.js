/**
 * Step number <-> route mapping for the "Add Another Student" wizard, mirroring
 * utils/wizardSteps.js for the main enrollment flow but with only 3 steps (no
 * parent-details — the parent is already known, see useAddEnrollmentContext):
 *   /{school}/add-enrollment/{parentId}/{sessionUserId}/step/{slug}
 *
 * signupPage from enrollAnotherChild() only ever comes back 1-3; anything
 * outside that range falls back to step 1.
 */
export const ADD_STEP_SLUGS = {
  1: "student-details",
  2: "course-selection",
  3: "review-and-payment",
};

export function addEnrollmentBasePath(school, parentId, sessionUserId) {
  return `/${school}/add-enrollment/${parentId}/${sessionUserId}/step`;
}

export function addEnrollmentStepPath(school, parentId, sessionUserId, step) {
  const slug = ADD_STEP_SLUGS[step] ?? ADD_STEP_SLUGS[1];
  return `${addEnrollmentBasePath(school, parentId, sessionUserId)}/${slug}`;
}

/**
 * The backend's nextSessionStage uses the main flow's 4-step numbering
 * (1 student, 2 parent, 3 course, 4 review). This wizard has no parent step,
 * so the add flow's own marker is 1 student, 2 course, 3 review. The backend
 * already writes 2 after student details (= course here) and 4 after course
 * selection (= review here); 3 is only ever written by the parent step, which
 * this flow never runs. Returns the 1-3 marker, or null when out of range.
 */
export function normalizeAddSignupPage(signupPage) {
  const page = Number(signupPage);
  if (page === 4) return 3;
  return page >= 1 && page <= 3 ? page : null;
}

/**
 * ONE_TO_ONE_FLEX only: an extra "Academic & Communication Details" step sits between student-details and
 * course-selection. It is a route, not a numbered step, so the 1-3 resume markers above stay unchanged.
 */
export function addEnrollmentParentPath(school, parentId, sessionUserId) {
  return `${addEnrollmentBasePath(school, parentId, sessionUserId)}/parent-details`;
}

// The thank-you details API's isFirstPayment flag ("Y" = the registration fee of a fresh enrollment).
export function isFirstPayment(info) {
  return String(info?.isFirstPayment ?? "").toUpperCase() === "Y";
}
