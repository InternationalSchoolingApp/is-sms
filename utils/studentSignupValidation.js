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

export function isPureAscii(value) {
  // Mirrors commonUtil.isPureAscii() / validateFormAscii() — blocks
  // non-English-keyboard input across the signup form.
  return /^[\x00-\x7F]*$/.test(value ?? "");
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

  const asciiFields = [fields.email, fields.confirmEmail, fields.password, fields.confirmPassword];
  if (asciiFields.some((v) => !isPureAscii(v))) {
    errors.form = "Please use the English keyboard while providing information";
  }

  if (!isValidEmail(fields.email)) {
    errors.email = "Email is either empty or invalid";
  }

  if (!isValidEmail(fields.confirmEmail)) {
    errors.confirmEmail = fields.confirmEmail ? "Email and confirm email should be same" : "";
  } else if (fields.email.trim() !== fields.confirmEmail.trim()) {
    errors.confirmEmail = "Email and confirm email are not same";
  }

  const passwordStrength = getPasswordStrength(fields.password, fields.confirmPassword);
  if (!passwordStrength.isValid) {
    errors.password = "Password is either empty or invalid";
    if (!passwordStrength.matchesConfirm && fields.confirmPassword) {
      errors.confirmPassword = "Create your password and Confirm your password do not match";
    }
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
      errors.contactNumber = "A valid phone number is required";
    }
  }

  const asciiFields = [fields.firstName, fields.middleName, fields.lastName, fields.studyingSchoolName];
  if (asciiFields.some((v) => v && !isPureAscii(v))) {
    errors.form = "Please use the English keyboard while providing information";
  }

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
