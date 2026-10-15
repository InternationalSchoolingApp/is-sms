"use client";

// Distinct key prefix from utils/wizardStorage.js so a parent's own
// enrollment draft (if they're also mid-enrollment themselves) never
// collides with a draft saved here for the child they're adding. Keyed by
// the ENROLLED CHILD's userId (from enrollAnotherChild's response), not the
// caller's sessionUserId — the caller may be the parent or a sibling
// student, but the saved fields always belong to the child record.
const STUDENT_STORAGE_PREFIX = "is-sms:add-enrollment-student-fields:";

function storageKey(schoolUUID, childUserId) {
  return `${STUDENT_STORAGE_PREFIX}${schoolUUID}:${childUserId}`;
}

export function saveAddEnrollmentStudentFields(schoolUUID, childUserId, studentFields) {
  if (typeof window === "undefined" || !schoolUUID || !childUserId) return;
  try {
    window.sessionStorage.setItem(
      storageKey(schoolUUID, childUserId),
      JSON.stringify({
        ...studentFields,
        dob: studentFields?.dob instanceof Date ? studentFields.dob.toISOString() : studentFields?.dob,
      })
    );
  } catch {
    // no-op — storage can throw in private browsing / blocked storage; progress just won't survive a refresh
  }
}

export function loadAddEnrollmentStudentFields(schoolUUID, childUserId) {
  if (typeof window === "undefined" || !schoolUUID || !childUserId) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(schoolUUID, childUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.dob) parsed.dob = new Date(parsed.dob);
    return parsed;
  } catch {
    return null;
  }
}

// The roll number enrollAnotherChild() last returned for this parent, so the next call (refresh / re-entry)
// can send it back in the payload. sessionStorage only — it just identifies the child already being enrolled.
const ROLL_NO_PREFIX = "is-sms:add-enrollment-roll-no:";

export function saveAddEnrollmentRollNo(schoolUUID, parentId, rollNo) {
  if (typeof window === "undefined" || !schoolUUID || !parentId || !rollNo) return;
  try {
    window.sessionStorage.setItem(`${ROLL_NO_PREFIX}${schoolUUID}:${parentId}`, String(rollNo));
  } catch {
    // no-op — storage can throw in private browsing / blocked storage
  }
}

export function loadAddEnrollmentRollNo(schoolUUID, parentId) {
  if (typeof window === "undefined" || !schoolUUID || !parentId) return "";
  try {
    return window.sessionStorage.getItem(`${ROLL_NO_PREFIX}${schoolUUID}:${parentId}`) || "";
  } catch {
    return "";
  }
}
