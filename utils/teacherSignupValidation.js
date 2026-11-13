/**
 * Validation for the teacher registration forms, mirroring the legacy JSP wizard (signupTeacherContent.js /
 * main.js) and the checks the backend now enforces (SignupTeacherUtil#validateSignupTeacher). Dependency-free:
 * no DOM access, so it behaves the same on the client and in tests.
 */

import { getPasswordStrength, isValidEmail } from "@/utils/studentSignupValidation";
import { isNameKeyAllowed, sanitizeName } from "@/utils/nameInput";

// ---- account creation (landing page) ----

/** The sign-up form: e-mail twice, a password that passes the checklist (twice), and the terms box. */
export function validateTeacherAccountForm(fields) {
  const errors = {};

  if (!isValidEmail(fields.email)) {
    errors.email = "Email is either empty or invalid";
  }
  // An empty confirm field is flagged with no text; anything typed that differs shows the "re-enter" message.
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
    errors.confirmPassword =
      fields.confirmPassword && (!passwordStrength.matchesConfirm || !getPasswordStrength(fields.confirmPassword).isValid)
        ? "Please re-enter the same password"
        : "";
  }

  if (!fields.checkTerms) {
    errors.checkTerms = "Please accept terms and conditions";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ---- Step 1: personal details ----

// The backend rejects a longer name (SignupTeacherUtil#TEACHER_NAME_MAX_LENGTH); legacy had the same 40.
export const TEACHER_NAME_MAX_LENGTH = 40;
export const TEACHER_MIN_AGE = 18;
export const TEACHER_MAX_AGE = 99;

export const TEACHER_GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "DONOTWANTTOSPECIFY", label: "Do Not Want To Specify" },
];

const FIRST_NAME_TOO_LONG = `First Name cannot be more than ${TEACHER_NAME_MAX_LENGTH} characters.`;
const LAST_NAME_TOO_LONG = `Last Name cannot be more than ${TEACHER_NAME_MAX_LENGTH} characters.`;

// Spread onto a name input (same letters-and-spaces rule as the student forms, capped at 40 characters).
export function teacherNameFieldProps(setValue) {
  return {
    maxLength: TEACHER_NAME_MAX_LENGTH,
    onKeyDown: (e) => {
      if (!isNameKeyAllowed(e)) e.preventDefault();
    },
    // maxLength doesn't reliably cap browser autofill, so trim here as well.
    onChange: (e) => setValue(sanitizeName(e.target.value).slice(0, TEACHER_NAME_MAX_LENGTH)),
  };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Selectable DOB range: from today minus 99 years to today minus 18 years (the backend checks the same). */
export function getTeacherDobPickerBounds(today = new Date()) {
  const base = startOfDay(today);
  return {
    fromDate: new Date(base.getFullYear() - TEACHER_MAX_AGE, base.getMonth(), base.getDate()),
    toDate: new Date(base.getFullYear() - TEACHER_MIN_AGE, base.getMonth(), base.getDate()),
  };
}

/** An error message for a DOB the backend would refuse (not a date, under 18, over 99), or null. */
export function validateTeacherDob(dob, today = new Date()) {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return "Date of birth is required";
  const { fromDate, toDate } = getTeacherDobPickerBounds(today);
  const day = startOfDay(dob);
  if (day > toDate) return `You must be at least ${TEACHER_MIN_AGE} years old`;
  if (day < fromDate) return "Please enter a valid date of birth";
  return null;
}

/** "yyyy-MM-dd" (what get-teacher-basic-details returns) -> a local-midnight Date, or null. Never new Date(string). */
export function parseTeacherDob(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? "").trim());
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** The wire format of save-basic-details: "MM-dd-yyyy". */
export function formatTeacherDobForRequest(dob) {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return "";
  const mm = String(dob.getMonth() + 1).padStart(2, "0");
  const dd = String(dob.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${dob.getFullYear()}`;
}

/** Step 1 form validation; `errors` is keyed by field name. The e-mail is read-only (it is the account's). */
export function validateTeacherPersonalDetails(fields) {
  const errors = {};

  if (!fields.firstName?.trim()) errors.firstName = "First name is required";
  else if (fields.firstName.trim().length > TEACHER_NAME_MAX_LENGTH) errors.firstName = FIRST_NAME_TOO_LONG;
  if (!fields.lastName?.trim()) errors.lastName = "Last name is required";
  else if (fields.lastName.trim().length > TEACHER_NAME_MAX_LENGTH) errors.lastName = LAST_NAME_TOO_LONG;

  const dobError = validateTeacherDob(fields.dob);
  if (dobError) errors.dob = dobError;

  if (!fields.gender) errors.gender = "Gender is required";
  if (!fields.countryId) errors.countryId = "Country is required";
  if (!fields.stateId) errors.stateId = "State is required";
  if (!fields.cityId) errors.cityId = "City is required";
  if (!fields.contactNumber || fields.phoneValid === false) {
    errors.contactNumber = "A valid mobile number is required";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
