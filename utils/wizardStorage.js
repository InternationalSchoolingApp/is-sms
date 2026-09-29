"use client";

const STUDENT_STORAGE_PREFIX = "is-sms:enrollment-student-fields:";
const PARENT_STORAGE_PREFIX = "is-sms:enrollment-parent-fields:";

function storageKey(prefix, schoolUUID, userId) {
  return `${prefix}${schoolUUID}:${userId}`;
}

/**
 * Client-only, per-browser-tab persistence for Stage 1's completed fields —
 * carries them across the /step/1 -> /step/2 -> /step/3 route navigation (so
 * Stage 2's "same as student address" default and Stage 2's Back button
 * both have real data) and survives a page refresh.
 *
 * This is a stopgap, not real stage-resume — that's Step 10 of the
 * migration plan (enrollment-stage-status polling against the backend,
 * survives logout/another device). sessionStorage only survives this
 * browser tab; wrapped in try/catch since it can throw in private
 * browsing / blocked storage, in which case progress just won't survive a
 * refresh rather than breaking the page.
 */
export function saveWizardStudentFields(schoolUUID, userId, studentFields) {
  if (typeof window === "undefined" || !schoolUUID || !userId) return;
  try {
    window.sessionStorage.setItem(
      storageKey(STUDENT_STORAGE_PREFIX, schoolUUID, userId),
      JSON.stringify({
        ...studentFields,
        dob: studentFields?.dob instanceof Date ? studentFields.dob.toISOString() : studentFields?.dob,
      })
    );
  } catch {
    // no-op — see doc comment above
  }
}

export function loadWizardStudentFields(schoolUUID, userId) {
  debugger
  if (typeof window === "undefined" || !schoolUUID || !userId) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(STUDENT_STORAGE_PREFIX, schoolUUID, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.dob) parsed.dob = new Date(parsed.dob);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Same stopgap persistence as above, for Stage 2's fields — so navigating
 * /step/2 -> /step/3 and then Back re-fills the parent form instead of
 * resetting it, the same pattern Stage 1 already gets from
 * save/loadWizardStudentFields.
 */
export function saveWizardParentFields(schoolUUID, userId, parentFields) {
  if (typeof window === "undefined" || !schoolUUID || !userId) return;
  try {
    window.sessionStorage.setItem(
      storageKey(PARENT_STORAGE_PREFIX, schoolUUID, userId),
      JSON.stringify(parentFields)
    );
  } catch {
    // no-op — see doc comment above
  }
}

export function loadWizardParentFields(schoolUUID, userId) {
  if (typeof window === "undefined" || !schoolUUID || !userId) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(PARENT_STORAGE_PREFIX, schoolUUID, userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
