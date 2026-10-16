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
  // The payment-response page opens in another tab (payment link / gateway return), which has no copy of this
  // tab's sessionStorage. Keep the latest roll number in localStorage too, read only by that page.
  try {
    window.localStorage.setItem(`${LAST_ROLL_NO_PREFIX}${schoolUUID}:${parentId}`, String(rollNo));
  } catch {
    // no-op
  }
}

const LAST_ROLL_NO_PREFIX = "is-sms:add-enrollment-last-roll-no:";

// Cross-tab (same browser) roll number of the child last worked on, for the payment-response page.
export function loadLastAddEnrollmentRollNo(schoolUUID, parentId) {
  if (typeof window === "undefined" || !schoolUUID || !parentId) return "";
  try {
    return window.localStorage.getItem(`${LAST_ROLL_NO_PREFIX}${schoolUUID}:${parentId}`) || "";
  } catch {
    return "";
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

// The child being enrolled (uniqueId), kept in sessionStorage so a refresh can ask "is this child already paid?"
// BEFORE enrollAnotherChild runs (which could otherwise reserve a brand-new child).
const CHILD_UNIQUE_ID_PREFIX = "is-sms:add-enrollment-child-unique-id:";

export function saveAddEnrollmentChildUniqueId(schoolUUID, parentId, childUniqueId) {
  if (typeof window === "undefined" || !schoolUUID || !parentId || !childUniqueId) return;
  try {
    window.sessionStorage.setItem(`${CHILD_UNIQUE_ID_PREFIX}${schoolUUID}:${parentId}`, String(childUniqueId));
  } catch {
    // no-op — storage can throw in private browsing / blocked storage
  }
}

export function loadAddEnrollmentChildUniqueId(schoolUUID, parentId) {
  if (typeof window === "undefined" || !schoolUUID || !parentId) return "";
  try {
    return window.sessionStorage.getItem(`${CHILD_UNIQUE_ID_PREFIX}${schoolUUID}:${parentId}`) || "";
  } catch {
    return "";
  }
}


// Called once the thank-you has been shown: that enrollment is finished, so the next entry into the wizard in this
// tab must not pick the finished child up again (a refresh of the thank-you page uses its own URL params).
export function clearAddEnrollmentChildState(schoolUUID, parentId) {
  if (typeof window === "undefined" || !schoolUUID || !parentId) return;
  try {
    window.sessionStorage.removeItem(`${CHILD_UNIQUE_ID_PREFIX}${schoolUUID}:${parentId}`);
    window.sessionStorage.removeItem(`${ROLL_NO_PREFIX}${schoolUUID}:${parentId}`);
  } catch {
    // no-op
  }
}
