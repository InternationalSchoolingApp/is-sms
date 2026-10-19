// Hand-off from the thank-you page's "Create password" button to the create-password page. Kept in sessionStorage
// (not the URL) so the student's name / email never travel in a link; survives a refresh of the new page.
const KEY = "addEnrollmentCreatePassword";

export function saveCreatePasswordTarget(target) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(target));
  } catch {
    /* storage unavailable */
  }
}

// Parsed object is cached per raw string so useSyncExternalStore sees a stable snapshot.
let cache = { raw: undefined, value: null };

export function loadCreatePasswordTarget() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw !== cache.raw) {
      const parsed = raw ? JSON.parse(raw) : null;
      cache = { raw, value: parsed?.userId ? parsed : null };
    }
    return cache.value;
  } catch {
    return null;
  }
}

export function createPasswordPath(schoolUUID) {
  return `/${schoolUUID}/add-enrollment/create-password`;
}
