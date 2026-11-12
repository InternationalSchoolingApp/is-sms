"use server";

import { randomUUID } from "node:crypto";
import { getAccountSession } from "@/lib/auth/session";
import { parentPost, parentSessionUserId } from "@/services/parentApiBase";

/**
 * Parent > My Profile (legacy adminProfileContent.js renderProfilePage / adminProfile.js saveProfileDetails).
 * The signed-in parent is always the SESSION user: the ids sent to the backend never come from the browser. The Java
 * (DashboardSchoolUtil.getCommonProfileNew / saveCommonProfileNew) trusts the userId in the body, so these
 * functions are the only thing keeping a parent on their own record.
 */

const GENDERS = new Set(["MALE", "FEMALE", "TRANSGENDER", "DONOTWANTTOSPECIFY"]);
const str = (value) => (value == null ? "" : String(value));

/**
 * The parent's own profile: POST /dashboard/get-common-profile-details { userId, userIdSession } (both = the session
 * parent). Response: status "1" ok / "0" failed ("Record not found", technical glitch) / "3" session out; statusCode
 * "SUCCESS"; details { userId, userFullName, emailId, gender, contactNumber, addedDate, countryTimezoneId,
 * countryTimezone, country, state, city, countryId, stateId, cityId, dialCode, countryCode (ISO2), userName,
 * languagesKnown (comma separated ISO 639-1 codes), profileImage (URL), rightToEdit, showAppInstallPromptAdminToggle }.
 * For a PARENT role the name / email / phone / place come from the primary parent's STUDENT_RELATIONSHIP row (backend
 * rule). Only the fields the page shows are returned. null when the call failed.
 */
export async function getParentProfile({ schoolUUID }) {
  const userId = await parentSessionUserId();
  if (!userId) return null;
  const answer = await parentPost(schoolUUID, "/dashboard/get-common-profile-details", { userId: Number(userId), userIdSession: Number(userId) });
  if (!answer || typeof answer !== "object") return null;
  const d = answer.details && typeof answer.details === "object" ? answer.details : null;
  return {
    status: str(answer.status),
    message: str(answer.message),
    details: d
      ? {
          userId: d.userId ?? null,
          userFullName: str(d.userFullName),
          emailId: str(d.emailId),
          gender: str(d.gender),
          contactNumber: str(d.contactNumber),
          addedDate: str(d.addedDate),
          countryTimezoneId: d.countryTimezoneId ?? null,
          countryTimezone: str(d.countryTimezone),
          country: str(d.country),
          state: str(d.state),
          city: str(d.city),
          countryId: d.countryId === "" ? null : (d.countryId ?? null),
          stateId: d.stateId === "" ? null : (d.stateId ?? null),
          cityId: d.cityId === "" ? null : (d.cityId ?? null),
          dialCode: str(d.dialCode),
          countryCode: str(d.countryCode),
          userName: str(d.userName),
          languagesKnown: str(d.languagesKnown),
          profileImage: str(d.profileImage),
        }
      : null,
  };
}

const positiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Saves the parent's personal details: POST /dashboard/save-common-profile-details { userFullName, gender,
 * contactNumber, emailId, countryId, stateId, cityId, countryTimezone, countryTimezoneId, isdCode, userId,
 * languageKnown[] }. Response: status "1" + statusCode "SUCCESS" saved; "0" / "FAILED" (technical glitch) or user not
 * found. The backend also copies the values to the parent's PARENTS row and every child's primary-parent row.
 *
 * Verified here, not trusted from the browser: userId = the session parent; emailId = the e-mail currently on record
 * (read again from the backend; the legacy field is disabled, but this backend overwrites the e-mail with whatever it
 * is sent); required fields, ids as positive numbers, gender in the backend's enum, language codes in ISO shape.
 * Returns { ok, message } (message = the backend's, or a validation message); { ok: false, sessionOut: true } when the
 * session ended; null when the call failed.
 */
export async function saveParentProfile({ schoolUUID, values }) {
  const userId = await parentSessionUserId();
  if (!userId) return { ok: false, sessionOut: true, message: "Your session has been logged out" };
  const v = values && typeof values === "object" ? values : {};

  const name = str(v.userFullName).trim();
  if (!name) return { ok: false, message: "User name is required" };
  if (name.length > 100) return { ok: false, message: "User name can be at most 100 characters." };
  if (!GENDERS.has(str(v.gender))) return { ok: false, message: "Gender is required" };
  const countryId = positiveInt(v.countryId);
  const stateId = positiveInt(v.stateId);
  const cityId = positiveInt(v.cityId);
  if (!countryId) return { ok: false, message: "Country is required" };
  if (!stateId) return { ok: false, message: "State is required" };
  if (!cityId) return { ok: false, message: "City is required" };
  const phone = str(v.contactNumber).replace(/\D/g, "");
  if (phone.length > 20) return { ok: false, message: "Please enter a valid phone number." };
  const isdCode = str(v.isdCode).trim();
  if (isdCode && !/^\+?\d{1,6}$/.test(isdCode)) return { ok: false, message: "Please choose the country code." };
  const zone = str(v.countryTimezone).trim();
  if (!zone || zone.length > 100) return { ok: false, message: "Timezone is required" };
  const languages = Array.isArray(v.languageKnown) ? v.languageKnown.map(str) : [];
  if (languages.length > 50 || languages.some((code) => !/^[a-z]{2,3}$/.test(code))) return { ok: false, message: "Please choose valid languages." };

  const current = await getParentProfile({ schoolUUID });
  if (!current) return { ok: false, message: "Your changes could not be saved. Please try again." };
  if (current.status === "3") return { ok: false, sessionOut: true, message: "Your session has been logged out" };
  if (current.status !== "1" || !current.details) return { ok: false, message: current.message || "Your changes could not be saved. Please try again." };

  const answer = await parentPost(schoolUUID, "/dashboard/save-common-profile-details", {
    userFullName: name,
    gender: str(v.gender),
    contactNumber: phone,
    emailId: current.details.emailId,
    countryId,
    stateId,
    cityId,
    countryTimezone: zone,
    countryTimezoneId: positiveInt(v.countryTimezoneId) ?? 0,
    isdCode,
    userId: Number(userId),
    languageKnown: languages,
  });
  if (!answer || typeof answer !== "object") return null;
  if (String(answer.status) === "3") return { ok: false, sessionOut: true, message: "Your session has been logged out" };
  const ok = String(answer.status) === "1" || String(answer.statusCode).toUpperCase() === "SUCCESS";
  return { ok, message: str(answer.message) };
}

const MASTERS = {
  countries: { key: "COUNTRIES-LIST", field: "countries" },
  states: { key: "STATES-LIST", field: "states", needsId: true },
  cities: { key: "CITIES-LIST", field: "cities", needsId: true },
  timezones: { key: "TIMEZONE-LIST", field: "countryTimeZones" },
};

/**
 * One dropdown list of the profile form: POST /api/v1/common/masters-bulk { authentication, requestDataList:
 * [{ requestKey, requestValue }] } (a public master-data route; the same one the signup wizard uses). `kind` is
 * countries, states (id = country id), cities (id = state id) or timezones. Answer: [{ mastersData: { <field>: [...] },
 * message }]; rows { key (id), value (name), extra, extra1, extra2, extra3 }. Countries: extra = ISO2, extra1 = dial
 * code, extra2 = nationality. Timezones: key = timezone id, value = IANA zone, label "(extra) - extra1/extra3".
 * Returns an array of { key, value, extra, extra1, extra2, extra3 } (strings), or null when the call failed.
 */
export async function getParentProfileMaster({ schoolUUID, kind, id }) {
  const master = MASTERS[kind];
  if (!master) return null;
  const refId = positiveInt(id);
  if (master.needsId && !refId) return [];
  const session = await getAccountSession();
  const userId = session?.userId;
  if (!userId) return null;
  const answer = await parentPost(schoolUUID, "/api/v1/common/masters-bulk", {
    authentication: { hash: randomUUID(), schoolId: session.schoolNumericId, schoolUUID, userType: "COMMON", userId: Number(userId) },
    requestDataList: [{ requestKey: master.key, ...(master.needsId ? { requestValue: String(refId) } : {}) }],
  });
  const list = Array.isArray(answer) ? answer[0]?.mastersData?.[master.field] : null;
  if (!Array.isArray(list)) return null;
  return list.map((item) => ({
    key: str(item.key ?? item.id),
    value: str(item.value ?? item.timezone ?? item.name),
    extra: str(item.extra),
    extra1: str(item.extra1),
    extra2: str(item.extra2),
    extra3: str(item.extra3),
  }));
}

/**
 * Whether the app-install prompt should open for the signed-in parent: POST {UNIQUEUUID}/api/v1/dashboard/app-last-activity
 * { userId (the session parent) } (legacy checkAppActivityEligibility, which called the GET variant for the session
 * user). Answer: status 2 ok (1 = failure), showInstallModal (true when the backend sees no recent app use),
 * appUsed. Returns true only for status 2 with showInstallModal === true or appUsed === false; false otherwise (also
 * when the call failed), as legacy.
 */
export async function getParentAppInstallEligible() {
  const session = await getAccountSession();
  if (!session?.userId || !session?.uniqueId) return false;
  // This controller's first path segment is the user's UNIQUEUUID, not the school.
  const answer = await parentPost(session.uniqueId, "/api/v1/dashboard/app-last-activity", { userId: Number(session.userId) });
  if (!answer || String(answer.status) !== "2") return false;
  return answer.showInstallModal === true || answer.appUsed === false;
}
