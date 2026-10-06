/**
 * Validation rules replicated from the existing JSP/jQuery frontend —
 * confirmed by reading signupCommon.js and jquery.commonFunction.js
 * directly, not guessed. Keep this file dependency-free (no jQuery, no
 * DOM access) so it works the same in both client and server contexts.
 */

const EMAIL_REGEX = /^([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+\.([A-Za-z]{2,4})$/;
const SPECIAL_CHAR_REGEX = /[!@#$%&*]/;
const LOWERCASE_REGEX = /[a-z]/;
const UPPERCASE_REGEX = /[A-Z]/;
const DIGIT_REGEX = /\d/;
const CAPTCHA_REGEX = /^[0-9]{6}$/;

export function isValidEmail(value) {
  return EMAIL_REGEX.test((value ?? "").trim());
}

/**
 * Mirrors hasSequentialChars() from jquery.commonFunction.js:6319 — flags any
 * 3–5 char run that's alphabetically or numerically sequential, forward or
 * reversed (catches "abc", "cba", "123", "321", etc.).
 */
export function hasSequentialChars(password) {
  const value = (password || "").toLowerCase();
  const alphabets = "abcdefghijklmnopqrstuvwxyz";
  const reverseAlphabets = [...alphabets].reverse().join("");
  const numbers = "0123456789";
  const reverseNumbers = [...numbers].reverse().join("");

  for (let i = 0; i < value.length - 2; i++) {
    for (let size = 3; size <= 5; size++) {
      if (i + size > value.length) continue;
      const part = value.substring(i, i + size);
      if (
        alphabets.includes(part) ||
        reverseAlphabets.includes(part) ||
        numbers.includes(part) ||
        reverseNumbers.includes(part)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Mirrors checkPasswordStrength()'s rule set (jquery.commonFunction.js:6475).
 * Returns the per-rule pass/fail state so a live checklist UI can render it,
 * plus an overall `isValid`.
 */
export function getPasswordStrength(password, confirmPassword) {
  const value = password || "";
  const rules = {
    case: LOWERCASE_REGEX.test(value) && UPPERCASE_REGEX.test(value),
    digitAndSpecial: DIGIT_REGEX.test(value) && SPECIAL_CHAR_REGEX.test(value),
    length: value.length >= 8 && value.length <= 20,
    noSequence: !hasSequentialChars(value),
  };
  const matchesConfirm = confirmPassword === undefined ? true : value === confirmPassword;

  return {
    ...rules,
    matchesConfirm,
    isValid: rules.case && rules.digitAndSpecial && rules.length && rules.noSequence && matchesConfirm,
  };
}

export function isValidCaptcha(value) {
  return CAPTCHA_REGEX.test((value ?? "").trim());
}

/**
 * Full account-creation ("stage-1", Online mode) form validation, mirroring
 * validateRequestForSignup() in signupCommon.js. Returns { valid, errors }
 * where errors is keyed by field id, matching the existing *-error-message
 * element ids so error copy can stay consistent.
 */
export function validateAccountFormOnline(fields) {
  const errors = {};

  if (!isValidEmail(fields.email)) {
    errors.email = "Email is either empty or invalid";
  }

  // Messages match the legacy SignupCommon.jsp flow: an empty confirm field shows no text (only the
  // field is flagged), anything typed that is invalid or different shows the "re-enter" message.
  if (!isValidEmail(fields.confirmEmail)) {
    errors.confirmEmail = fields.confirmEmail ? "Please re-enter the same email" : "";
  } else if (fields.email.trim() !== fields.confirmEmail.trim()) {
    errors.confirmEmail = "Please re-enter the same email";
  }

  const passwordStrength = getPasswordStrength(fields.password, fields.confirmPassword);
  if (!getPasswordStrength(fields.password).isValid) {
    errors.password = "Please enter a valid password";
  }
  if (!passwordStrength.isValid) {
    // Empty confirm password: flagged but no text. Otherwise invalid-or-different -> the legacy message.
    errors.confirmPassword =
      fields.confirmPassword && (!passwordStrength.matchesConfirm || !getPasswordStrength(fields.confirmPassword).isValid)
        ? "Please re-enter the same password"
        : "";
  }

  if (!isValidCaptcha(fields.captcha)) {
    errors.captcha = "Please enter captcha";
  }

  if (!fields.checkTerms) {
    errors.checkTerms = "Please accept terms and conditions";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Stage 1 ("Student Details") form validation, mirroring
 * highlightRequiredStudentFields() in signupStudentStage1.js — nationality /
 * communicationEmail / contactNumber are only required when the learning
 * program is NOT Dual Diploma; studyingSchoolName / studyingGradeId /
 * countryIdOfSchool only when it IS. DOB's own age-range check lives in
 * ageValidation.js (validateAge) since it needs courseProviderId context.
 */
export function validateStudentDetails(fields, { isDualDiploma = false } = {}) {
  const errors = {};

  if (!fields.firstName?.trim()) errors.firstName = "First name is required";
  if (!fields.lastName?.trim()) errors.lastName = "Last name is required";
  if (!fields.dob) errors.dob = "Date of birth is required";
  if (!fields.gender) errors.gender = "Gender is required";
  if (!fields.standardId) errors.standardId = "Grade is required";
  if (!fields.countryId) errors.countryId = "Country is required";
  if (!fields.stateId) errors.stateId = "State is required";
  if (!fields.cityId) errors.cityId = "City is required";

  if (isDualDiploma) {
    if (!fields.studyingSchoolName?.trim()) errors.studyingSchoolName = "Current school name is required";
    if (!fields.studyingGradeId) errors.studyingGradeId = "Current grade is required";
    if (!fields.countryIdOfSchool) errors.countryIdOfSchool = "Country of current school is required";
  } else {
    if (!fields.nationality) errors.nationality = "Nationality is required";
    if (!isValidEmail(fields.communicationEmail)) errors.communicationEmail = "Email is either empty or invalid";
    if (!fields.contactNumber || fields.phoneValid === false) {
      errors.contactNumber = "A valid mobile number is required";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Stage 2 ("Parent Details") form validation, mirroring
 * validateRequestForSignupParent() in signupStudentStage2.js. For
 * ONE_TO_ONE_FLEX, only workingProfession/institutionName/institutionCountryId
 * are required (the normal parent-relationship fields don't even render) —
 * confirmed at SignupStudentUtil.java:2478. Parent email and phone are both
 * optional (labeled "(Optional)" on the live is-rest-api form too) — no OTP
 * verification gate before submit (skipParent="Y" path — see
 * hooks/useParentDetailsSignup.js).
 */
// "How to Contact You?" is asked on every variant of the parent step (validateRequestForSignupParent()).
const CONTACT_PREFERENCE_MESSAGE = "How would you like us to contact you? Please select atleast one";

function hasContactPreference(fields) {
  return Boolean(fields.communicationWhatsApp || fields.communicationCall || fields.communicationEmail);
}

export function validateParentDetails(fields, { isOneToOneFlex = false } = {}) {
  const errors = {};

  if (isOneToOneFlex) {
    if (!fields.workingProfession) errors.workingProfession = "This field is required";
    if (!fields.institutionName?.trim()) errors.institutionName = "Name of the School/College/Organization is required";
    if (!fields.institutionCountryId) errors.institutionCountryId = "Country of the School/College/Organization is required";
    if (!hasContactPreference(fields)) errors.communication = CONTACT_PREFERENCE_MESSAGE;
    return { valid: Object.keys(errors).length === 0, errors };
  }

  if (!fields.firstName?.trim()) errors.firstName = "First name is required";
  if (!fields.lastName?.trim()) errors.lastName = "Last name is required";
  if (!fields.relation) errors.relation = " Relationship to Student is required";
  // The (selected relation's) mobile number is mandatory.
  if (!fields.contactNumber) {
    errors.contactNumber = "Mobile Number is required";
  } else if (fields.phoneValid === false) {
    errors.contactNumber = "Please enter a valid phone number";
  }
  // Father / Mother also show an optional "other parent" mobile number: empty is fine, a
  // typed one must still be a valid number.
  if (fields.otherContactNumber && fields.otherPhoneValid === false) {
    errors.otherContactNumber = "Please enter a valid phone number";
  }
  if (!fields.countryId) errors.countryId = "Country is required";
  if (!fields.stateId) errors.stateId = "State is required";
  if (!fields.cityId) errors.cityId = "City is required";
  if (!hasContactPreference(fields)) errors.communication = CONTACT_PREFERENCE_MESSAGE;

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Offline/B2B mode only needs a learning-program selection — matches the
 * `signupType == 'Offline'` branch in callForUserSignUp(), which skips
 * email/password entirely.
 */
export function validateAccountFormOfflineB2B(fields) {
  const errors = {};
  if (!fields.learningProgram) {
    errors.learningProgram = "Please select the learning program";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

// Legacy getCourseSelectionContent() hides credit counts for these standardIds.
const CREDITLESS_STANDARD_IDS = [1, 2, 3, 11, 12, 13, 14, 15, 16, 17];

export function hidesCourseCredits(standardId) {
  return CREDITLESS_STANDARD_IDS.includes(Number(standardId));
}

/**
 * Stage 3 credit check before moving on, mirroring
 * validateRequestForPaymentModeSelection() in signupStudentStage3.js,
 * including its skip for standardIds 8 and 11-17. The backend never
 * rejects out-of-range credits on get-payment-details/choose-payment-plan,
 * so this is the only gate. Returns an error message, or null when valid.
 */
export function validateCourseCredits(courseData) {
  const standardId = Number(courseData?.standardId);
  if ((standardId >= 11 && standardId <= 17) || standardId === 8) return null;
  const total = Number(courseData?.totalCredit) || 0;
  const min = Number(courseData?.minCourseLimit) || 0;
  const upperBand = Number(courseData?.upperBandLimit) || 0;
  if (total < min) return `Please select a minimum of ${min} credits.`;
  if (upperBand > 0 && total > upperBand) return `You can select a maximum of ${upperBand} credits.`;
  return null;
}

/**
 * Check before adding one more course, mirroring assignEvent() in
 * signupStudentStage3.js: at or past the upper band the add is blocked;
 * at or past the max limit the course is allowed but costs extra, so the
 * student has to confirm.
 */
export function getCourseAddCheck(courseData) {
  const total = Number(courseData?.totalCredit) || 0;
  const maxLimit = Number(courseData?.maxCourseLimit) || 0;
  const upperBand = Number(courseData?.upperBandLimit) || 0;
  if (upperBand > 0 && total >= upperBand) {
    return { blockedMessage: `You can select a maximum of ${upperBand} credits.`, extraFee: false };
  }
  return { blockedMessage: null, extraFee: maxLimit > 0 && total >= maxLimit };
}

// paymentMode values the backend recognises (SeriConstant.java). Anything
// else is stored as-is by choose-payment-plan, since it doesn't validate.
const PAYMENT_MODES = [
  "a_partially",
  "a_installment",
  "a_annually",
  "c_installment",
  "c_annually",
  "annually",
  "twoMonthly",
  "threeMonthly",
  "fourMonthly",
  "fiveMonthly",
  "sixMonthly",
  "nineMonthly",
  "tenMonthly",
  "twelveMonthly",
  "registration",
];

export function isKnownPaymentMode(mode) {
  return PAYMENT_MODES.includes(mode);
}
