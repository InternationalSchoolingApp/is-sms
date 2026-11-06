import { format, isValid, parse } from "date-fns";
import { dialCode } from "@/utils/profileModel";

/**
 * My Profile P2 editing model (pure, no React). The editor keeps a flat `draft` of every field a student may change,
 * built from the raw profile-view-content-new answer, and saves it in "units": one unit = one backend
 * requestProfileData (keyId) of update-user-profile-content / -bulk (profileViewNew.js getRequestForUpdateProfile).
 * Several inputs can make one unit (phone = number + country code + WhatsApp; place = country + state + city;
 * a parent's name = first + middle + last), exactly as the existing page sends them.
 *
 * Locked for students (shown read-only): own DOB and e-mail, parent e-mails, primary relation (plan section 19.3).
 */

export const PARENTS = [
  { kind: "mother", type: "Mother", title: "Mother's Detail", nameKey: "motherName" },
  { kind: "father", type: "Father", title: "Father's Detail", nameKey: "fatherFirstName" },
  { kind: "guardian", type: "Guardian", title: "Guardian's Details", nameKey: "guardianFirstName" },
];

export const GENDERS = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
];

export const DATE_FORMAT = "MMM dd, yyyy"; // DateUtil.STANDARD_DATE_FORMAT_ONLY

// Progress report frequency (profileViewNewContent.js profileProgressReport*): 7 / 14 / 28 days, 14 by default.
export const REPORT_TYPES = [
  { days: 7, name: "Weekly", every: "Every 7 days" },
  { days: 14, name: "Biweekly", every: "Every 14 days" },
  { days: 28, name: "Monthly", every: "Every 28 days" },
];
export function reportDays(value) {
  const v = parseInt(value, 10);
  if (v === 30) return 28;
  if (v === 15) return 14;
  return [7, 14, 28].includes(v) ? v : 14;
}
// The new frequency starts on the coming Saturday (the existing page's anchor date).
export function reportAnchor(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d;
}
export function reportRange(days, today = new Date()) {
  const start = reportAnchor(today);
  const end = new Date(start);
  end.setDate(end.getDate() + (days === 7 ? 6 : days));
  const long = (x) => format(x, "MMMM d, yyyy");
  return `${long(start)} – ${long(end)}`;
}

const text = (v) => (v == null ? "" : String(v).trim());
const yes = (v) => text(v).toUpperCase() === "Y";
const id = (v) => (Number(v) > 0 ? String(Number(v)) : "");
const yn = (v) => (v ? "Y" : "N");

export function parseProfileDate(value) {
  const v = text(value);
  if (!v) return undefined;
  const d = parse(v, DATE_FORMAT, new Date());
  return isValid(d) ? d : undefined;
}
export const formatProfileDate = (date) => (date && isValid(date) ? format(date, DATE_FORMAT) : "");

// Phone numbers are stored without the ISD; keep digits only (the existing page strips spaces).
export const phoneDigits = (value) => text(value).replace(/[^\d]/g, "");

/** The flat draft of editable values, from the raw answer (data.profile of services/profileApi.js). */
export function buildDraft(profile) {
  const sp = profile?.profileData?.studentProfile || [];
  const [p = {}, g = {}, a = {}, , s = {}] = sp;
  const standard = (Array.isArray(a.studentStandardDTO) ? a.studentStandardDTO : [])[0] || {};
  const draft = {
    firstName: text(p.firstName),
    middleName: text(p.middleName),
    lastName: text(p.lastName),
    gender: text(p.gender).toUpperCase(),
    phone: phoneDigits(p.phoneNumber),
    phoneIso: text(p.phoneNumberCountryCode).toLowerCase(),
    phoneWa: yes(p.phoneNumberWhatsAppStatus),
    altPhone: phoneDigits(p.altPhoneNumber),
    altPhoneIso: text(p.altPhoneNumberCountryCode).toLowerCase() || text(p.phoneNumberCountryCode).toLowerCase(),
    altPhoneWa: yes(p.altPhoneNumberWhatsAppStatus),
    altEmail: text(p.altEmailId),
    country: id(p.country),
    state: id(p.state),
    city: id(p.city),
    timezone: id(p.timezone),
    nationality: id(p.nationalityId),
    address: text(p.address),
    hobbies: (Array.isArray(p.hobbies) ? p.hobbies : [])
      .filter((h) => yes(h.status))
      .map((h) => text(h.hobbiesId))
      .sort()
      .join(","),
    anniversary: text(g.weddingAnniversaryDate),
    commWa: yes(g.pcWhatsappView),
    commCall: yes(g.pcCallView),
    commEmail: yes(g.pcEmailView),
    prevSchool: text(a.previousCurrentSchoolName),
    prevGrade: id(a.previousCurrentGradeId),
    gradYear: text(a.previousCurrentSchoolGraduationYear),
    prevCountry: id(a.previousCurrentSchoolCountry),
    reportType: String(reportDays(standard.reportType)),
    clubs: (Array.isArray(s.sportsAndECList) ? s.sportsAndECList : [])
      .filter((c) => yes(c.assignActiveStudent))
      .map((c) => text(c.sportEcId))
      .sort()
      .join(","),
  };
  (Array.isArray(p.socialMedia) ? p.socialMedia : []).forEach((s) => {
    const key = Object.keys(s || {}).find((k) => k.endsWith("_URL"));
    draft[`social.${s.socialMediaMasterId}`] = key ? text(s[key]) : "";
  });
  PARENTS.forEach(({ kind }) => {
    const first = kind === "mother" ? g.motherName : g[`${kind}FirstName`];
    draft[`${kind}.first`] = text(first);
    draft[`${kind}.middle`] = text(g[`${kind}MiddleName`]);
    draft[`${kind}.last`] = text(g[`${kind}LastName`]);
    draft[`${kind}.phone`] = phoneDigits(g[`${kind}PhoneNumber`]);
    draft[`${kind}.phoneIso`] = text(g[`${kind}PhoneNumberCountryCode`]).toLowerCase() || draft.phoneIso;
    draft[`${kind}.wa`] = yes(g[`${kind}PhoneNumberWhatsAppStatus`]);
    draft[`${kind}.emergency`] = yes(kind === "guardian" ? g.guardianEmergencyNumberStatus : g[`${kind}PhoneEmergencyNumberStatus`]);
    draft[`${kind}.facebook`] = text(kind === "guardian" ? g.gurdianFacebook ?? g.guardianFacebook : g[`${kind}Facebook`]);
    draft[`${kind}.country`] = id(g[`${kind}Country`]);
    draft[`${kind}.state`] = id(g[`${kind}State`]);
    draft[`${kind}.city`] = id(g[`${kind}City`]);
    draft[`${kind}.occupation`] = text(g[`${kind}Occupation`]);
    draft[`${kind}.dob`] = text(g[`${kind}Dob`]);
  });
  return draft;
}

/** Labels the save requests need besides the draft: hobby labels, social link names, the primary relation. */
export function buildEditContext(profile) {
  const sp = profile?.profileData?.studentProfile || [];
  const [p = {}, g = {}, , , s = {}] = sp;
  return {
    relationType: text(g.relationType),
    clubs: (Array.isArray(s.sportsAndECList) ? s.sportsAndECList : []).map((c) => ({ id: text(c.sportEcId), label: text(c.sEclabel) })).filter((c) => c.id && c.label),
    hobbies: (Array.isArray(p.hobbies) ? p.hobbies : []).map((h) => ({ id: text(h.hobbiesId), label: text(h.hobbiesLabel) })).filter((h) => h.id),
    social: (Array.isArray(p.socialMedia) ? p.socialMedia : [])
      .map((s) => ({ id: String(s.socialMediaMasterId), label: text(s.socMedLabel) }))
      .filter((s) => s.id && s.id !== "undefined"),
  };
}

// "+965" for a phone's ISO code: the countries list (extra = ISO2, extra1 = "+ISD") first, then intl-tel-input data.
function isdFor(iso, countries) {
  const hit = (countries || []).find((c) => text(c.extra).toLowerCase() === iso);
  const code = text(hit?.extra1) || dialCode(iso);
  return code.replace(/^\+/, "");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?[^\s/$.?#].[^\s]*$/i;

function phoneError(number, iso, required) {
  if (!number) return required ? "Phone number is required." : null;
  if (number.length < 5 || number.length > 15) return "Please enter a valid phone number.";
  if (!iso) return "Please choose the country code.";
  return null;
}

/**
 * Every save unit: { id, keys (draft keys it covers), confirm? (warning before saving), validate(draft), build(draft, ctx) }.
 * build() returns the requestProfileData for services/profileSaveApi.js (without studentStandardId).
 */
export function buildUnits(ctx) {
  const units = [
    { id: "firstName", keys: ["firstName"], validate: (d) => (!d.firstName ? "First name is required." : null), build: (d) => ({ keyId: "firstName", fieldValue: d.firstName }) },
    { id: "middleName", keys: ["middleName"], build: (d) => ({ keyId: "middleName", fieldValue: d.middleName }) },
    { id: "lastName", keys: ["lastName"], validate: (d) => (!d.lastName ? "Last name is required." : null), build: (d) => ({ keyId: "lastName", fieldValue: d.lastName }) },
    { id: "gender", keys: ["gender"], validate: (d) => (!d.gender ? "Please choose a gender." : null), build: (d) => ({ keyId: "gender", fieldValue: d.gender }) },
    {
      id: "phone",
      keys: ["phone", "phoneIso", "phoneWa"],
      validate: (d) => phoneError(d.phone, d.phoneIso, true),
      build: (d, c) => ({ keyId: "phoneNumber", fieldValue: d.phone, countryCode: d.phoneIso, countryIsdCode: isdFor(d.phoneIso, c.countries), contactWhatsAppStatus: yn(d.phoneWa) }),
    },
    {
      id: "altPhone",
      keys: ["altPhone", "altPhoneIso", "altPhoneWa"],
      validate: (d) => phoneError(d.altPhone, d.altPhoneIso, false),
      build: (d, c) => ({ keyId: "altPhoneNumber", fieldValue: d.altPhone, countryCode: d.altPhoneIso, countryIsdCode: isdFor(d.altPhoneIso, c.countries), contactWhatsAppStatus: yn(d.altPhoneWa) }),
    },
    { id: "altEmail", keys: ["altEmail"], validate: (d) => (d.altEmail && !EMAIL_RE.test(d.altEmail) ? "Please enter a valid email." : null), build: (d) => ({ keyId: "altEmailId", fieldValue: d.altEmail }) },
    {
      id: "place",
      keys: ["country", "state", "city"],
      validate: (d) => (!d.country ? "Please choose a country." : !d.state ? "Please choose a state." : !d.city ? "Please choose a city." : null),
      build: (d) => ({ keyId: "countrySection", countryId: Number(d.country), stateId: Number(d.state), cityId: Number(d.city) }),
    },
    {
      id: "timezone",
      keys: ["timezone"],
      confirm: "You are about to change your timezone. All your future booked classes will move to the new timezone.",
      validate: (d) => (!d.timezone ? "Please choose a timezone." : null),
      build: (d) => ({ keyId: "timezone", fieldValue: d.timezone }),
    },
    {
      id: "nationality",
      keys: ["nationality"],
      confirm: "You are about to change your nationality. Do you want to continue?",
      validate: (d) => (!d.nationality ? "Please choose a nationality." : null),
      // The existing page saves the chosen country's name.
      build: (d, c) => ({ keyId: "nationality", fieldValue: text((c.countries || []).find((x) => x.key === d.nationality)?.value) }),
    },
    { id: "address", keys: ["address"], build: (d) => ({ keyId: "address", fieldValue: d.address }) },
    {
      id: "hobbies",
      keys: ["hobbies"],
      build: (d, c) => {
        const chosen = new Set(d.hobbies ? d.hobbies.split(",") : []);
        return { keyId: "hobbies", hobbiesList: c.hobbies.filter((h) => chosen.has(h.id)).map((h) => `${h.id}~${h.label}`) };
      },
    },
    ...ctx.social.map((s) => ({
      id: `social.${s.id}`,
      keys: [`social.${s.id}`],
      validate: (d) => (d[`social.${s.id}`] && !URL_RE.test(d[`social.${s.id}`]) ? "Please enter a valid link." : null),
      build: (d) => ({ keyId: "socialMedia", fieldValue: `${s.id}~${d[`social.${s.id}`]}~${s.label}` }),
    })),
    ...PARENTS.flatMap(({ kind, type, nameKey }) => {
      const k = (f) => `${kind}.${f}`;
      const parent = { parentType: type, primaryParent: ctx.relationType };
      return [
        {
          id: k("name"),
          keys: [k("first"), k("middle"), k("last")],
          build: (d) => ({ keyId: nameKey, firstName: d[k("first")], middleName: d[k("middle")], lastName: d[k("last")], ...parent }),
        },
        {
          id: k("phoneUnit"),
          keys: [k("phone"), k("phoneIso"), k("wa"), k("emergency")],
          validate: (d) => phoneError(d[k("phone")], d[k("phoneIso")], false),
          build: (d, c) => ({
            keyId: `${kind}PhoneNumber`,
            fieldValue: d[k("phone")],
            countryCode: d[k("phoneIso")],
            countryIsdCode: isdFor(d[k("phoneIso")], c.countries),
            contactWhatsAppStatus: yn(d[k("wa")]),
            emergencyContactStatus: yn(d[k("emergency")]),
            ...parent,
          }),
        },
        { id: k("facebookUnit"), keys: [k("facebook")], build: (d) => ({ keyId: `${kind}Facebook`, faceBook: d[k("facebook")], parentType: type }) },
        {
          id: k("place"),
          keys: [k("country"), k("state"), k("city")],
          build: (d) => ({ keyId: `${kind}Country`, parentType: type, countryId: Number(d[k("country")]) || null, stateId: Number(d[k("state")]) || null, cityId: Number(d[k("city")]) || null }),
        },
        { id: k("occupationUnit"), keys: [k("occupation")], build: (d) => ({ keyId: "occupation", fieldValue: d[k("occupation")], parentType: type }) },
        { id: k("dobUnit"), keys: [k("dob")], build: (d) => ({ keyId: "parentDob", fieldValue: d[k("dob")], parentType: type }) },
      ];
    }),
    { id: "anniversary", keys: ["anniversary"], build: (d) => ({ keyId: "weddingAnniversaryDate", fieldValue: d.anniversary }) },
    {
      id: "communication",
      keys: ["commWa", "commCall", "commEmail"],
      validate: (d) => (!d.commWa && !d.commCall && !d.commEmail ? "Please keep at least one way to reach you." : null),
      build: (d) => ({ keyId: "preferredcommunication", fieldValue: `W=${yn(d.commWa)}|C=${yn(d.commCall)}|E=${yn(d.commEmail)}` }),
    },
    // P3 · Academic
    { id: "prevSchool", keys: ["prevSchool"], build: (d) => ({ keyId: "previousCurrentSchoolName", fieldValue: d.prevSchool }) },
    { id: "prevGrade", keys: ["prevGrade"], build: (d) => ({ keyId: "previousCurrentGradeName", fieldValue: d.prevGrade }) },
    {
      id: "gradYear",
      keys: ["gradYear"],
      validate: (d) => (d.gradYear && !/^\d{4}$/.test(d.gradYear) ? "Please choose a year." : null),
      build: (d) => ({ keyId: "previousCurrentSchoolGraduationYear", fieldValue: d.gradYear }),
    },
    { id: "prevCountry", keys: ["prevCountry"], build: (d) => ({ keyId: "previousCurrentSchoolCountry", fieldValue: d.prevCountry }) },
    {
      id: "reportType",
      keys: ["reportType"],
      confirm: "Your current report frequency stays active until its end date. The new one starts only after the current period ends.",
      build: (d) => ({ keyId: "progressReportType", fieldValue: format(reportAnchor(), DATE_FORMAT), reportType: reportDays(d.reportType) }),
    },
    // P3 · Clubs
    {
      id: "clubs",
      keys: ["clubs"],
      build: (d) => ({ keyId: "extracurricular", sportsAndEcList: d.clubs ? d.clubs.split(",") : [] }),
    },
  ];
  return units;
}

/** Parent / student calling times for keyId communicationPreferredSlots: [{ communicationRoleType, timings: ["HH:mm-HH:mm"] }]. */
export function callingPreferences(slots, touchedRoles) {
  const roles = [...new Set([...touchedRoles, ...slots.map((x) => x.role)])];
  return roles.map((role) => ({ communicationRoleType: role, timings: slots.filter((x) => x.role === role).map((x) => `${x.start}-${x.end}`) }));
}

export const sameValue = (a, b) => (typeof a === "boolean" || typeof b === "boolean" ? Boolean(a) === Boolean(b) : text(a) === text(b));
