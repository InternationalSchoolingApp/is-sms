"use client";

/**
 * Relation-based Father / Mother / Guardian parent fields — port of the "Relation-based
 * Father/Mother/Guardian parent fields" block in signupStudentStage2.js and the
 * getStoredRelationData() family in signupStudentContent.js (is-rest-api).
 *
 * #parentFirstName / #parentlastName / #parentPhoneNumber always hold whichever person is
 * CURRENTLY selected as the Relation. For Father or Mother, a second, always-optional set of
 * "other parent" fields collects the OTHER parent; Guardian gets none.
 *
 * save-parent-details only stores ONE parent record (the selected relation) in the parent
 * response, so the other parent is kept in a client-side cache (localStorage, scoped to this
 * enrollment) to survive a refresh / a return to the step and to feed the review screen.
 */

const OTHER_PARENT_STORAGE_PREFIX = "is-sms:enrollment-other-parent:";

export const PARENT_RELATIONS = ["Father", "Mother", "Guardian"];

export function getOtherRelation(relation) {
  if (relation === "Father") return "Mother";
  if (relation === "Mother") return "Father";
  return "";
}

/** "Father's" / "Mother's" / "Guardian's", or "" when no relation is chosen yet. */
export function relationPossessive(relation) {
  return PARENT_RELATIONS.includes(relation) ? `${relation}'s` : "";
}

/** applyParentRelationLabels(): the primary row's labels follow the selected Relation. */
export function getPrimaryParentLabels(relation) {
  const owner = relationPossessive(relation);
  return {
    firstName: owner ? `${owner} First Name` : "First Name",
    lastName: owner ? `${owner} Last Name` : "Last Name",
    mobile: owner ? `${owner} Mobile Number` : "Parent Mobile Number",
  };
}

const EMPTY_PHONE = { contactNumber: "", countryCode: "US", countryIsdCode: "+1", phoneValid: undefined };

export function emptyParentBucket() {
  return { firstName: "", lastName: "", ...EMPTY_PHONE };
}

export function primaryBucketFromFields(fields) {
  return {
    firstName: fields.firstName || "",
    lastName: fields.lastName || "",
    contactNumber: fields.contactNumber || "",
    countryCode: fields.countryCode || "",
    countryIsdCode: fields.countryIsdCode || "",
    phoneValid: fields.phoneValid,
  };
}

export function otherBucketFromFields(fields) {
  return {
    firstName: fields.otherFirstName || "",
    lastName: fields.otherLastName || "",
    contactNumber: fields.otherContactNumber || "",
    countryCode: fields.otherCountryCode || "",
    countryIsdCode: fields.otherCountryIsdCode || "",
    phoneValid: fields.otherPhoneValid,
  };
}

/** Field values for the primary row from a bucket; an empty bucket defaults the phone country to US. */
export function primaryFieldsFromBucket(bucket) {
  const b = { ...emptyParentBucket(), ...bucket };
  return {
    firstName: b.firstName || "",
    lastName: b.lastName || "",
    contactNumber: b.contactNumber || "",
    countryCode: b.countryCode || "US",
    countryIsdCode: b.countryIsdCode || "+1",
    phoneValid: b.phoneValid,
  };
}

export function otherFieldsFromBucket(bucket) {
  const b = { ...emptyParentBucket(), ...bucket };
  return {
    otherFirstName: b.firstName || "",
    otherLastName: b.lastName || "",
    otherContactNumber: b.contactNumber || "",
    otherCountryCode: b.countryCode || "US",
    otherCountryIsdCode: b.countryIsdCode || "+1",
    otherPhoneValid: b.phoneValid,
  };
}

function storageKey(schoolUUID, userId) {
  return `${OTHER_PARENT_STORAGE_PREFIX}${schoolUUID}:${userId}`;
}

/** getStoredRelationData(): { Father?: bucket, Mother?: bucket }. */
export function loadOtherParentCache(schoolUUID, userId) {
  if (typeof window === "undefined" || !schoolUUID || !userId) return {};
  try {
    const raw = window.localStorage.getItem(storageKey(schoolUUID, userId));
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
}

/** saveStoredRelationBucket(): only Father / Mother are ever cached. */
export function saveOtherParentBucket(schoolUUID, userId, relation, bucket) {
  if (typeof window === "undefined" || !schoolUUID || !userId) return;
  if (relation !== "Father" && relation !== "Mother") return;
  try {
    const all = loadOtherParentCache(schoolUUID, userId);
    all[relation] = bucket;
    window.localStorage.setItem(storageKey(schoolUUID, userId), JSON.stringify(all));
  } catch {
    // storage blocked (private mode) — the other parent just won't survive a refresh
  }
}

/** clearStoredRelationData(): a saved Guardian makes any cached Father / Mother data stale. */
export function clearOtherParentCache(schoolUUID, userId) {
  if (typeof window === "undefined" || !schoolUUID || !userId) return;
  try {
    window.localStorage.removeItem(storageKey(schoolUUID, userId));
  } catch {
    // no-op
  }
}

/**
 * initParentRelationDynamicFields(): for Father / Mother, fills the "other parent" fields with the
 * other relation's cached bucket (the saved parent record only ever holds the selected relation).
 * Other relations are returned untouched apart from empty other-parent defaults.
 */
export function seedOtherParentFields(fields, schoolUUID, userId) {
  const other = getOtherRelation(fields?.relation);
  const cached = other ? loadOtherParentCache(schoolUUID, userId)[other] : null;
  return { ...fields, ...otherFieldsFromBucket(cached || (other ? otherBucketFromFields(fields || {}) : null)) };
}
