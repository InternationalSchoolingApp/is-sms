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
