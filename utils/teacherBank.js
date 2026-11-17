/**
 * Step 6 of the teacher registration ("Account Details" / "Bank Details"): the form's fields, rules, prefill mapping and
 * request. Mirrors the legacy JSP wizard (signupTeacherContent.js getTeacherBankDetailsContent, signupTeacherStage6.js) and
 * the backend (TeacherBankRules). Dependency-free apart from the currency list (relative import, no "@/" aliases), so it
 * behaves the same in the browser and in tests (scripts/verifyTeacherBank.mjs).
 */
import { TEACHER_BANK_CURRENCY_CODES } from "./teacherBankCurrencies.js";

export { TEACHER_BANK_CURRENCY_CODES };

/** The legacy "Account Type" choices (the backend stores the choice as the account category). */
export const TEACHER_BANK_ACCOUNT_CATEGORIES = ["Savings", "Checking", "Current"];

/** The only account type of this wizard (the legacy screen never offered another). */
export const TEACHER_BANK_ACCOUNT_TYPE = "BANK_ACCOUNT";

export const MAX_PERSON_NAME_LENGTH = 50;
export const MAX_ADDRESS_LENGTH = 100;
export const MAX_BANK_NAME_LENGTH = 50;
export const MAX_BRANCH_NAME_LENGTH = 100;
export const MAX_POSTAL_LENGTH = 20;
export const MAX_CODE_LENGTH = 50;
export const MAX_ACCOUNT_NUMBER_LENGTH = 50;
export const MAX_OTHER_DETAILS_LENGTH = 255;
export const MAX_PHONE_LENGTH = 20;
export const MIN_PHONE_LENGTH = 5;

export const INITIAL_BANK_FIELDS = {
  accountCurrency: "",
  accountNumber: "",
  iban: "",
  accountCategory: "",
  holderFirstName: "",
  holderMiddleName: "",
  holderLastName: "",
  holderAddress: "",
  holderCountryId: "",
  holderStateId: "",
  holderCityId: "",
  holderPostal: "",
  holderPhone: "",
  holderEmail: "",
  bankName: "",
  branchName: "",
  branchAddress: "",
  bankCountryId: "",
  bankStateId: "",
  bankCityId: "",
  bankPostal: "",
  swiftCode: "",
  ifscCode: "",
  routeNumber: "",
  otherDetails: "",
};

// ---- what the keys keep while typing (also on paste) ----

/** A person's name: letters and spaces only (the legacy page's key filter). */
export function sanitizePersonName(value) {
  return String(value ?? "")
    .replace(/[^\p{L} ]/gu, "")
    .slice(0, MAX_PERSON_NAME_LENGTH);
}

/** The optional codes (SWIFT, IFSC, IBAN, routing number): letters and digits only (the legacy key filter), 50 at most. */
export function sanitizeAlphanumeric(value) {
  return String(value ?? "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, MAX_CODE_LENGTH);
}

/** The holder's phone: digits only (as in legacy: no country code). */
export function sanitizeDigits(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, MAX_PHONE_LENGTH);
}

// ---- rules ----

const ACCOUNT_NUMBER = /^[A-Za-z0-9][A-Za-z0-9 \-./]*$/;
const PERSON_NAME = /^[\p{L} ]+$/u;
const PLACE_NAME = /^[\p{L}\p{N} &.,'()/-]+$/u;
const POSTAL = /^[A-Za-z0-9][A-Za-z0-9 -]*$/;
// The backend's own e-mail rule (ValidatorUtil.EMAIL).
const EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const trimmed = (value) => String(value ?? "").trim();
const plain = (value) => !/[<>]/.test(value);

/** An account number or IBAN that is a masked read-back ("****1234") and not something the teacher typed. */
export function isMaskedValue(value) {
  return trimmed(value).startsWith("*");
}

/**
 * The whole form checked, with the legacy wording ("... can't be blank.", "Please choose ...", "Invalid Email.") and the
 * checks the legacy page never made (a real e-mail, phone, number and codes, lengths, no markup). `errors` is keyed by field
 * name; `valid` is true when there is none.
 */
export function validateBankDetails(fields) {
  const errors = {};
  const f = Object.fromEntries(Object.keys(INITIAL_BANK_FIELDS).map((key) => [key, trimmed(fields[key])]));

  if (!TEACHER_BANK_CURRENCY_CODES.includes(f.accountCurrency)) errors.accountCurrency = "Please choose account currency.";

  if (!f.accountNumber) errors.accountNumber = "Account number can't be blank.";
  else if (isMaskedValue(f.accountNumber)) errors.accountNumber = "Please enter your full account number.";
  else if (f.accountNumber.length > MAX_ACCOUNT_NUMBER_LENGTH || !ACCOUNT_NUMBER.test(f.accountNumber)) {
    errors.accountNumber = "Please enter a valid account number.";
  }

  if (f.iban) {
    if (isMaskedValue(f.iban)) errors.iban = "Please enter your full IBAN.";
    else if (f.iban.length > MAX_CODE_LENGTH || !/^[A-Za-z0-9]+$/.test(f.iban)) errors.iban = "Please enter a valid IBAN.";
  }

  if (!TEACHER_BANK_ACCOUNT_CATEGORIES.includes(f.accountCategory)) errors.accountCategory = "Please choose account type.";

  if (!f.holderFirstName) errors.holderFirstName = "Account holder first name can't be blank.";
  else if (!PERSON_NAME.test(f.holderFirstName) || f.holderFirstName.length > MAX_PERSON_NAME_LENGTH) {
    errors.holderFirstName = "Please enter a valid account holder first name.";
  }
  if (f.holderMiddleName && (!PERSON_NAME.test(f.holderMiddleName) || f.holderMiddleName.length > MAX_PERSON_NAME_LENGTH)) {
    errors.holderMiddleName = "Please enter a valid account holder middle name.";
  }
  if (!f.holderLastName) errors.holderLastName = "Account holder last name can't be blank.";
  else if (!PERSON_NAME.test(f.holderLastName) || f.holderLastName.length > MAX_PERSON_NAME_LENGTH) {
    errors.holderLastName = "Please enter a valid account holder last name.";
  }

  if (!f.holderAddress) errors.holderAddress = "Account holder address can't be blank.";
  else if (f.holderAddress.length > MAX_ADDRESS_LENGTH || !plain(f.holderAddress)) errors.holderAddress = "Please enter a valid account holder address.";

  if (!f.holderCountryId) errors.holderCountryId = "Please choose account holder country.";
  if (!f.holderStateId) errors.holderStateId = "Please choose account holder state.";
  if (!f.holderCityId) errors.holderCityId = "Please choose account holder city.";

  if (!f.holderPostal) errors.holderPostal = "Account holder postal code can't be blank.";
  else if (f.holderPostal.length > MAX_POSTAL_LENGTH || !POSTAL.test(f.holderPostal)) errors.holderPostal = "Please enter a valid account holder postal code.";

  if (!f.holderPhone) errors.holderPhone = "Account holder phone number can't be blank.";
  else if (!/^\d+$/.test(f.holderPhone) || f.holderPhone.length < MIN_PHONE_LENGTH || f.holderPhone.length > MAX_PHONE_LENGTH) {
    errors.holderPhone = "Please enter a valid account holder phone number.";
  }

  if (f.holderEmail.length > 100 || !EMAIL.test(f.holderEmail)) errors.holderEmail = "Invalid Email.";

  if (!f.bankName) errors.bankName = "Bank name can't be blank.";
  else if (f.bankName.length > MAX_BANK_NAME_LENGTH || !PLACE_NAME.test(f.bankName)) errors.bankName = "Please enter a valid bank name.";

  if (!f.branchName) errors.branchName = "Bank branch name can't be blank.";
  else if (f.branchName.length > MAX_BRANCH_NAME_LENGTH || !PLACE_NAME.test(f.branchName)) errors.branchName = "Please enter a valid bank branch name.";

  if (!f.branchAddress) errors.branchAddress = "Bank branch address can't be blank.";
  else if (f.branchAddress.length > MAX_ADDRESS_LENGTH || !plain(f.branchAddress)) errors.branchAddress = "Please enter a valid bank branch address.";

  if (!f.bankCountryId) errors.bankCountryId = "Please choose bank country.";
  if (!f.bankStateId) errors.bankStateId = "Please choose bank state.";
  if (!f.bankCityId) errors.bankCityId = "Please choose bank city.";

  if (!f.bankPostal) errors.bankPostal = "Bank postal code can't be blank.";
  else if (f.bankPostal.length > MAX_POSTAL_LENGTH || !POSTAL.test(f.bankPostal)) errors.bankPostal = "Please enter a valid bank postal code.";

  [
    ["swiftCode", "bank swift code"],
    ["ifscCode", "bank IFSC code"],
    ["routeNumber", "IBAN/routing number"],
  ].forEach(([key, label]) => {
    if (f[key] && (f[key].length > MAX_CODE_LENGTH || !/^[A-Za-z0-9]+$/.test(f[key]))) errors[key] = `Please enter a valid ${label}.`;
  });
  if (f.otherDetails.length > MAX_OTHER_DETAILS_LENGTH || !plain(f.otherDetails)) errors.otherDetails = "Please enter valid other details.";

  return { valid: Object.keys(errors).length === 0, errors };
}

// The legacy page's order, for "the first thing to tell the teacher".
const ERROR_ORDER = [
  "accountCurrency",
  "accountNumber",
  "iban",
  "accountCategory",
  "holderFirstName",
  "holderMiddleName",
  "holderLastName",
  "holderAddress",
  "holderCountryId",
  "holderStateId",
  "holderCityId",
  "holderPostal",
  "holderPhone",
  "holderEmail",
  "bankName",
  "branchName",
  "branchAddress",
  "bankCountryId",
  "bankStateId",
  "bankCityId",
  "bankPostal",
  "swiftCode",
  "ifscCode",
  "routeNumber",
  "otherDetails",
];

/** The message of the first failing field in the legacy order ("" when there is none). */
export function firstBankError(errors) {
  const key = ERROR_ORDER.find((name) => errors[name]);
  return key ? errors[key] : "";
}

/** The name of the first failing field in the legacy order, to bring it into view ("" when there is none). */
export function firstBankErrorField(errors) {
  return ERROR_ORDER.find((name) => errors[name]) || "";
}

/**
 * The save-teacher-bank-details request: { data } with the legacy field names. `source` tells the backend this is the
 * Next.js wizard, whose request it checks as a whole before writing anything. Values are trimmed and sent as typed (no case
 * changes: the legacy page title-cased names and addresses, so "ICICI" became "Icici"). No proof document and no
 * attachments: the legacy screen never asked for one.
 */
export function buildSaveBankRequest({ fields, userId }) {
  const t = (key) => trimmed(fields[key]);
  const id = (key) => Number(fields[key]) || 0;
  return {
    data: {
      userId,
      source: "NEXTJS",
      accountType: TEACHER_BANK_ACCOUNT_TYPE,
      accountCurrency: t("accountCurrency"),
      accountNumber: t("accountNumber"),
      iban: t("iban"),
      accountCategory: t("accountCategory"),
      accountHolderFirstName: t("holderFirstName"),
      accountHolderMiddleName: t("holderMiddleName"),
      accountHolderLastName: t("holderLastName"),
      accountHolderAddress: t("holderAddress"),
      accountHolderCountryId: id("holderCountryId"),
      accountHolderStateId: id("holderStateId"),
      accountHolderCityId: id("holderCityId"),
      accountHolderPostal: t("holderPostal"),
      accountHolderPhone: t("holderPhone"),
      accountHolderEmail: t("holderEmail"),
      bankName: t("bankName"),
      bankBranchName: t("branchName"),
      bankBranchAddress: t("branchAddress"),
      bankCountryId: id("bankCountryId"),
      bankStateId: id("bankStateId"),
      bankCityId: id("bankCityId"),
      bankPostal: t("bankPostal"),
      swiftCode: t("swiftCode"),
      bankIfsc: t("ifscCode"),
      routeNumber: t("routeNumber"),
      otherDetails: t("otherDetails"),
    },
  };
}

/**
 * get-teacher-bank-details -> { fields, masked: { accountNumber, iban } }, or null when the answer is not a success. The
 * backend hides the account number and the IBAN ("****1234"): they are NOT put in the form (a masked value saved back would
 * overwrite the real one), only offered as a hint, and the teacher types them again. Nothing saved is the empty form.
 */
export function mapBankDetails(response) {
  if (!response || String(response.status) !== "1") return null;
  const data = response.data;
  if (!data || data.hasBankDetails !== true) return { fields: { ...INITIAL_BANK_FIELDS }, masked: { accountNumber: "", iban: "" } };
  const text = (value) => String(value ?? "");
  const id = (value) => (Number(value) > 0 ? String(value) : "");
  const currency = text(data.accountCurrency);
  const category = text(data.accountCategory);
  return {
    fields: {
      ...INITIAL_BANK_FIELDS,
      accountCurrency: TEACHER_BANK_CURRENCY_CODES.includes(currency) ? currency : "",
      accountCategory: TEACHER_BANK_ACCOUNT_CATEGORIES.includes(category) ? category : "",
      holderFirstName: text(data.accountHolderFirstName),
      holderMiddleName: text(data.accountHolderMiddleName),
      holderLastName: text(data.accountHolderLastName),
      holderAddress: text(data.accountHolderAddress),
      holderCountryId: id(data.accountHolderCountryId),
      holderStateId: id(data.accountHolderStateId),
      holderCityId: id(data.accountHolderCityId),
      holderPostal: text(data.accountHolderPostal),
      holderPhone: text(data.accountHolderPhone),
      holderEmail: text(data.accountHolderEmail),
      bankName: text(data.bankName),
      branchName: text(data.bankBranchName),
      branchAddress: text(data.bankBranchAddress),
      bankCountryId: id(data.bankCountryId),
      bankStateId: id(data.bankStateId),
      bankCityId: id(data.bankCityId),
      bankPostal: text(data.bankPostal),
      swiftCode: text(data.swiftCode),
      ifscCode: text(data.bankIfsc),
      routeNumber: text(data.routeNumber),
      otherDetails: text(data.otherDetails),
    },
    masked: { accountNumber: text(data.accountNumber), iban: text(data.iban) },
  };
}

/**
 * The address the browser is sent to for the Java teacher dashboard: only a web address whose path is the one-time entry
 * (never a script or data URL, or any other page).
 */
export function isSafeDashboardLink(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    return (url.protocol === "https:" || url.protocol === "http:") && /\/teacher\/signup\/enter-dashboard$/.test(url.pathname) && url.searchParams.has("token");
  } catch {
    return false;
  }
}
