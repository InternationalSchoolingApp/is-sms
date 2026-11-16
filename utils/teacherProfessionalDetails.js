/**
 * Step 2 of the teacher registration ("Professional details"): the field rules, the option lists, the document
 * catalogue and the request/response mapping. Mirrors the legacy JSP wizard (signupTeacherContent.js /
 * signupTeacherStage2.js) and the checks the backend enforces
 * (SignupTeacherUtil#validateTeacherAcademicAndProfessionalDetails). Dependency-free: no DOM access, so it behaves the
 * same on the client and in tests (scripts/verifyTeacherProfessionalDetails.mjs).
 */

// ---- limits (the backend enforces the same numbers) ----

export const TEACHER_SPECIALIZATION_MAX_LENGTH = 100;
export const TEACHER_ORGANIZATION_MAX_LENGTH = 100;
export const TEACHER_JOB_DESCRIPTION_MAX_LENGTH = 200;
export const TEACHER_MAX_EXPERIENCE_YEARS = 20;

// ---- options ----

// The wire values of the backend's "highest qualification" master (MasterUtils#getHeighestEducation), as the legacy
// teacher wizard offered them.
export const TEACHER_QUALIFICATION_OPTIONS = [
  { value: "High School", label: "High School" },
  { value: "Bachelors", label: "Bachelor's" },
  { value: "Masters", label: "Master's" },
  { value: "Doctorate", label: "Doctorate" },
  { value: "Associates", label: "Associate's" },
  { value: "None of the above", label: "None of the above" },
];

export const TEACHER_EXPERIENCE_OPTIONS = Array.from({ length: TEACHER_MAX_EXPERIENCE_YEARS }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

// The schools whose teachers may also teach Kindergarten (the legacy page: schoolId 1 or 6).
const KG_SCHOOL_IDS = [1, 6];

/**
 * The grade keys the backend stores in selectedGrades (a CSV): KG = 11, grades 1-5 = 12-16, grades 6-12 = 1-7
 * (the legacy grade select's own option values).
 */
const GRADE_KEY_BY_GRADE = {
  KG: "11",
  1: "12",
  2: "13",
  3: "14",
  4: "15",
  5: "16",
  6: "1",
  7: "2",
  8: "3",
  9: "4",
  10: "5",
  11: "6",
  12: "7",
};

/** Grade picker options for a school, in grade order: [{ value: "11", label: "KG" }, { value: "12", label: "Grade 1" }, ...]. */
export function getTeacherGradeOptions(schoolNumericId) {
  const grades = KG_SCHOOL_IDS.includes(Number(schoolNumericId)) ? ["KG", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  return grades.map((grade) => ({ value: GRADE_KEY_BY_GRADE[grade], label: grade === "KG" ? "KG" : `Grade ${grade}` }));
}

/** "11, 12 ,1" -> ["11", "12", "1"] (blank entries dropped). */
export function parseTeacherGradeKeys(csv) {
  return String(csv ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

// ---- documents ----

/**
 * The documents Step 2 collects. `fileType` is the backend's attachment type; `nameKey` / `urlKey` are the keys the
 * saved file comes back under in get-teacher-academic-professional-details. Work-Experience is the only optional one.
 */
export const TEACHER_DOCUMENTS = [
  { fileType: 2, label: "Highest Degree", required: true, nameKey: "uploadDocumentAcademicName", urlKey: "uploadDocumentAcademicURL" },
  { fileType: 4, label: "Updated CV", required: true, nameKey: "uploadDocumentCVName", urlKey: "uploadDocumentCVURL" },
  { fileType: 3, label: "Proof of last Work-Experience", required: false, nameKey: "uploadDocumentExperienceName", urlKey: "uploadDocumentExperienceURL" },
  { fileType: 19, label: "Passport/National ID", required: true, nameKey: "uploadDocumentPassport", urlKey: "uploadDocumentPassportURL" },
  { fileType: 75, label: "Internet Speed Test Screenshot", required: true, nameKey: "uploadNetSpeedTestSSName", urlKey: "uploadNetSpeedTestSSURL" },
];

export const TEACHER_REQUIRED_DOCUMENT_TYPES = TEACHER_DOCUMENTS.filter((doc) => doc.required).map((doc) => doc.fileType);

// The backend accepts 10 MB, but the upload goes through a Next.js Route Handler (a Vercel function takes ~4.5 MB of
// body), so the browser keeps files under this. A larger limit needs a direct-to-storage upload (later hardening).
export const TEACHER_DOCUMENT_MAX_BYTES = Math.floor(4.4 * 1024 * 1024);
export const TEACHER_DOCUMENT_MAX_LABEL = "4.4 MB";
export const TEACHER_DOCUMENT_ACCEPT = ".jpg,.jpeg,.png,.pdf";
const TEACHER_DOCUMENT_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"];

/** The message for a file the upload would refuse (wrong type, empty, too large), or null. */
export function validateTeacherDocumentFile(file) {
  if (!file) return "Please choose a file";
  const extension = String(file.name || "").split(".").pop().toLowerCase();
  if (!TEACHER_DOCUMENT_EXTENSIONS.includes(extension)) return "Only JPG, PNG or PDF files are allowed";
  if (!file.size) return "The file is empty";
  if (file.size > TEACHER_DOCUMENT_MAX_BYTES) return `The file must be ${TEACHER_DOCUMENT_MAX_LABEL} or smaller`;
  return null;
}

/** The saved documents of get-teacher-academic-professional-details -> { [fileType]: { name, url } } (saved ones only). */
export function mapTeacherDocuments(teacherDetails) {
  const documents = {};
  TEACHER_DOCUMENTS.forEach((doc) => {
    const name = teacherDetails?.[doc.nameKey];
    if (name) documents[doc.fileType] = { name: String(name), url: String(teacherDetails?.[doc.urlKey] || "") };
  });
  return documents;
}

/** The first required document that is not uploaded yet (a TEACHER_DOCUMENTS entry), or null. */
export function findMissingTeacherDocument(documents) {
  return TEACHER_DOCUMENTS.find((doc) => doc.required && !documents?.[doc.fileType]) || null;
}

// ---- text ----

/**
 * Older rows were saved by the legacy page with a few characters escaped (R%26D, %27s ...). Shown decoded; new saves
 * send plain characters. The same table as the backend's SeriUtil#changeToSpecialCharacter (a "%20" becomes a space).
 */
export function decodeTeacherLegacyText(text) {
  return String(text ?? "")
    .replaceAll("%25", "%")
    .replaceAll("%27", "'")
    .replaceAll("%26", "&")
    .replaceAll("%22", '"')
    .replaceAll("%20", " ")
    .replaceAll("%40", "@")
    .replaceAll("&nbsp;", " ");
}

/** The declaration the teacher ticks (the legacy page's wording, word for word). */
export function getTeacherDeclarationText(schoolName) {
  return (
    "I confirm that the information given in this form is true, complete and accurate. I, hereby, undertake to present " +
    `the original documents immediately upon demand by the concerned authorities of ${schoolName || "the school"}. I, ` +
    "further declare that my appointment may be canceled, at any stage, if I am found ineligible and/or the information " +
    "provided by me is found to be incorrect. I, hereby undertake to inform the concerned person, about any changes in " +
    "information submitted by me, in the Application Form and any other documents, including change in addresses and " +
    "contact numbers, from time to time."
  );
}

// ---- the form ----

export const TEACHER_COURSE_BANDS = [
  { key: "elementary", label: "Elementary School", requestKey: "elementrySelectedSubject", allKey: "elementryAllSubject", selectedKey: "elementrySelectedSubject" },
  { key: "middle", label: "Middle School", requestKey: "middleSelectedSubject", allKey: "middleAllSubject", selectedKey: "middleSelectedSubject" },
  { key: "high", label: "High School", requestKey: "highSelectedSubject", allKey: "highAllSubject", selectedKey: "highSelectedSubject" },
];

export const EMPTY_TEACHER_COURSES = { elementary: [], middle: [], high: [] };

export const INITIAL_TEACHER_PROFESSIONAL_FIELDS = {
  highestQualificationId: "",
  educationSpecialization: "",
  totalExperienceYears: "",
  lastOrganizationName: "",
  lastJobDesc: "",
  grades: [], // grade keys, see getTeacherGradeOptions
  courses: EMPTY_TEACHER_COURSES, // { elementary: [titles], middle: [...], high: [...] }
  demoVedioLink: "", // only used when the teacher already has a saved link (the legacy page's "link mode")
  demoMeetingId: "", // the recording the teacher chose (a Lens meeting id); recorder mode only
  declConfirmation: false,
};

/**
 * get-teacher-academic-professional-details + get-teacher-signup-subject-details -> the form's own field shape.
 * Either answer may be missing (null): the form then starts empty for that part.
 */
export function mapTeacherProfessionalToFields(teacherDetails, subjectDetails) {
  const saved = teacherDetails || {};
  const subjects = subjectDetails || {};
  const years = Number(saved.totalExpYear);
  return {
    highestQualificationId: saved.highestQualificationId || "",
    educationSpecialization: decodeTeacherLegacyText(saved.teacherSubjectSpecialization),
    totalExperienceYears: years >= 1 && years <= TEACHER_MAX_EXPERIENCE_YEARS ? String(years) : "",
    lastOrganizationName: decodeTeacherLegacyText(saved.lastOrganizationName),
    lastJobDesc: decodeTeacherLegacyText(saved.lastJobDesc),
    grades: parseTeacherGradeKeys(saved.selectedGrades),
    courses: {
      elementary: Array.isArray(subjects.elementrySelectedSubject) ? subjects.elementrySelectedSubject : [],
      middle: Array.isArray(subjects.middleSelectedSubject) ? subjects.middleSelectedSubject : [],
      high: Array.isArray(subjects.highSelectedSubject) ? subjects.highSelectedSubject : [],
    },
    demoVedioLink: decodeTeacherLegacyText(saved.demoVedioLink),
    demoMeetingId: typeof saved.demoMeetingId === "string" ? saved.demoMeetingId.trim() : "",
    declConfirmation: saved.declConfirmation === "Y",
  };
}

/** True when the teacher already has a saved demo link: the legacy page shows a link field instead of the recorder. */
export function hasTeacherDemoLink(teacherDetails) {
  return Boolean(String(teacherDetails?.demoVedioLink ?? "").trim());
}

export function countTeacherCourses(courses) {
  return TEACHER_COURSE_BANDS.reduce((sum, band) => sum + (courses?.[band.key]?.length || 0), 0);
}

/** A public http(s) link, the only kind a demo link can be. */
export function isValidTeacherDemoLink(link) {
  try {
    const url = new URL(String(link ?? "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Step 2 form validation; `errors` is keyed by field name (`documents` carries the first missing document's label).
 * `options.linkMode` = the demo link is part of the form; `options.documents` = the saved documents;
 * `options.requireDemo` (default true) = a teacher who records their demo must also have chosen a recording;
 * `options.requireDeclaration` (default true) = the declaration must be ticked. Both are false for the save that comes
 * before recording: like the legacy page, the form is saved first (the recording takes a while), the demo does not exist
 * yet and the declaration is only owed with the final Next.
 */
export function validateTeacherProfessionalDetails(
  fields,
  { linkMode = false, documents = {}, requireDemo = true, requireDeclaration = true } = {}
) {
  const errors = {};

  if (!TEACHER_QUALIFICATION_OPTIONS.some((option) => option.value === fields.highestQualificationId)) {
    errors.highestQualificationId = "Highest education degree is required";
  }
  const specialization = fields.educationSpecialization?.trim() || "";
  if (!specialization) errors.educationSpecialization = "Degree specialization is required";
  else if (specialization.length > TEACHER_SPECIALIZATION_MAX_LENGTH) {
    errors.educationSpecialization = `Degree specialization cannot be more than ${TEACHER_SPECIALIZATION_MAX_LENGTH} characters`;
  }
  const years = Number(fields.totalExperienceYears);
  if (!Number.isInteger(years) || years < 1 || years > TEACHER_MAX_EXPERIENCE_YEARS) {
    errors.totalExperienceYears = "Experience in years is required";
  }
  const organization = fields.lastOrganizationName?.trim() || "";
  if (!organization) errors.lastOrganizationName = "Last organization name is required";
  else if (organization.length > TEACHER_ORGANIZATION_MAX_LENGTH) {
    errors.lastOrganizationName = `Last organization name cannot be more than ${TEACHER_ORGANIZATION_MAX_LENGTH} characters`;
  }
  const jobDescription = fields.lastJobDesc?.trim() || "";
  if (!jobDescription) errors.lastJobDesc = "Please tell us why we should hire you";
  else if (jobDescription.length > TEACHER_JOB_DESCRIPTION_MAX_LENGTH) {
    errors.lastJobDesc = `This cannot be more than ${TEACHER_JOB_DESCRIPTION_MAX_LENGTH} characters`;
  }
  if (!fields.grades?.length) errors.grades = "Please choose the grades you have taught";
  if (countTeacherCourses(fields.courses) < 1) errors.courses = "Please choose the courses you have taught";
  const missingDocument = findMissingTeacherDocument(documents);
  if (missingDocument) errors.documents = `Please upload ${missingDocument.label}`;
  if (linkMode && !isValidTeacherDemoLink(fields.demoVedioLink)) errors.demoVedioLink = "Please enter a valid demo link";
  if (!linkMode && requireDemo && !fields.demoMeetingId) {
    errors.demoMeetingId = "Please record your demo and choose a recording";
  }
  if (requireDeclaration && !fields.declConfirmation) errors.declConfirmation = "Please accept the declaration";

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * The save-academic-professional-details body. The documents are uploaded one by one beforehand (upload-document),
 * so `attachments` stays empty. `demoVedioLink` goes only in link mode, `demoMeetingId` (the chosen recording) only in
 * recorder mode and only once one is chosen (the save before recording has none): the backend writes only the keys it
 * is sent, and a saved demo is what moves the teacher on to the next step.
 */
export function buildSaveTeacherProfessionalRequest({ fields, authentication, userId, linkMode = false }) {
  const data = {
    userId,
    attachments: [],
    elementrySelectedSubject: fields.courses.elementary,
    middleSelectedSubject: fields.courses.middle,
    highSelectedSubject: fields.courses.high,
    selectedGrades: fields.grades.join(","),
    highestQualificationId: fields.highestQualificationId,
    totalExperianceFromYYYY: Number(fields.totalExperienceYears),
    totalExperianceFromMM: 0,
    lastOrganizationName: fields.lastOrganizationName.trim(),
    educationSpecialization: fields.educationSpecialization.trim(),
    lastJobDesc: fields.lastJobDesc.trim(),
    declConfirmation: fields.declConfirmation ? "Y" : "N",
  };
  if (linkMode) data.demoVedioLink = fields.demoVedioLink.trim();
  else if (fields.demoMeetingId) data.demoMeetingId = fields.demoMeetingId;
  return { authentication, data };
}
