"use client";

const STORAGE_PREFIX = "is-sms:enrollment-student-fields:";

function storageKey(schoolUUID, userId) {
  return `${STORAGE_PREFIX}${schoolUUID}:${userId}`;
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
      storageKey(schoolUUID, userId),
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
  if (typeof window === "undefined" || !schoolUUID || !userId) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(schoolUUID, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.dob) parsed.dob = new Date(parsed.dob);
    return parsed;
  } catch {
    return null;
  }
}
