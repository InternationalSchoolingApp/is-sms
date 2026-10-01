/**
 * Single source of truth for the wizard step number <-> route mapping.
 * The backend (nextSessionStage/wizardStep, SSO handoff `step` param) only
 * knows steps as numbers 1-4; the routes themselves are the named segments
 * below, nested under the enrollment route:
 *   /{school}/enrollment/{program}/step/{slug}
 *
 * Anything that needs to turn a step number into a route path (SSO handoff,
 * wizard-resume, the step pages' Back/Continue navigation) should import
 * `stepPath` / `STEP_SLUGS` from here instead of hardcoding the path.
 *
 * `school` and `program` are the two dynamic route segments. Inside the
 * wizard they come from the current URL (useParams) so navigation preserves
 * whatever the student entered on. The server-side entry points (post-login
 * `/` redirect and the SSO handoff) don't carry a program — neither the
 * Auth.js session nor the backend handoff provides one — so they fall back
 * to DEFAULT_PROGRAM; the step pages resolve the real program/school from the
 * session (see hooks/useEnrollmentContext.js), not this URL segment.
 */
export const STEP_SLUGS = {
  1: "student-details",
  2: "parent-details",
  3: "course-selection",
  4: "review-and-payment",
};

// Default enrollment program segment for entry redirects that don't know the
// real one yet — matches useEnrollmentContext's own "O" default.
export const DEFAULT_PROGRAM = "O";

// Base path for the wizard under a given school/program.
export function stepBasePath(school, program = DEFAULT_PROGRAM) {
  return `/${school}/enrollment/${program}/step`;
}

// Full route path for a step number (falls back to step 1 for unknown input).
export function stepPath(school, program, step) {
  const slug = STEP_SLUGS[step] ?? STEP_SLUGS[1];
  return `${stepBasePath(school, program)}/${slug}`;
}
