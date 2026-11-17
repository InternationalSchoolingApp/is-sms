/**
 * Step 5 of the teacher registration ("Verification"): the form's texts, rules, prefill mapping and request. Mirrors the
 * legacy JSP wizard (signupTeacherContent.js getTeacherVerificationDetailsContent, signupTeacherStage5.js) and the backend
 * (TeacherVerificationRules). Dependency-free: no DOM, no "@/" imports, so it behaves the same in the browser and in tests
 * (scripts/verifyTeacherVerification.mjs).
 */

export const REFERENCE_COUNT = 2;
export const MAX_REFERENCE_TEXT_LENGTH = 50;
export const MAX_REFERENCE_PHONE_LENGTH = 20;
export const MAX_SOCIAL_LINK_LENGTH = 255;

// The legacy wording, word for word (including its own typo: "mandatory").
export const SOCIAL_MEDIA_NOTE =
  "You can add links to all your social media profiles. However, adding at least one profile link in mandatory(*).";
export const NO_SOCIAL_MEDIA_TEXT = "I hereby declare that I do not have any active social media accounts.";
export const POLICE_CHECKBOX_TEXT = "I declare that the above statements are true and correct to the best of my knowledge and belief.";

/** The police declaration, one paragraph per line (the first names the teacher). */
export function getPoliceDeclarationLines(fullName) {
  return [
    `I, ${fullName || "the undersigned"} do hereby declare and undertake that:`,
    "I have undergone a police verification process in my city/town of residence and obtained a valid police clearance certificate.",
    "The verification confirms that I do not have any criminal record, and I am eligible for employment as per the institution's requirements.",
    "I take full responsibility for the accuracy of this information and understand that any false declaration may result in disciplinary action, including termination of employment.",
    "I also undertake to notify the institution immediately in case of any legal proceedings initiated against me in the future.",
  ];
}

export const SOCIAL_FIELDS = [
  { key: "linkedIn", label: "LinkedIn Profile URL" },
  { key: "facebook", label: "Facebook Profile URL" },
  { key: "instagram", label: "Instagram Profile URL" },
  { key: "twitter", label: "X (Twitter) Profile URL" },
];

/**
 * The four documents of this step. `fileType` is the backend's attachment type; `nameKey` / `urlKey` are the keys the saved
 * file comes back under in get-teacher-verification-details (details.attachments). All four are required.
 */
export const TEACHER_VERIFICATION_DOCUMENTS = [
  { fileType: 73, label: "Recommendation Letter 1", required: true, nameKey: "recommendationLetter1Name", urlKey: "recommendationLetter1URL" },
  { fileType: 74, label: "Recommendation Letter 2", required: true, nameKey: "recommendationLetter2Name", urlKey: "recommendationLetter2URL" },
  { fileType: 72, label: "Police Verification", required: true, nameKey: "policeVerificationName", urlKey: "policeVerificationURL" },
  { fileType: 41, label: "Last Salary Slip", required: true, nameKey: "previousSalarySlipName", urlKey: "previousSalarySlipURL" },
];

export const TEACHER_VERIFICATION_DOCUMENT_TYPES = TEACHER_VERIFICATION_DOCUMENTS.map((doc) => doc.fileType);

export function emptyReference() {
  return { name: "", email: "", designation: "", phone: "", isdCode: "", isoCode: "", phoneValid: undefined };
}

export const INITIAL_VERIFICATION_FIELDS = {
  links: { linkedIn: "", facebook: "", instagram: "", twitter: "" },
  noSocialMedia: false,
  references: [emptyReference(), emptyReference()],
  policeAccepted: false,
};

// The backend's own e-mail rule (ValidatorUtil.EMAIL): a "+" in the local part and a long TLD are fine.
const EMAIL = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/** A reference's e-mail: the backend's rule (not the stricter sign-up form's). */
export function isValidReferenceEmail(value) {
  const text = String(value ?? "").trim();
  return text.length <= MAX_REFERENCE_TEXT_LENGTH && EMAIL.test(text);
}

/** A social profile link: a web address (http or https), never a script or a bare domain. */
export function isValidSocialLink(value) {
  const text = String(value ?? "").trim();
  return text.length <= MAX_SOCIAL_LINK_LENGTH && /^https?:\/\/\S+$/i.test(text);
}

/** What a reference's name keeps while typing: letters and spaces only (the legacy page's key filter, here also on paste). */
export function sanitizeReferenceName(value) {
  return String(value ?? "")
    .replace(/[^\p{L} ]/gu, "")
    .slice(0, MAX_REFERENCE_TEXT_LENGTH);
}

const isBlank = (value) => !String(value ?? "").trim();

/**
 * get-teacher-verification-details -> { fields, documents }, or null when the answer is not a success.
 * Not saved yet answers a STRING ("Teacher verification not found") where there is an object, so each part falls back to
 * the empty form. `haveSocialMediaAccount` is, despite its name, the backend's "I do not have any" flag ("Y" = none).
 * `documents` is { [fileType]: { name, url } } (saved ones only).
 */
export function mapVerificationDetails(response) {
  if (!response || String(response.status) !== "1" || !response.details) return null;
  const { teacherVerification, employeeReference, attachments } = response.details;
  const saved = teacherVerification && typeof teacherVerification === "object" ? teacherVerification : {};
  const references = Array.isArray(employeeReference) ? employeeReference : [];
  const files = attachments && typeof attachments === "object" ? attachments : {};
  const fields = {
    links: {
      linkedIn: String(saved.linkedIn ?? ""),
      facebook: String(saved.facebook ?? ""),
      instagram: String(saved.instagram ?? ""),
      twitter: String(saved.twitter ?? ""),
    },
    noSocialMedia: String(saved.haveSocialMediaAccount ?? "").toUpperCase() === "Y",
    references: Array.from({ length: REFERENCE_COUNT }, (_, index) => {
      const ref = references[index];
      if (!ref) return emptyReference();
      return {
        name: String(ref.name ?? ""),
        email: String(ref.email ?? ""),
        designation: String(ref.designation ?? ""),
        phone: String(ref.number ?? ""),
        isdCode: ref.isdCode ? String(ref.isdCode) : "",
        isoCode: ref.isoCode ? String(ref.isoCode).toLowerCase() : "",
        phoneValid: undefined,
      };
    }),
    policeAccepted: String(saved.policeVerificationAcceptance ?? "").toUpperCase() === "Y",
  };
  const documents = {};
  TEACHER_VERIFICATION_DOCUMENTS.forEach((doc) => {
    const name = files[doc.nameKey];
    if (name) documents[doc.fileType] = { name: String(name), url: String(files[doc.urlKey] || "") };
  });
  return { fields, documents };
}

/** The first required document that is not uploaded yet (a TEACHER_VERIFICATION_DOCUMENTS entry), or null. */
export function findMissingVerificationDocument(documents) {
  return TEACHER_VERIFICATION_DOCUMENTS.find((doc) => doc.required && !documents?.[doc.fileType]) || null;
}

/**
 * The whole form checked, in the legacy order (social media, the two letters, the references, the police declaration, the
 * police document, the salary slip) with its messages, and the checks the legacy page never made (an e-mail, a phone and a
 * link that are real, a name that is a name, no repeated or own e-mail). `errors` is:
 *   { social, documents: { [fileType]: message }, references: [{ general, name, email, phone, designation }], police }
 * where each is "" / {} when fine. `teacherEmail` is the teacher's own address.
 */
export function validateVerification(fields, documents, { teacherEmail = "" } = {}) {
  const errors = { social: "", documents: {}, references: [{}, {}], police: "" };

  if (!fields.noSocialMedia) {
    const links = SOCIAL_FIELDS.map((field) => String(fields.links?.[field.key] ?? "").trim()).filter(Boolean);
    if (links.length === 0) errors.social = "Please provide at least one social media link.";
    else if (!links.every(isValidSocialLink)) errors.social = "Please enter a valid link (starting with https://) for your social media profile.";
  }

  const missing = (fileType) => TEACHER_VERIFICATION_DOCUMENTS.find((doc) => doc.fileType === fileType);
  [73, 74].forEach((fileType) => {
    if (!documents?.[fileType]) errors.documents[fileType] = `Please Upload ${missing(fileType).label}`;
  });

  const own = String(teacherEmail).trim().toLowerCase();
  const seen = new Set();
  fields.references.forEach((reference, index) => {
    const number = index + 1;
    const found = errors.references[index];
    const email = String(reference.email ?? "").trim().toLowerCase();
    if (
      isBlank(reference.name) ||
      isBlank(reference.email) ||
      isBlank(reference.phone) ||
      isBlank(reference.designation) ||
      isBlank(reference.isdCode)
    ) {
      found.general = `Please fill all fields for Reference ${number}.`;
      if (isBlank(reference.name)) found.name = "Name is required";
      if (isBlank(reference.email)) found.email = "Email is required";
      if (isBlank(reference.phone)) found.phone = "Phone number is required";
      if (isBlank(reference.designation)) found.designation = "Designation is required";
      return;
    }
    if (!/^[\p{L} ]+$/u.test(String(reference.name).trim())) found.name = "Please enter a valid name";
    if (!isValidReferenceEmail(reference.email)) found.email = "Please enter a valid email";
    else if (email === own) found.email = "This cannot be your own email address";
    else if (seen.has(email)) found.email = "Please give a different email address for each reference";
    if (reference.phoneValid === false || String(reference.phone).replace(/\D/g, "").length > MAX_REFERENCE_PHONE_LENGTH) {
      found.phone = "Please enter a valid phone number";
    }
    if (String(reference.designation).trim().length > MAX_REFERENCE_TEXT_LENGTH) found.designation = "Designation is too long";
    if (isValidReferenceEmail(reference.email)) seen.add(email);
  });

  if (!fields.policeAccepted) errors.police = "Please accept the police verification declaration.";
  [72, 41].forEach((fileType) => {
    if (!documents?.[fileType]) errors.documents[fileType] = `Please Upload ${missing(fileType).label}`;
  });

  const valid =
    !errors.social &&
    !errors.police &&
    Object.keys(errors.documents).length === 0 &&
    errors.references.every((found) => Object.keys(found).length === 0);
  return { valid, errors };
}

/**
 * The first message to tell the teacher when the form is not valid (the legacy page toasted one at a time, in this order).
 */
export function firstVerificationError(errors) {
  if (errors.social) return errors.social;
  if (errors.documents[73]) return errors.documents[73];
  if (errors.documents[74]) return errors.documents[74];
  const reference = errors.references.find((found) => Object.keys(found).length > 0);
  if (reference) return reference.general || Object.values(reference)[0];
  if (errors.police) return errors.police;
  return errors.documents[72] || errors.documents[41] || "";
}

/**
 * The save-teacher-verification request. No `attachments` (the documents were uploaded one by one, and a request without
 * them is how the backend knows to check that they are all stored) and no authentication block (the backend reads the
 * signed-in teacher from the token). The legacy wire shape: the phone's dial code as a number, the country as the lower-case
 * ISO2, the number as typed digits.
 */
export function buildSaveVerificationRequest({ fields, userId }) {
  const links = fields.noSocialMedia
    ? { linkedIn: "", facebook: "", instagram: "", twitter: "" }
    : Object.fromEntries(SOCIAL_FIELDS.map((field) => [field.key, String(fields.links?.[field.key] ?? "").trim()]));
  return {
    requestData: {
      userId,
      policeVerification: "Y",
      socialMediaDetails: { ...links, dontHaveSocialMediaAccount: fields.noSocialMedia ? "Y" : "N" },
      referenceDetails: fields.references.map((reference) => ({
        name: String(reference.name).trim(),
        email: String(reference.email).trim(),
        isdCode: Number(String(reference.isdCode).replace(/\D/g, "")) || null,
        isoCode: String(reference.isoCode ?? "").toLowerCase(),
        number: String(reference.phone).replace(/\D/g, ""),
        designation: String(reference.designation).trim(),
      })),
    },
  };
}
