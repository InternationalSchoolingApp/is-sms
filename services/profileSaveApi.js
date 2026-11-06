"use server";

import { randomUUID } from "node:crypto";
import { backendRequest } from "@/utils/backendRequest";

/**
 * My Profile P2: saving the student's own personal and parent/guardian details, plus the dropdown lists the
 * editor needs. Same envelope as the existing profile page (profileViewNew.js getRequestForUpdateProfile):
 *   { authentication: { hash, schoolId, schoolUUID, userType: "student", userId }, requestProfileData }        (one field)
 *   { authentication, requestProfileDataList: [requestProfileData, ...] }                                         (Bulk Save)
 * to {school}/dashboard/update-user-profile-content and /update-user-profile-bulk (ClientDashboardCommonController ->
 * DashboardStudentUtil.saveStudentProfileNewTheme). authentication.userId is always the signed-in user from the token
 * session, never a value from the browser; the backend checks it again (UserAccessGuard).
 *
 * Only the keyIds a student may change here are passed on (STUDENT_KEYS). DOB, the student's e-mail, parent e-mails
 * and the primary relation stay locked for students (plan section 19.3); the backend does not check this by role yet.
 *
 * Answers: the backend replies HTTP 200 with { status, statusCode, message }; status "0"/"2" is a failure (as the
 * existing page reads it). Returns { ok: true, data: { message } } or { ok: false, code, message, sessionExpired? }.
 */

const STUDENT_KEYS = new Set([
  "firstName",
  "middleName",
  "lastName",
  "gender",
  "phoneNumber",
  "altPhoneNumber",
  "altEmailId",
  "countrySection",
  "timezone",
  "nationality",
  "address",
  "hobbies",
  "socialMedia",
  "motherName",
  "fatherFirstName",
  "guardianFirstName",
  "motherPhoneNumber",
  "fatherPhoneNumber",
  "guardianPhoneNumber",
  "motherFacebook",
  "fatherFacebook",
  "guardianFacebook",
  "motherCountry",
  "fatherCountry",
  "guardianCountry",
  "occupation",
  "parentDob",
  "weddingAnniversaryDate",
  "preferredcommunication",
  // P3: academic + clubs + parent calling times
  "previousCurrentSchoolName",
  "previousCurrentGradeName",
  "previousCurrentSchoolCountry",
  "previousCurrentSchoolGraduationYear",
  "progressReportType",
  "extracurricular",
  "communicationPreferredSlots",
]);

// Only the fields the backend reads for these keys (RequestProfileData), so nothing else rides along.
const FIELDS = [
  "keyId",
  "fieldValue",
  "countryCode",
  "countryIsdCode",
  "countryId",
  "stateId",
  "cityId",
  "hobbiesList",
  "contactWhatsAppStatus",
  "emergencyContactStatus",
  "primaryParent",
  "parentType",
  "firstName",
  "middleName",
  "lastName",
  "faceBook",
  "reportType",
  "sportsAndEcList",
  "callingPreferences",
];

function clean(item, studentStandardId) {
  const out = { studentStandardId: Number(studentStandardId) || 0 };
  FIELDS.forEach((f) => {
    if (item[f] !== undefined) out[f] = item[f];
  });
  return out;
}

const authentication = (me) => ({ hash: randomUUID(), schoolId: me.schoolNumericId, schoolUUID: me.schoolUUID, userType: "student", userId: me.userId });

export async function saveMyProfile({ studentStandardId, items } = {}) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return { ok: false, code: "EMPTY", message: "Nothing to save." };
  const refused = list.find((item) => !STUDENT_KEYS.has(item?.keyId));
  if (refused) return { ok: false, code: "LOCKED", message: "This detail can only be changed by the school." };

  const data = list.map((item) => clean(item, studentStandardId));
  const single = data.length === 1;
  const result = await backendRequest({
    path: single ? "dashboard/update-user-profile-content" : "dashboard/update-user-profile-bulk",
    headers: (me) => ({ UNIQUEUUID: me.uniqueId }),
    buildBody: (me) => (single ? { authentication: authentication(me), requestProfileData: data[0] } : { authentication: authentication(me), requestProfileDataList: data }),
  });
  if (!result.ok) return result;
  const answer = result.data || {};
  const status = String(answer.status ?? "");
  if (status === "0" || status === "2" || status === "" || ["W001", "WPR01"].includes(String(answer.statusCode))) {
    return { ok: false, code: String(answer.statusCode || "SAVE_FAILED"), message: answer.message || "Your changes could not be saved." };
  }
  return { ok: true, data: { message: answer.message || "Saved." } };
}

const MASTER_REQUESTS = {
  countries: () => ({ requestKey: "COUNTRIES-LIST" }),
  states: (id) => ({ requestKey: "STATES-LIST", requestValue: String(id) }),
  cities: (id) => ({ requestKey: "CITIES-LIST", requestValue: String(id) }),
  timezones: () => ({ requestKey: "TIMEZONE-LIST" }),
  grades: () => ({ requestKey: "GRADES-LIST" }),
};
const MASTER_FIELD = { countries: "countries", states: "states", cities: "cities", timezones: "countryTimeZones", grades: "standards" };

/**
 * One dropdown list for the editor: countries (key, value = name, extra = ISO2, extra1 = "+ISD", extra2 = nationality),
 * states of a country, cities of a state, or time zones. Returns { ok, data: [{ key, value, extra, extra1, extra2 }] }.
 */
export async function getProfileMaster({ kind, id } = {}) {
  const build = MASTER_REQUESTS[kind];
  if (!build) return { ok: false, code: "BAD_KIND", message: "Unknown list." };
  if ((kind === "states" || kind === "cities") && !(Number(id) > 0)) return { ok: true, data: [] };
  const result = await backendRequest({
    path: "api/v1/common/masters-bulk",
    checkSession: null,
    buildBody: (me) => ({ authentication: authentication(me), requestDataList: [build(id)] }),
  });
  if (!result.ok) return result;
  const answer = Array.isArray(result.data) ? result.data[0] : null;
  const list = answer?.mastersData?.[MASTER_FIELD[kind]];
  if (!Array.isArray(list)) return { ok: false, code: "MASTERS", message: answer?.message || "The list could not be loaded." };
  return {
    ok: true,
    data: list.map((item) => ({
      key: String(item.key ?? item.id ?? ""),
      value: String(item.value ?? item.timezone ?? item.name ?? ""),
      extra: item.extra ?? null,
      extra1: item.extra1 ?? null,
      extra2: item.extra2 ?? null,
    })),
  };
}
