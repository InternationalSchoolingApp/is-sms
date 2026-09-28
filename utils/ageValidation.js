/**
 * DOB / age-limit logic, replicating callForSignupStudentDetails() and
 * dobInitalize() in signupStudentStage1.js.
 *
 * KNOWN GAP: the legacy app uses MAX_AGE_LIMIT = 60 when courseProviderId
 * == 39, else 30 — courseProviderId isn't resolved anywhere in this app yet
 * (not returned by getPublicSchoolInfo or any endpoint wired so far), so
 * every caller here defaults to 30. Pass courseProviderId through once a
 * source for it is confirmed (likely Stage 3's course/provider selection).
 */
const DEFAULT_MAX_AGE = 30;
const EXTENDED_MAX_AGE = 60; // courseProviderId === 39
const MIN_AGE = 2; // matches dobInitalize()'s endDate = today - 2 years

export function getMaxAgeLimit(courseProviderId) {
  return courseProviderId === 39 ? EXTENDED_MAX_AGE : DEFAULT_MAX_AGE;
}

/**
 * Selectable range for the DOB date picker — matches dobInitalize():
 * endDate = today - 2 years, startDate = today - maxAge years.
 */
export function getDobPickerBounds(courseProviderId) {
  const today = new Date();
  const maxAge = getMaxAgeLimit(courseProviderId);
  return {
    toDate: new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate()),
    fromDate: new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate()),
  };
}

export function computeAge(dob) {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Mirrors the age check in callForSignupStudentDetails() — returns an error
 * message string, or null when valid.
 */
export function validateAge(dob, courseProviderId) {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return "Date of birth is required";
  const age = computeAge(dob);
  const maxAge = getMaxAgeLimit(courseProviderId);
  if (age < MIN_AGE) return `Student must be at least ${MIN_AGE} years old`;
  if (age > maxAge) return `Age of student should not be more than ${maxAge} years`;
  return null;
}

/** Wire format confirmed at SignupStudentUtil.java's SignupStudentDTO — "mm-dd-yyyy". */
export function formatDobForRequest(dob) {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return "";
  const mm = String(dob.getMonth() + 1).padStart(2, "0");
  const dd = String(dob.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${dob.getFullYear()}`;
}
