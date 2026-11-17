/**
 * Step 3 of the teacher registration ("Review"): what the teacher's saved details look like on the review screen, as
 * the legacy wizard listed them (signupTeacherStage3.js). Pure and dependency-free (no DOM, no "@/" imports), so it
 * behaves the same on the client and in tests (scripts/verifyTeacherReview.mjs).
 */
import {
  TEACHER_COURSE_BANDS,
  TEACHER_DOCUMENTS,
  TEACHER_QUALIFICATION_OPTIONS,
  getTeacherGradeOptions,
} from "./teacherProfessionalDetails.js";

// The lock screen after submitting (and while the school reviews): how often the status is looked at again.
export const TEACHER_STATUS_POLL_MS = 30 * 1000;

/** "Jan 5, 1990" for a date of birth (a Date built from its parts, so no timezone shift), "" when there is none. */
export function formatReviewDob(dob) {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(dob);
}

/** "First Middle Last" without the blanks. */
export function teacherFullName(fields) {
  return [fields?.firstName, fields?.middleName, fields?.lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * The Personal section: Name, Email, Gender, Phone Number, Date of Birth, Country, State, City.
 * `fields` is the step 1 field shape (hooks/useTeacherSignup.js mapTeacherDetailsToFields); the labels of the gender and
 * of the country/state/city come from the lists the caller already has.
 */
export function buildTeacherPersonalRows({ fields, genderLabel, countryName, stateName, cityName }) {
  return [
    { label: "Name", value: teacherFullName(fields) },
    { label: "Email", value: fields?.communicationEmail || "" },
    { label: "Gender", value: genderLabel || "" },
    { label: "Phone Number", value: [fields?.countryIsdCode, fields?.contactNumber].filter(Boolean).join(" ") },
    { label: "Date of Birth", value: formatReviewDob(fields?.dob) },
    { label: "Country", value: countryName || "" },
    { label: "State", value: stateName || "" },
    { label: "City", value: cityName || "" },
  ];
}

/** The Professional section's text rows (the documents and the demo are listed apart). `fields` is the step 2 field shape. */
export function buildTeacherProfessionalRows({ fields, schoolNumericId }) {
  const qualification = TEACHER_QUALIFICATION_OPTIONS.find((option) => option.value === fields?.highestQualificationId);
  const gradeKeys = new Set(fields?.grades ?? []);
  const grades = getTeacherGradeOptions(schoolNumericId)
    .filter((option) => gradeKeys.has(option.value))
    .map((option) => option.label);
  const courses = TEACHER_COURSE_BANDS.flatMap((band) => fields?.courses?.[band.key] ?? []);
  const years = String(fields?.totalExperienceYears ?? "");
  return [
    { label: "Highest Education Degree", value: qualification?.label || fields?.highestQualificationId || "" },
    { label: "Degree Specialization", value: fields?.educationSpecialization || "" },
    { label: "Total Online Teaching Experience", value: years ? `${years} ${years === "1" ? "Year" : "Years"}` : "" },
    { label: "Last/Current Organization", value: fields?.lastOrganizationName || "" },
    { label: "Why Should We Hire You?", value: fields?.lastJobDesc || "" },
    { label: "Grades taught", value: grades.join(", ") },
    { label: "Courses taught", value: courses.join(", ") },
  ];
}

/**
 * The documents section, one row per document of Step 2: { label, name, url }. A document that is not uploaded shows
 * "NA" when it is optional (the legacy wording) and "Not uploaded" when it is required; `url` "" = nothing to open.
 */
export function buildTeacherDocumentRows(documents) {
  return TEACHER_DOCUMENTS.map((doc) => {
    const saved = documents?.[doc.fileType];
    return { label: doc.label, name: saved?.name || (doc.required ? "Not uploaded" : "NA"), url: saved?.url || "" };
  });
}
