// Teacher registration Step 6, the bank details form: its rules, the prefill mapping, the request and the dashboard link
// check (utils/teacherBank.js). No server needed. Run: npm run verify:teacher-bank
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_BANK_FIELDS,
  TEACHER_BANK_CURRENCY_CODES,
  buildSaveBankRequest,
  firstBankError,
  firstBankErrorField,
  isMaskedValue,
  isSafeDashboardLink,
  mapBankDetails,
  sanitizeAlphanumeric,
  sanitizeDigits,
  sanitizePersonName,
  validateBankDetails,
} from "../utils/teacherBank.js";

const complete = (patch = {}) => ({
  ...INITIAL_BANK_FIELDS,
  accountCurrency: "SGD",
  accountNumber: "123-456 789",
  accountCategory: "Savings",
  holderFirstName: "Aazim",
  holderLastName: "Shaikh",
  holderAddress: "1 Road, Street",
  holderCountryId: "1",
  holderStateId: "2",
  holderCityId: "3",
  holderPostal: "123 456",
  holderPhone: "81234567",
  holderEmail: "aazim+bank@school.org",
  bankName: "ICICI Bank (N.A.)",
  branchName: "Main Branch",
  branchAddress: "2 Road",
  bankCountryId: "1",
  bankStateId: "2",
  bankCityId: "3",
  bankPostal: "654321",
  ...patch,
});

test("a complete form is valid", () => {
  assert.equal(validateBankDetails(complete()).valid, true);
  assert.equal(validateBankDetails(complete({ bankName: "HDFC" })).valid, true);
});

test("the currency and account type must be chosen (neither has a default any more)", () => {
  assert.equal(validateBankDetails(complete({ accountCurrency: "" })).errors.accountCurrency, "Please choose account currency.");
  assert.equal(validateBankDetails(complete({ accountCurrency: "ZZZ" })).errors.accountCurrency, "Please choose account currency.");
  assert.equal(validateBankDetails(complete({ accountCategory: " " })).errors.accountCategory, "Please choose account type.");
  assert.equal(validateBankDetails(complete({ accountCategory: "Premium" })).errors.accountCategory, "Please choose account type.");
  assert.equal(TEACHER_BANK_CURRENCY_CODES.length, 192);
  assert.equal(TEACHER_BANK_CURRENCY_CODES[0], "AED");
});

test("whitespace only counts as blank (the legacy page let it through)", () => {
  assert.equal(validateBankDetails(complete({ holderAddress: "   " })).errors.holderAddress, "Account holder address can't be blank.");
  assert.equal(validateBankDetails(complete({ bankName: " " })).errors.bankName, "Bank name can't be blank.");
});

test("a masked account number or IBAN is refused, so a read-back never overwrites the real one", () => {
  assert.equal(isMaskedValue("****1234"), true);
  assert.equal(isMaskedValue("12345"), false);
  assert.equal(validateBankDetails(complete({ accountNumber: "****1234" })).errors.accountNumber, "Please enter your full account number.");
  assert.equal(validateBankDetails(complete({ iban: "****5678" })).errors.iban, "Please enter your full IBAN.");
  assert.equal(validateBankDetails(complete({ iban: "GB82WEST12345698765432" })).valid, true);
});

test("the holder, the phone, the e-mail and the codes have to be real", () => {
  assert.equal(validateBankDetails(complete({ holderFirstName: "Aazim2" })).errors.holderFirstName, "Please enter a valid account holder first name.");
  assert.equal(validateBankDetails(complete({ holderPhone: "81234abc" })).errors.holderPhone, "Please enter a valid account holder phone number.");
  assert.equal(validateBankDetails(complete({ holderPhone: "1234" })).errors.holderPhone, "Please enter a valid account holder phone number.");
  assert.equal(validateBankDetails(complete({ holderEmail: "nope" })).errors.holderEmail, "Invalid Email.");
  assert.equal(validateBankDetails(complete({ swiftCode: "AB CD" })).errors.swiftCode, "Please enter a valid bank swift code.");
  assert.equal(validateBankDetails(complete({ ifscCode: "ICIC-001" })).errors.ifscCode, "Please enter a valid bank IFSC code.");
  assert.equal(validateBankDetails(complete({ routeNumber: "12 34" })).errors.routeNumber, "Please enter a valid IBAN/routing number.");
  assert.equal(validateBankDetails(complete({ swiftCode: "ABCDSGSG" })).valid, true);
});

test("no markup in free text, and lengths are capped", () => {
  assert.equal(validateBankDetails(complete({ holderAddress: "<b>x</b>" })).errors.holderAddress, "Please enter a valid account holder address.");
  assert.equal(validateBankDetails(complete({ otherDetails: "<img src=x>" })).errors.otherDetails, "Please enter valid other details.");
  assert.equal(validateBankDetails(complete({ bankName: "a".repeat(51) })).errors.bankName, "Please enter a valid bank name.");
});

test("the first message is the legacy page's first failing check", () => {
  const { errors } = validateBankDetails({ ...INITIAL_BANK_FIELDS });
  assert.equal(firstBankError(errors), "Please choose account currency.");
  assert.equal(firstBankErrorField(errors), "accountCurrency");
  const later = validateBankDetails(complete({ bankPostal: "", holderEmail: "x" })).errors;
  assert.equal(firstBankError(later), "Invalid Email.");
  assert.equal(firstBankError({}), "");
});

test("typing keeps only what each field allows", () => {
  assert.equal(sanitizePersonName("Aazim 3 O'Neil!"), "Aazim  ONeil");
  assert.equal(sanitizeAlphanumeric("AB-12 cd!"), "AB12cd");
  assert.equal(sanitizeDigits("+65 8123-4567"), "6581234567");
  assert.equal(sanitizeAlphanumeric("a".repeat(80)).length, 50);
});

test("the request has the legacy field names, is sent as typed and carries no proof", () => {
  const { data } = buildSaveBankRequest({ fields: complete({ holderFirstName: " ICICI ", swiftCode: "ABCD" }), userId: 9 });
  assert.equal(data.userId, 9);
  assert.equal(data.source, "NEXTJS");
  assert.equal(data.accountType, "BANK_ACCOUNT");
  assert.equal(data.accountHolderFirstName, "ICICI", "trimmed, never re-cased");
  assert.equal(data.bankName, "ICICI Bank (N.A.)");
  assert.equal(data.accountHolderCountryId, 1);
  assert.equal(data.bankCityId, 3);
  assert.equal(data.accountCategory, "Savings");
  assert.equal(data.swiftCode, "ABCD");
  assert.equal(data.bankIfsc, "");
  assert.equal("attachments" in data, false);
});

test("nothing saved is the empty form; saved details come back without the masked numbers", () => {
  assert.equal(mapBankDetails(null), null);
  assert.equal(mapBankDetails({ status: "0" }), null);
  const none = mapBankDetails({ status: "1", data: { hasBankDetails: false } });
  assert.deepEqual(none.fields, INITIAL_BANK_FIELDS);
  assert.deepEqual(none.masked, { accountNumber: "", iban: "" });

  const saved = mapBankDetails({
    status: "1",
    data: {
      hasBankDetails: true,
      accountCurrency: "INR",
      accountNumber: "****1234",
      iban: "****5678",
      accountCategory: "Current",
      accountHolderFirstName: "Aazim",
      accountHolderCountryId: 101,
      accountHolderStateId: 0,
      bankName: "ICICI Bank",
      bankIfsc: "ICIC0001",
    },
  });
  assert.equal(saved.fields.accountNumber, "", "the masked number is never put in the form");
  assert.equal(saved.fields.iban, "");
  assert.deepEqual(saved.masked, { accountNumber: "****1234", iban: "****5678" });
  assert.equal(saved.fields.accountCurrency, "INR");
  assert.equal(saved.fields.holderCountryId, "101");
  assert.equal(saved.fields.holderStateId, "");
  assert.equal(saved.fields.ifscCode, "ICIC0001");
  assert.equal(mapBankDetails({ status: "1", data: { hasBankDetails: true, accountCurrency: "ZZZ" } }).fields.accountCurrency, "");
});

test("only the one-time dashboard entry address is followed", () => {
  assert.equal(isSafeDashboardLink("https://is.example/school-uuid/teacher/signup/enter-dashboard?token=abc"), true);
  assert.equal(isSafeDashboardLink("http://localhost:8080/school/teacher/signup/enter-dashboard?token=abc"), true);
  assert.equal(isSafeDashboardLink("https://is.example/school/teacher/signup/enter-dashboard"), false);
  assert.equal(isSafeDashboardLink("https://evil.example/login?token=abc"), false);
  assert.equal(isSafeDashboardLink("javascript:alert(1)"), false);
  assert.equal(isSafeDashboardLink(""), false);
});
