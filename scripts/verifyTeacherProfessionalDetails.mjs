// Teacher registration Step 2: the field rules, option lists, document catalogue and request mapping
// (utils/teacherProfessionalDetails.js). No server needed.
// Run: npm run verify:teacher-professional
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_TEACHER_COURSES,
  INITIAL_TEACHER_PROFESSIONAL_FIELDS,
  TEACHER_DOCUMENT_MAX_BYTES,
  buildSaveTeacherProfessionalRequest,
  decodeTeacherLegacyText,
  findMissingTeacherDocument,
  getTeacherGradeOptions,
  hasTeacherDemoLink,
  mapTeacherDocuments,
  mapTeacherProfessionalToFields,
  parseTeacherGradeKeys,
  validateTeacherDocumentFile,
  validateTeacherProfessionalDetails,
} from "../utils/teacherProfessionalDetails.js";

const ALL_DOCUMENTS = { 2: { name: "a.pdf" }, 4: { name: "b.pdf" }, 19: { name: "c.png" }, 75: { name: "d.jpg" } };

const VALID_FIELDS = {
  ...INITIAL_TEACHER_PROFESSIONAL_FIELDS,
  highestQualificationId: "Masters",
  educationSpecialization: "Physics",
  totalExperienceYears: "5",
  lastOrganizationName: "Some School",
  lastJobDesc: "I teach well.",
  grades: ["12", "1"],
  courses: { ...EMPTY_TEACHER_COURSES, middle: ["Math"] },
  demoMeetingId: "lens-meeting-1",
  declConfirmation: true,
};

test("grade options: KG only for schools 1 and 6, keys follow the legacy grade select", () => {
  const kgSchool = getTeacherGradeOptions(1);
  assert.deepEqual(kgSchool[0], { value: "11", label: "KG" });
  assert.equal(kgSchool.length, 13);
  assert.equal(getTeacherGradeOptions(6)[0].label, "KG");
  const other = getTeacherGradeOptions(3);
  assert.equal(other.length, 12);
  assert.deepEqual(other[0], { value: "12", label: "Grade 1" });
  assert.deepEqual(other[5], { value: "1", label: "Grade 6" });
  assert.deepEqual(other[11], { value: "7", label: "Grade 12" });
});

test("parseTeacherGradeKeys tolerates spaces and blanks", () => {
  assert.deepEqual(parseTeacherGradeKeys("11, 12 ,1,"), ["11", "12", "1"]);
  assert.deepEqual(parseTeacherGradeKeys(""), []);
  assert.deepEqual(parseTeacherGradeKeys(null), []);
});

test("legacy escapes are decoded for display", () => {
  assert.equal(decodeTeacherLegacyText("R%26D %27s"), "R&D 's");
  assert.equal(decodeTeacherLegacyText(null), "");
  assert.equal(decodeTeacherLegacyText("plain"), "plain");
});

test("the saved record maps to the form, tolerating a half-empty answer", () => {
  const fields = mapTeacherProfessionalToFields(
    {
      highestQualificationId: "Bachelors",
      teacherSubjectSpecialization: "R%26D",
      totalExpYear: "7",
      lastOrganizationName: "Org",
      lastJobDesc: "Because",
      selectedGrades: "11,12",
      demoVedioLink: "",
      declConfirmation: "Y",
    },
    { middleSelectedSubject: ["Math"] }
  );
  assert.equal(fields.educationSpecialization, "R&D");
  assert.equal(fields.totalExperienceYears, "7");
  assert.deepEqual(fields.grades, ["11", "12"]);
  assert.deepEqual(fields.courses, { elementary: [], middle: ["Math"], high: [] });
  assert.equal(fields.declConfirmation, true);
  // nothing saved yet: an empty experience, not "0" or NaN
  assert.equal(mapTeacherProfessionalToFields({ totalExpYear: "" }, null).totalExperienceYears, "");
  assert.equal(mapTeacherProfessionalToFields({ totalExpYear: "35" }, null).totalExperienceYears, "");
});

test("link mode is on exactly when a demo link is saved", () => {
  assert.equal(hasTeacherDemoLink({ demoVedioLink: "https://youtu.be/x" }), true);
  assert.equal(hasTeacherDemoLink({ demoVedioLink: "  " }), false);
  assert.equal(hasTeacherDemoLink({}), false);
});

test("documents: saved ones map by file type, the first missing required one is found", () => {
  const documents = mapTeacherDocuments({
    uploadDocumentAcademicName: "degree.pdf",
    uploadDocumentAcademicURL: "https://x/degree.pdf",
    uploadDocumentPassport: "id.png",
    uploadDocumentPassportURL: "https://x/id.png",
  });
  assert.deepEqual(documents[2], { name: "degree.pdf", url: "https://x/degree.pdf" });
  assert.equal(documents[19].name, "id.png");
  assert.equal(documents[4], undefined);
  assert.equal(findMissingTeacherDocument(documents).fileType, 4);
  assert.equal(findMissingTeacherDocument(ALL_DOCUMENTS), null);
  // work experience (3) is optional: it never counts as missing
  assert.equal(findMissingTeacherDocument({ ...ALL_DOCUMENTS, 3: undefined }), null);
});

test("a file is checked for type and size before it goes up", () => {
  assert.equal(validateTeacherDocumentFile({ name: "cv.PDF", size: 1000 }), null);
  assert.match(validateTeacherDocumentFile({ name: "cv.docx", size: 1000 }), /JPG, PNG or PDF/);
  assert.match(validateTeacherDocumentFile({ name: "cv.pdf", size: 0 }), /empty/);
  assert.match(validateTeacherDocumentFile({ name: "cv.pdf", size: TEACHER_DOCUMENT_MAX_BYTES + 1 }), /smaller/);
  assert.match(validateTeacherDocumentFile(null), /choose/);
});

test("a complete form is valid; each rule fails on its own field", () => {
  const options = { documents: ALL_DOCUMENTS };
  assert.equal(validateTeacherProfessionalDetails(VALID_FIELDS, options).valid, true);

  const fails = (patch, key, opts = options) => {
    const { valid, errors } = validateTeacherProfessionalDetails({ ...VALID_FIELDS, ...patch }, opts);
    assert.equal(valid, false);
    assert.ok(errors[key], `expected an error on ${key}`);
  };
  fails({ highestQualificationId: "Below High School" }, "highestQualificationId");
  fails({ educationSpecialization: "  " }, "educationSpecialization");
  fails({ educationSpecialization: "x".repeat(101) }, "educationSpecialization");
  fails({ totalExperienceYears: "0" }, "totalExperienceYears");
  fails({ totalExperienceYears: "21" }, "totalExperienceYears");
  fails({ lastOrganizationName: "" }, "lastOrganizationName");
  fails({ lastJobDesc: "x".repeat(201) }, "lastJobDesc");
  fails({ grades: [] }, "grades");
  fails({ courses: EMPTY_TEACHER_COURSES }, "courses");
  fails({ declConfirmation: false }, "declConfirmation");
  fails({ demoMeetingId: "" }, "demoMeetingId");
  // the save before recording has no demo yet; a link-mode teacher never needs a recording
  assert.equal(validateTeacherProfessionalDetails({ ...VALID_FIELDS, demoMeetingId: "" }, { ...options, requireDemo: false }).valid, true);
  assert.equal(
    validateTeacherProfessionalDetails({ ...VALID_FIELDS, demoMeetingId: "", demoVedioLink: "https://youtu.be/abc" }, { ...options, linkMode: true }).valid,
    true
  );
  fails({}, "documents", { documents: { ...ALL_DOCUMENTS, 75: undefined } });
  fails({ demoVedioLink: "not a link" }, "demoVedioLink", { documents: ALL_DOCUMENTS, linkMode: true });
  assert.equal(
    validateTeacherProfessionalDetails({ ...VALID_FIELDS, demoVedioLink: "https://youtu.be/abc" }, { documents: ALL_DOCUMENTS, linkMode: true }).valid,
    true
  );
});

test("the save request carries the legacy shape; the link only in link mode", () => {
  const authentication = { userId: 7 };
  const normal = buildSaveTeacherProfessionalRequest({ fields: { ...VALID_FIELDS, lastJobDesc: " Because " }, authentication, userId: 7 });
  assert.equal(normal.authentication, authentication);
  assert.equal(normal.data.userId, 7);
  assert.deepEqual(normal.data.attachments, []);
  assert.equal(normal.data.selectedGrades, "12,1");
  assert.equal(normal.data.totalExperianceFromYYYY, 5);
  assert.equal(normal.data.totalExperianceFromMM, 0);
  assert.equal(normal.data.lastJobDesc, "Because");
  assert.equal(normal.data.declConfirmation, "Y");
  assert.deepEqual(normal.data.middleSelectedSubject, ["Math"]);
  assert.equal("demoVedioLink" in normal.data, false);
  assert.equal(normal.data.demoMeetingId, "lens-meeting-1");
  // the save before recording has no chosen recording: nothing is sent, so the stage is not advanced
  const beforeRecording = buildSaveTeacherProfessionalRequest({ fields: { ...VALID_FIELDS, demoMeetingId: "" }, authentication, userId: 7 });
  assert.equal("demoMeetingId" in beforeRecording.data, false);

  const link = buildSaveTeacherProfessionalRequest({
    fields: { ...VALID_FIELDS, demoVedioLink: " https://youtu.be/abc " },
    authentication,
    userId: 7,
    linkMode: true,
  });
  assert.equal(link.data.demoVedioLink, "https://youtu.be/abc");
  assert.equal("demoMeetingId" in link.data, false);
});

test("the save before recording owes neither a demo nor the declaration, everything else still counts", () => {
  const draft = { ...VALID_FIELDS, demoMeetingId: "", declConfirmation: false };
  const options = { documents: ALL_DOCUMENTS, requireDemo: false, requireDeclaration: false };
  assert.equal(validateTeacherProfessionalDetails(draft, options).valid, true);
  assert.equal(validateTeacherProfessionalDetails({ ...draft, grades: [] }, options).errors.grades !== undefined, true);
  assert.equal(validateTeacherProfessionalDetails(draft, { documents: ALL_DOCUMENTS }).errors.declConfirmation !== undefined, true);
  // it goes out as "N" with no demo in it
  const request = buildSaveTeacherProfessionalRequest({ fields: draft, authentication: { userId: 7 }, userId: 7 });
  assert.equal(request.data.declConfirmation, "N");
  assert.equal("demoMeetingId" in request.data, false);
});
