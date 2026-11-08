import { format, isValid, parse } from "date-fns";
import { customFieldsOf, dialCode } from "@/utils/profileModel";
import { phoneProblem } from "@/utils/profilePhone";

/**
 * My Profile P2 editing model (pure, no React). The editor keeps a flat `draft` of every field a student may change,
 * built from the raw profile-view-content-new answer, and saves it in "units": one unit = one backend
 * requestProfileData (keyId) of update-user-profile-content / -bulk (profileViewNew.js getRequestForUpdateProfile).
 * Several inputs can make one unit (phone = number + country code + WhatsApp; place = country + state + city;
 * a parent's name = first + middle + last), exactly as the existing page sends them.
 *
 * Locked for students (shown read-only): own DOB and e-mail, parent e-mails, primary relation (plan section 19.3), and
 * the parents' names (the existing page disables them for a student: profileViewNewContent.js motherNameElement …).
 *
 * Validation follows the existing page's validateFields (profileViewNew.js): a changed field may not be saved empty
 * ("Either field value is invalid or empty."), except middle / last names, the alternate phone and the progress
 * report; e-mails and links use its validateEmail / isValidUrl; phones its per-country check (utils/profilePhone.js).
 */

export const PARENTS = [
  { kind: "mother", type: "Mother", title: "Mother's Detail", nameKey: "motherName" },
  { kind: "father", type: "Father", title: "Father's Detail", nameKey: "fatherFirstName" },
  { kind: "guardian", type: "Guardian", title: "Guardian's Details", nameKey: "guardianFirstName" },
];

// masterContent.js getGenderContent.
export const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "DONOTWANTTOSPECIFY", label: "Do Not Want To Specify" },
];

// Social links in the existing page's order (profileViewNewContent.js socialMedaiLinksContent); custom links last.
const SOCIAL_ORDER = ["Instagram", "YouTube", "LinkedIn", "Facebook", "Twitter", "TikTok", "Telegram"];
const socialRank = (label) => {
  const i = SOCIAL_ORDER.indexOf(label);
  return i < 0 ? 999 : i;
};
/**
 * The social links the page shows (getSocialMediaFields): every standard one (master id > 0) and the student's own
 * active custom links (master id 0, status Y). Each gets its own draft key: standard ones by master id, custom ones by
 * their userSocialMediaId (all custom links share master id 0).
 */
export function visibleSocialLinks(list) {
  return (Array.isArray(list) ? list : [])
    .filter((s) => Number(s?.socialMediaMasterId) > 0 || (String(s?.socialMediaMasterId) === "0" && String(s?.status || "").toUpperCase() === "Y"))
    .map((s) => {
      const masterId = String(Number(s.socialMediaMasterId) || 0);
      const custom = masterId === "0";
      const urlKey = Object.keys(s).find((k) => k.endsWith("_URL"));
      return {
        id: custom ? `c${s.userSocialMediaId}` : masterId,
        masterId,
        custom,
        userSocialMediaId: custom ? String(s.userSocialMediaId || "") : "",
        label: String(s.socMedLabel || "").trim(),
        url: urlKey ? String(s[urlKey] || "").trim() : "",
      };
    })
    .filter((s) => s.label && (!s.custom || s.userSocialMediaId))
    .sort((a, b) => socialRank(a.label) - socialRank(b.label));
}

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

/** Every section's custom fields that are edited as values (files are uploaded at once, not drafted). */
function editableCustomFields(sp) {
  return [0, 1, 2, 4].flatMap((i) => customFieldsOf(sp?.[i]?.customFields)).filter((f) => f.type !== "file");
}

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
      .map((h) => text(h.hobbiesLabel))
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
  visibleSocialLinks(p.socialMedia).forEach((s) => {
    draft[`social.${s.id}`] = s.url;
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
  editableCustomFields(sp).forEach((f) => {
    draft[`custom.${f.id}`] = f.value;
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
    // A hobby is identified by its label: saved ones carry their own id, but all not-yet-saved ones have id 0.
    hobbies: (Array.isArray(p.hobbies) ? p.hobbies : [])
      .map((h) => ({ id: text(h.hobbiesLabel), hobbyId: text(h.hobbiesId) || "0", label: text(h.hobbiesLabel) }))
      .filter((h) => h.id),
    social: visibleSocialLinks(p.socialMedia),
    customFields: editableCustomFields(sp),
  };
}

// "+965" for a phone's ISO code: the countries list (extra = ISO2, extra1 = "+ISD") first, then intl-tel-input data.
function isdFor(iso, countries) {
  const hit = (countries || []).find((c) => text(c.extra).toLowerCase() === iso);
  const code = text(hit?.extra1) || dialCode(iso);
  return code.replace(/^\+/, "");
}

// jquery.commonValidation.js validateEmail / isValidUrl.
const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
export function isValidUrl(value) {
  const url = text(value);
  if (!/^(https?:\/\/)?(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d+)?(\/.*)?$/.test(url)) return false;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `http://${url}`);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname !== "";
  } catch {
    return false;
  }
}
export const EMPTY_MESSAGE = "Either field value is invalid or empty.";
const required = (value) => (text(value) ? null : EMPTY_MESSAGE);
const linkProblem = (value) => (text(value) && isValidUrl(value) ? null : "Invalid URL.");

// The country's name for phone messages: the countries list (extra = ISO2, value = name).
const countryName = (iso, countries) => text((countries || []).find((c) => text(c.extra).toLowerCase() === iso)?.value);

function phoneError(number, iso, isRequired, c = {}) {
  return phoneProblem({ number, iso, required: isRequired, utils: c.phoneUtils, enabled: c.phoneCheckOn !== false, countryName: countryName(iso, c.countries) });
}

/**
 * Every save unit: { id, keys (draft keys it covers), confirm? (warning before saving), validate(draft, ctx), build(draft, ctx) }.
 * ctx = buildEditContext + { countries, phoneUtils, phoneCheckOn } (hooks/useProfileEditor.js).
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
      validate: (d, c) => phoneError(d.phone, d.phoneIso, true, c),
      build: (d, c) => ({ keyId: "phoneNumber", fieldValue: d.phone, countryCode: d.phoneIso, countryIsdCode: isdFor(d.phoneIso, c.countries), contactWhatsAppStatus: yn(d.phoneWa) }),
    },
    {
      id: "altPhone",
      keys: ["altPhone", "altPhoneIso", "altPhoneWa"],
      validate: (d, c) => phoneError(d.altPhone, d.altPhoneIso, false, c),
      build: (d, c) => ({ keyId: "altPhoneNumber", fieldValue: d.altPhone, countryCode: d.altPhoneIso, countryIsdCode: isdFor(d.altPhoneIso, c.countries), contactWhatsAppStatus: yn(d.altPhoneWa) }),
    },
    { id: "altEmail", keys: ["altEmail"], validate: (d) => (EMAIL_RE.test(text(d.altEmail)) ? null : EMPTY_MESSAGE), build: (d) => ({ keyId: "altEmailId", fieldValue: d.altEmail }) },
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
    { id: "address", keys: ["address"], validate: (d) => required(d.address), build: (d) => ({ keyId: "address", fieldValue: d.address }) },
    {
      id: "hobbies",
      keys: ["hobbies"],
      // Ticked hobbies as "id~label"; a hobby the student typed ("Add other hobbies") is not in the list yet: "0~label".
      build: (d, c) => {
        const chosen = d.hobbies ? d.hobbies.split(",").filter(Boolean) : [];
        const known = new Map(c.hobbies.map((h) => [h.id, h]));
        return { keyId: "hobbies", hobbiesList: chosen.map((label) => `${known.get(label)?.hobbyId || "0"}~${label}`) };
      },
    },
    ...ctx.social.map((s) => ({
      id: `social.${s.id}`,
      keys: [`social.${s.id}`],
      validate: (d) => linkProblem(d[`social.${s.id}`]),
      build: (d) => ({ keyId: "socialMedia", fieldValue: `${s.masterId}~${text(d[`social.${s.id}`])}~${s.label}` }),
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
          // Parent phones are mandatory on the existing page (MANDATORY_PHONE_FIELDS).
          validate: (d, c) => phoneError(d[k("phone")], d[k("phoneIso")], true, c),
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
        { id: k("facebookUnit"), keys: [k("facebook")], validate: (d) => linkProblem(d[k("facebook")]), build: (d) => ({ keyId: `${kind}Facebook`, faceBook: d[k("facebook")], parentType: type }) },
        {
          id: k("place"),
          keys: [k("country"), k("state"), k("city")],
          validate: (d) => required(d[k("country")]),
          build: (d) => ({ keyId: `${kind}Country`, parentType: type, countryId: Number(d[k("country")]) || null, stateId: Number(d[k("state")]) || null, cityId: Number(d[k("city")]) || null }),
        },
        { id: k("occupationUnit"), keys: [k("occupation")], validate: (d) => required(d[k("occupation")]), build: (d) => ({ keyId: "occupation", fieldValue: d[k("occupation")], parentType: type }) },
        { id: k("dobUnit"), keys: [k("dob")], validate: (d) => required(d[k("dob")]), build: (d) => ({ keyId: "parentDob", fieldValue: d[k("dob")], parentType: type }) },
      ];
    }),
    { id: "anniversary", keys: ["anniversary"], validate: (d) => required(d.anniversary), build: (d) => ({ keyId: "weddingAnniversaryDate", fieldValue: d.anniversary }) },
    {
      id: "communication",
      keys: ["commWa", "commCall", "commEmail"],
      validate: (d) => (!d.commWa && !d.commCall && !d.commEmail ? "Please keep at least one way to reach you." : null),
      build: (d) => ({ keyId: "preferredcommunication", fieldValue: `W=${yn(d.commWa)}|C=${yn(d.commCall)}|E=${yn(d.commEmail)}` }),
    },
    // P3 · Academic
    { id: "prevSchool", keys: ["prevSchool"], validate: (d) => required(d.prevSchool), build: (d) => ({ keyId: "previousCurrentSchoolName", fieldValue: d.prevSchool }) },
    { id: "prevGrade", keys: ["prevGrade"], validate: (d) => required(d.prevGrade), build: (d) => ({ keyId: "previousCurrentGradeName", fieldValue: d.prevGrade }) },
    {
      id: "gradYear",
      keys: ["gradYear"],
      validate: (d) => (/^\d{4}$/.test(text(d.gradYear)) ? null : EMPTY_MESSAGE),
      build: (d) => ({ keyId: "previousCurrentSchoolGraduationYear", fieldValue: d.gradYear }),
    },
    { id: "prevCountry", keys: ["prevCountry"], validate: (d) => required(d.prevCountry), build: (d) => ({ keyId: "previousCurrentSchoolCountry", fieldValue: d.prevCountry }) },
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
    // School-defined custom fields: keyId customProfileFieldId, the field's id in fieldValue1 (DashboardStudentUtil
    // updateStudentProfileNewTheme). Like every other field they may not be saved empty (validateFields' else branch).
    ...(ctx.customFields || []).map((f) => ({
      id: `custom.${f.id}`,
      keys: [`custom.${f.id}`],
      validate: (d) => required(d[`custom.${f.id}`]),
      build: (d) => ({ keyId: "customProfileFieldId", fieldValue1: f.id, fieldValue: text(d[`custom.${f.id}`]) }),
    })),
  ];
  return units;
}

/** Parent / student calling times for keyId communicationPreferredSlots: [{ communicationRoleType, timings: ["HH:mm-HH:mm"] }]. */
export function callingPreferences(slots, touchedRoles) {
  const roles = [...new Set([...touchedRoles, ...slots.map((x) => x.role)])];
  return roles.map((role) => ({ communicationRoleType: role, timings: slots.filter((x) => x.role === role).map((x) => `${x.start}-${x.end}`) }));
}

export const sameValue = (a, b) => (typeof a === "boolean" || typeof b === "boolean" ? Boolean(a) === Boolean(b) : text(a) === text(b));
