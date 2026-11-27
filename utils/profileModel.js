import countryData from "intl-tel-input/data";

/**
 * Turns the profile-view-content-new answer (services/profileApi.js) into named, display-ready sections for My
 * Profile. The backend sends `profileData.studentProfile` as a positional array:
 *   [0] personal, [1] parents/guardian, [2] academic, [3] live-class timing, [4] sports & clubs,
 *   [5] reserve a seat (staff only, not shown here), [6] school e-mail account, [7] registration flags.
 * Pure (no React), so the plain and the K–5 views share it.
 *
 * Completion follows the existing page (profileViewNew.js calculateSectionPercentage):
 *   1 Personal  13 = first name, gender, dob, phone, e-mail, country, state, city, timezone, nationality, address,
 *                    any hobby, any social link
 *   2 Parents   11 = the fullest of mother / father / guardian (10 fields each) + relation + anniversary
 *                    + any communication channel + any calling time (capped at 11)
 *   3 Academic   4 = the four uploaded documents
 *   4 Timing     1 = any preferred live-class time
 *   5 Sports     1 = any joined sport / activity
 *   Overall = all filled / 30. Sections 6 and 7 have no percentage.
 */

export const PROFILE_SECTIONS = [
  { id: 1, key: "personal", title: "Personal Information" },
  { id: 2, key: "parents", title: "Parent/Guardian Information" },
  { id: 3, key: "academic", title: "Academic Information" },
  { id: 4, key: "timing", title: "Live Classes - Preferred Timing" },
  { id: 5, key: "sports", title: "Sport & Extra Curriculars" },
  { id: 6, key: "schoolEmail", title: "Student School Email Account" },
  { id: 7, key: "withdrawal", title: "Withdrawal Request" },
];

const text = (value) => (value == null ? "" : String(value).trim());
const filled = (value) => text(value) !== "" && text(value) !== "0";
const yes = (value) => text(value).toUpperCase() === "Y";
const ratio = (count, total) => (total > 0 ? Math.round((100 * Math.min(count, total)) / total) : 0);

const DIAL_BY_ISO = new Map(countryData.map((c) => [c.iso2, c.dialCode]));
// Stored as an ISO code ("kw") by the phone widget; older rows may already hold a dial code.
export function dialCode(code) {
  const value = text(code).toLowerCase();
  if (!value) return "";
  if (/^\+?\d+$/.test(value)) return value.startsWith("+") ? value : `+${value}`;
  const dial = DIAL_BY_ISO.get(value);
  return dial ? `+${dial}` : "";
}

const phone = (number, code) => {
  const n = text(number);
  if (!n) return "";
  const dial = dialCode(code);
  return dial ? `${dial} ${n}` : n;
};

// "9:00:00" -> "09:00".
function hhmm(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(text(value));
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}

// "17:00:00" -> "05:00 PM" (already 12-hour values pass through).
function to12Hour(value) {
  const v = text(value);
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(v);
  if (!m) return v;
  const h = Number(m[1]);
  return `${String(h % 12 || 12).padStart(2, "0")}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

const placeName = (map, id) => (filled(id) ? map?.[String(id)] || "" : "");
const fullName = (...parts) => parts.map(text).filter(Boolean).join(" ");

export function initialsOf(name) {
  const words = text(name).split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

// One parent block: mother / father / guardian. The backend spells a few keys its own way
// (motherName = mother's first name, gurdianFacebook, guardianEmergencyNumberStatus).
function parentBlock(p, places, kind) {
  const first = kind === "mother" ? p.motherName : p[`${kind}FirstName`];
  const facebook = kind === "guardian" ? p.gurdianFacebook ?? p.guardianFacebook : p[`${kind}Facebook`];
  const emergency = kind === "guardian" ? p.guardianEmergencyNumberStatus : p[`${kind}PhoneEmergencyNumberStatus`];
  const block = {
    firstName: text(first),
    middleName: text(p[`${kind}MiddleName`]),
    lastName: text(p[`${kind}LastName`]),
    phone: phone(p[`${kind}PhoneNumber`], p[`${kind}PhoneNumberCountryCode`]),
    whatsApp: yes(p[`${kind}PhoneNumberWhatsAppStatus`]),
    emergency: yes(emergency),
    email: text(p[`${kind}Email`]),
    facebook: text(facebook),
    country: placeName(places.countries, p[`${kind}Country`]),
    state: placeName(places.states, p[`${kind}State`]),
    city: placeName(places.cities, p[`${kind}City`]),
    occupation: text(p[`${kind}Occupation`]),
    dob: text(p[`${kind}Dob`]),
  };
  const counted = [first, p[`${kind}LastName`], p[`${kind}PhoneNumber`], p[`${kind}Email`], facebook, p[`${kind}Country`], p[`${kind}State`], p[`${kind}City`], p[`${kind}Occupation`], p[`${kind}Dob`]];
  block.count = counted.filter(filled).length;
  return block;
}

const DOCS = [
  ["ageProof", "Age Proof"],
  ["addressProof", "Address Proof"],
  ["parentPassportProof", "Parent Passport"],
  ["lastAcademicProof", "Last Academic Proof"],
];

function socialLinks(list) {
  return (Array.isArray(list) ? list : [])
    .map((item) => {
      const key = Object.keys(item || {}).find((k) => k.endsWith("_URL"));
      return { label: text(item?.socMedLabel) || (key ? key.replace(/_URL$/, "") : ""), url: key ? text(item[key]) : "" };
    })
    .filter((link) => link.label);
}

export function buildProfileModel({ profile, places = {}, withdrawalEligible = false } = {}) {
  const sp = profile?.profileData?.studentProfile || [];
  const [p = {}, g = {}, a = {}, t = {}, s = {}, , e = {}] = sp;
  const safePlaces = { countries: places.countries || {}, states: places.states || {}, cities: places.cities || {} };
  const verification = profile?.profileData?.profileContactVerification || {};
  const verified = (field) => yes(verification[field]?.verifiedStatus);

  // 1. Personal
  const hobbies = (Array.isArray(p.hobbies) ? p.hobbies : []).map((h) => ({ label: text(h.hobbiesLabel), on: yes(h.status) })).filter((h) => h.label);
  const social = socialLinks(p.socialMedia);
  const personal = {
    firstName: text(p.firstName),
    middleName: text(p.middleName),
    lastName: text(p.lastName),
    gender: text(p.gender) ? text(p.gender).charAt(0) + text(p.gender).slice(1).toLowerCase() : "",
    dob: text(p.dob),
    phone: phone(p.phoneNumber, p.phoneNumberCountryCode),
    phoneWhatsApp: yes(p.phoneNumberWhatsAppStatus),
    phoneVerified: verified("phoneNumber"),
    altPhone: phone(p.altPhoneNumber, p.altPhoneNumberCountryCode),
    altPhoneWhatsApp: yes(p.altPhoneNumberWhatsAppStatus),
    email: text(p.studentEmailId),
    emailVerified: verified("studentEmailId"),
    altEmail: text(p.altEmailId),
    altEmailVerified: verified("altEmailId"),
    country: placeName(safePlaces.countries, p.country),
    state: placeName(safePlaces.states, p.state),
    city: placeName(safePlaces.cities, p.city),
    timezone: text(p.timezoneName),
    nationality: text(p.nationality),
    address: text(p.address),
    photo: text(p.profilePic),
    hobbies,
    social,
  };
  const personalCount =
    [p.firstName, p.gender, p.dob, p.phoneNumber, p.studentEmailId, p.country, p.state, p.city, p.timezone, p.nationalityId, p.address].filter(filled).length +
    (hobbies.some((h) => h.on) ? 1 : 0) +
    (social.some((l) => l.url) ? 1 : 0);

  // 2. Parents / guardian
  const mother = parentBlock(g, safePlaces, "mother");
  const father = parentBlock(g, safePlaces, "father");
  const guardian = parentBlock(g, safePlaces, "guardian");
  // Raw calling times for the editor: [{ role, start "HH:mm", end "HH:mm" }].
  const callingSlots = (Array.isArray(g.callingTimePrefArray) ? g.callingTimePrefArray : []).flatMap((group) =>
    (Array.isArray(group?.timings) ? group.timings : [])
      .map((slot) => ({ role: text(group.communicationRoleType), start: hhmm(slot?.startTime), end: hhmm(slot?.endTime) }))
      .filter((x) => x.role && x.start && x.end),
  );
  // [{ communicationRoleType: "Mother"|"Father"|"Guardian", timings: [{ startTime "HH:mm[:ss]", endTime }] }]
  const callingTimes = (Array.isArray(g.callingTimePrefArray) ? g.callingTimePrefArray : []).flatMap((group) =>
    (Array.isArray(group?.timings) ? group.timings : []).map((slot) => {
      const range = [to12Hour(slot?.startTime), to12Hour(slot?.endTime)].filter(Boolean).join(" - ");
      return range ? `${text(group.communicationRoleType) ? `${text(group.communicationRoleType)}: ` : ""}${range}` : "";
    }),
  );
  const parents = {
    mother,
    father,
    guardian,
    relation: text(g.relationType),
    anniversary: text(g.weddingAnniversaryDate),
    channels: [
      { label: "WhatsApp", on: yes(g.pcWhatsappView) },
      { label: "Phone", on: yes(g.pcCallView) },
      { label: "Email", on: yes(g.pcEmailView) },
    ],
    callingTimes: callingTimes.filter(Boolean),
    callingSlots,
  };
  const parentsCount =
    Math.max(mother.count, father.count, guardian.count) +
    [g.relationType, g.weddingAnniversaryDate].filter(filled).length +
    (parents.channels.some((c) => c.on) ? 1 : 0) +
    (parents.callingTimes.length ? 1 : 0);

  // School-defined custom fields of each section (DashboardStudentUtil.getCustomFieldsForSection; the existing page
  // renders them with renderDynamicFieldByUserID in Personal, Parent, Academic and Sports — Timing's are commented out).
  const customFields = {
    personal: customFieldsOf(p.customFields),
    parents: customFieldsOf(g.customFields),
    academic: customFieldsOf(a.customFields),
    sports: customFieldsOf(s.customFields),
  };

  // 3. Academic
  const standard = (Array.isArray(a.studentStandardDTO) ? a.studentStandardDTO : [])[0] || {};
  const subjects = standard.studentCourseSelectionDTO?.semesterSubjects1;
  const courses = Array.isArray(subjects) && subjects.length
    ? subjects.map((c) => ({ name: text(c.subjectName), code: text(c.subjectCode) }))
    : (Array.isArray(a.courses) ? a.courses : []).map((label) => {
        const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(text(label));
        return m ? { name: m[1], code: m[2] } : { name: text(label), code: "" };
      });
  // The parent passport's type comes as parentPassportAttachmentType (DashboardStudentUtil), the others as <key>AttachmentType.
  const documents = DOCS.map(([key, label]) => ({
    key,
    label,
    url: text(a[key]),
    name: text(a[`${key}Name`]),
    type: text(key === "parentPassportProof" ? a.parentPassportAttachmentType ?? a.parentPassportProofAttachmentType : a[`${key}AttachmentType`]),
  }));
  const academic = {
    studentId: text(a.studentID),
    academicYearStart: text(a.academicYearStartDate),
    enrollmentDate: text(a.enrollmentDate),
    learningProgram: text(a.learningProgram),
    grade: text(a.grade) || text(standard.standardName),
    lms: text(a.learningPlatform),
    courses: courses.filter((c) => c.name),
    previousSchool: text(a.previousCurrentSchoolName),
    previousGrade: text(a.previousCurrentGradeName),
    graduationYear: text(a.previousCurrentSchoolGraduationYear),
    previousCountry: placeName(safePlaces.countries, a.previousCurrentSchoolCountry) || (filled(a.previousCurrentSchoolCountry) && !/^\d+$/.test(text(a.previousCurrentSchoolCountry)) ? text(a.previousCurrentSchoolCountry) : ""),
    ctiRecommendedGrade: text(a.ctiTakenRecommendedGrade) || "No",
    documents,
    idCardUrl: text(a.studentIdCardDownloadUrl),
    // The existing page shows Download Student ID Card only for an active enrolment (standardStatus 0).
    idCardAllowed: String(a.standardStatus ?? "") === "0",
    systemTrainingSkipped: text(a.systemTrainingStatus).toLowerCase() === "skipped" && !a.showSkipSystemTraining,
  };
  const academicCount = documents.filter((d) => d.url).length;

  // 4. Preferred live-class timing
  const timing = {
    slots: (Array.isArray(t.prefTimeList) ? t.prefTimeList : []).map((slot) => ({
      id: slot.timePrefId,
      start: text(slot.displayStartTime) || to12Hour(slot.startTime),
      end: text(slot.displayEndTime) || to12Hour(slot.endTime),
      start24: hhmm(slot.startTime),
      end24: hhmm(slot.endTime),
    })),
  };

  // 5. Sports & clubs
  const joined = (Array.isArray(s.joinedSportsAndECList) ? s.joinedSportsAndECList : []).map((row) => ({
    id: row.id,
    title: text(row.title),
    start: text(row.startDate),
    end: text(row.endDate),
    place: text(row.address),
  }));
  const sports = {
    participates: joined.length > 0,
    joined,
    clubs: (Array.isArray(s.sportsAndECList) ? s.sportsAndECList : []).map((c) => ({ id: c.sportEcId ?? c.id, label: text(c.sEclabel), on: yes(c.assignActiveStudent) || yes(c.value) })).filter((c) => c.label),
  };

  // 6. School e-mail account (Microsoft 365). The password is shown as on the existing page, only once created.
  const active = yes(e.azureUserStatus);
  const schoolEmail = { active, email: active ? text(e.email) : "", password: active ? text(e.password) : "", passwordCreated: active && Boolean(text(e.passwordCreatedDate)) };

  // 7. Withdrawal (P5 builds the request flow; P1 only shows who the request is for).
  const withdrawal = { eligible: withdrawalEligible, inProgress: filled(profile?.withdrawnRequest) };

  const counts = [
    [personalCount, 13],
    [parentsCount, 11],
    [academicCount, 4],
    [timing.slots.length ? 1 : 0, 1],
    [joined.length ? 1 : 0, 1],
  ];
  const sectionPct = counts.map(([c, total]) => ratio(c, total));
  const overallCount = counts.reduce((sum, [c, total]) => sum + Math.min(c, total), 0);
  const overallTotal = counts.reduce((sum, [, total]) => sum + total, 0);

  const name = fullName(personal.firstName, personal.middleName, personal.lastName);
  const sections = PROFILE_SECTIONS.filter((sec) => sec.key !== "withdrawal" || withdrawalEligible).map((sec) => ({
    ...sec,
    pct: sec.id <= 5 ? sectionPct[sec.id - 1] : null,
  }));

  return {
    header: {
      name,
      shortName: fullName(personal.firstName, personal.lastName) || name,
      initials: initialsOf(fullName(personal.firstName, personal.lastName) || name),
      photo: personal.photo,
      grade: academic.grade,
      studentId: academic.studentId,
    },
    pct: ratio(overallCount, overallTotal),
    sections,
    rightToEdit: profile?.rightToEdit === true,
    // { phoneNumber: true, phoneNumberWhatsAppStatus: false, ... } from profileContactVerification (P4 OTP).
    verified: Object.fromEntries(Object.keys(verification).map((field) => [field, verified(field)])),
    personal,
    parents,
    academic,
    timing,
    customFields,
    sports,
    schoolEmail,
    withdrawal,
  };
}

// ---- Custom profile fields ----
const CUSTOM_TYPES = ["text", "date", "file", "dropdown", "checkbox", "radio"];
/** A dropdown option's stored value, as the existing page builds it: spaces -> "_", upper case. */
export const customOptionKey = (label) => String(label || "").trim().replace(/\s+/g, "_").toUpperCase();
/**
 * [{ id, fieldId, label, type (text | date | file | dropdown | checkbox | radio), options [label], value, url,
 *    attachmentType ("I" | "P"), purpose }] from one section's customFields (backend fieldType input/dropdown/checkbox/
 * radio with inputType text/date/file). Unknown types are left out.
 */
export function customFieldsOf(list) {
  const t = (v) => (v == null ? "" : String(v).trim());
  return (Array.isArray(list) ? list : [])
    .map((f) => {
      const fieldType = t(f?.fieldType).toLowerCase();
      const inputType = t(f?.inputType).toLowerCase();
      const type = fieldType === "input" ? (["text", "date", "file"].includes(inputType) ? inputType : "text") : fieldType;
      return {
        id: t(f?.id),
        fieldId: t(f?.fieldId),
        label: t(f?.labelName),
        type,
        options: (Array.isArray(f?.options) ? f.options : []).map((o) => t(o?.optionValue)).filter(Boolean),
        value: t(f?.fieldValue),
        url: t(f?.customFieldURL),
        attachmentType: t(f?.attachmentType) || "I",
        purpose: t(f?.purpose),
      };
    })
    .filter((f) => f.id && f.label && CUSTOM_TYPES.includes(f.type));
}
/** The value as a person reads it: a dropdown's option label, a checkbox list joined with commas. */
export function customDisplayValue(field) {
  if (field.type === "dropdown") return field.options.find((o) => customOptionKey(o) === field.value) || field.value;
  if (field.type === "checkbox") return field.value.split(",").map((x) => x.trim()).filter(Boolean).join(", ");
  return field.value;
}
