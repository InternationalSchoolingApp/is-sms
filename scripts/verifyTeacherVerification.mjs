// Teacher registration Step 5, the verification form: its rules, the prefill mapping and the request
// (utils/teacherVerification.js). No server needed. Run: npm run verify:teacher-verification
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_VERIFICATION_FIELDS,
  buildSaveVerificationRequest,
  findMissingVerificationDocument,
  firstVerificationError,
  getPoliceDeclarationLines,
  isValidReferenceEmail,
  isValidSocialLink,
  mapVerificationDetails,
  sanitizeReferenceName,
  validateVerification,
} from "../utils/teacherVerification.js";

const reference = (patch = {}) => ({
  name: "Alice Tan",
  email: "alice@school.org",
  designation: "Principal",
  phone: "81234567",
  isdCode: "+65",
  isoCode: "sg",
  phoneValid: true,
  ...patch,
});

const complete = (patch = {}) => ({
  ...INITIAL_VERIFICATION_FIELDS,
  links: { linkedIn: "https://linkedin.com/in/teacher", facebook: "", instagram: "", twitter: "" },
  references: [reference(), reference({ name: "Bob Lim", email: "bob@school.org" })],
  policeAccepted: true,
  ...patch,
});

const allDocuments = { 73: { name: "a.pdf" }, 74: { name: "b.pdf" }, 72: { name: "c.pdf" }, 41: { name: "d.pdf" } };

test("a complete form is valid", () => {
  assert.deepEqual(validateVerification(complete(), allDocuments, { teacherEmail: "me@x.com" }).valid, true);
});

test("social media needs a link or the no-accounts tick, and links are web addresses", () => {
  const none = validateVerification(complete({ links: INITIAL_VERIFICATION_FIELDS.links }), allDocuments);
  assert.equal(none.errors.social, "Please provide at least one social media link.");
  assert.equal(validateVerification(complete({ links: INITIAL_VERIFICATION_FIELDS.links, noSocialMedia: true }), allDocuments).valid, true);
  const bad = validateVerification(complete({ links: { linkedIn: "linkedin.com/in/x", facebook: "", instagram: "", twitter: "" } }), allDocuments);
  assert.match(bad.errors.social, /valid link/);
  assert.equal(isValidSocialLink("https://x.com/a"), true);
  assert.equal(isValidSocialLink("javascript:alert(1)"), false);
  assert.equal(isValidSocialLink("http://x.com/a b"), false);
});

test("the documents are asked for in the legacy order with its messages", () => {
  const { errors } = validateVerification(complete(), {});
  assert.deepEqual(errors.documents, {
    73: "Please Upload Recommendation Letter 1",
    74: "Please Upload Recommendation Letter 2",
    72: "Please Upload Police Verification",
    41: "Please Upload Last Salary Slip",
  });
  assert.equal(findMissingVerificationDocument({ 73: {}, 74: {}, 72: {} }).fileType, 41);
  assert.equal(findMissingVerificationDocument(allDocuments), null);
});

test("a blank reference field says what the legacy page said", () => {
  const { errors, valid } = validateVerification(complete({ references: [reference(), reference({ designation: " " })] }), allDocuments);
  assert.equal(valid, false);
  assert.equal(errors.references[1].general, "Please fill all fields for Reference 2.");
  assert.equal(errors.references[1].designation, "Designation is required");
  assert.deepEqual(errors.references[0], {});
});

test("an e-mail the backend accepts is accepted (a plus, a long TLD), one it would not is not", () => {
  assert.equal(isValidReferenceEmail("a.b+c@uni.education"), true);
  assert.equal(isValidReferenceEmail("not-an-email"), false);
  assert.equal(isValidReferenceEmail("a@b"), false);
  assert.equal(isValidReferenceEmail(`${"a".repeat(50)}@x.com`), false);
});

test("a name is letters and spaces, a phone must be valid, e-mails are not repeated or the teacher's own", () => {
  const bad = validateVerification(
    complete({ references: [reference({ name: "Alice 2", phoneValid: false }), reference({ email: "ALICE@school.org" })] }),
    allDocuments
  );
  assert.equal(bad.errors.references[0].name, "Please enter a valid name");
  assert.equal(bad.errors.references[0].phone, "Please enter a valid phone number");
  assert.equal(bad.errors.references[1].email, "Please give a different email address for each reference");
  const own = validateVerification(complete(), allDocuments, { teacherEmail: "Alice@School.org" });
  assert.equal(own.errors.references[0].email, "This cannot be your own email address");
});

test("the police declaration has to be ticked", () => {
  assert.equal(validateVerification(complete({ policeAccepted: false }), allDocuments).errors.police, "Please accept the police verification declaration.");
});

test("the first message is the legacy page's first failing check", () => {
  const nothing = validateVerification({ ...INITIAL_VERIFICATION_FIELDS }, {}).errors;
  assert.equal(firstVerificationError(nothing), "Please provide at least one social media link.");
  const noLetters = validateVerification(complete(), {}).errors;
  assert.equal(firstVerificationError(noLetters), "Please Upload Recommendation Letter 1");
  const refs = validateVerification(complete({ references: [reference({ name: "" }), reference()] }), allDocuments).errors;
  assert.equal(firstVerificationError(refs), "Please fill all fields for Reference 1.");
  assert.equal(firstVerificationError(validateVerification(complete(), allDocuments).errors), "");
});

test("a reference's name keeps only letters and spaces, even when pasted", () => {
  assert.equal(sanitizeReferenceName("Ålice 3 O'Neil-Tan!"), "Ålice  ONeilTan");
  assert.equal(sanitizeReferenceName("a".repeat(80)).length, 50);
});

test("the police declaration names the teacher", () => {
  assert.equal(getPoliceDeclarationLines("Aazim Shaikh")[0], "I, Aazim Shaikh do hereby declare and undertake that:");
  assert.equal(getPoliceDeclarationLines("").length, 5);
});

test("the request has the legacy shape and no attachments", () => {
  const request = buildSaveVerificationRequest({ fields: complete({ references: [reference(), reference({ name: " Bob Lim ", isdCode: "+91", isoCode: "IN" })] }), userId: 9 });
  const data = request.requestData;
  assert.equal(data.userId, 9);
  assert.equal(data.policeVerification, "Y");
  assert.equal("attachments" in data, false);
  assert.equal("authentication" in request, false);
  assert.deepEqual(data.socialMediaDetails, {
    linkedIn: "https://linkedin.com/in/teacher",
    facebook: "",
    instagram: "",
    twitter: "",
    dontHaveSocialMediaAccount: "N",
  });
  assert.deepEqual(data.referenceDetails[1], {
    name: "Bob Lim",
    email: "alice@school.org",
    isdCode: 91,
    isoCode: "in",
    number: "81234567",
    designation: "Principal",
  });
});

test("ticking no-accounts sends no links", () => {
  const data = buildSaveVerificationRequest({ fields: complete({ noSocialMedia: true }), userId: 9 }).requestData;
  assert.equal(data.socialMediaDetails.dontHaveSocialMediaAccount, "Y");
  assert.equal(data.socialMediaDetails.linkedIn, "");
});

test("not saved yet maps to the empty form, saved details to the filled one", () => {
  assert.equal(mapVerificationDetails(null), null);
  assert.equal(mapVerificationDetails({ status: "0" }), null);
  const empty = mapVerificationDetails({
    status: "1",
    details: { teacherVerification: "Teacher verification not found", employeeReference: "Employee reference not found", attachments: "Attachments not found" },
  });
  assert.deepEqual(empty.documents, {});
  assert.equal(empty.fields.references.length, 2);
  assert.equal(empty.fields.noSocialMedia, false);

  const filled = mapVerificationDetails({
    status: "1",
    details: {
      teacherVerification: { linkedIn: "https://l.in/x", facebook: "", instagram: "", twitter: "", haveSocialMediaAccount: "Y", policeVerificationAcceptance: "Y" },
      employeeReference: [{ name: "Alice", email: "a@b.com", isdCode: "65", isoCode: "SG", number: "81234567", designation: "Head" }],
      attachments: { recommendationLetter1Name: "l1.pdf", recommendationLetter1URL: "https://s3/l1.pdf", previousSalarySlipName: "s.pdf" },
    },
  });
  assert.equal(filled.fields.noSocialMedia, true, "the backend's haveSocialMediaAccount is the 'I have none' flag");
  assert.equal(filled.fields.policeAccepted, true);
  assert.deepEqual([filled.fields.references[0].isoCode, filled.fields.references[0].phone], ["sg", "81234567"]);
  assert.deepEqual(filled.fields.references[1], { name: "", email: "", designation: "", phone: "", isdCode: "", isoCode: "", phoneValid: undefined });
  assert.deepEqual(filled.documents[73], { name: "l1.pdf", url: "https://s3/l1.pdf" });
  assert.deepEqual(filled.documents[41], { name: "s.pdf", url: "" });
  assert.equal(filled.documents[72], undefined);
});
