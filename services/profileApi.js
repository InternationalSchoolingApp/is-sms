"use server";

import { randomUUID } from "node:crypto";
import { backendRequest } from "@/utils/backendRequest";

/**
 * My Profile (read-only, P1). One Server Action that loads everything the page shows:
 *
 * 1. POST {school}/dashboard/profile-view-content-new (ClientDashboardCommonController ->
 *    DashboardSchoolUtil.profileViewContentNew), body = encodePayload({ userId, actionType: "1a", studentStandardId }).
 *    The user is ALWAYS the signed-in one (from the token session), never an id from the browser; the backend checks
 *    it again (UserAccessGuard). Answer: { status: "1"|"0", message, rightToEdit, rightToUpload, userRole,
 *    standardStatus, withdrawnRequest, enrollmentDetails, profileData: { profileContactVerification,
 *    studentProfile: [personal, parents, academic, timing, sports, reserveSeat, schoolEmail, registration] } }.
 * 2. POST {school}/api/v1/common/masters-bulk: the profile only has country / state / city ids, so their names come
 *    from the same masters lists the signup wizard uses (COUNTRIES-LIST, STATES-LIST per country, CITIES-LIST per state),
 *    all in one request. A failure here only leaves the ids unnamed.
 * 3. POST {school}/dashboard/student/withdrawal-eligibility: section 7 (Withdrawal Request) is only for a student
 *    without a parent account (selfEligible), as on the existing page.
 *
 * Returns { ok: true, data: { profile, places: { countries, states, cities } (id -> name), withdrawalEligible } }
 * or { ok: false, code, message, sessionExpired? } (utils/backendRequest.js); never throws.
 */
export async function getMyProfile({ studentStandardId } = {}) {
  const loaded = await backendRequest({
    path: "dashboard/profile-view-content-new",
    buildBody: (me) => ({ userId: me.userId, actionType: "1a", studentStandardId: Number(studentStandardId) || 0 }),
  });
  if (!loaded.ok) return loaded;
  const profile = loaded.data;
  if (String(profile.status) !== "1" || !Array.isArray(profile?.profileData?.studentProfile)) {
    return { ok: false, code: String(profile.statusCode ?? profile.status ?? "UNKNOWN"), message: profile.message || "Your profile could not be loaded." };
  }

  const [places, withdrawalEligible] = await Promise.all([loadPlaceNames(profile.profileData.studentProfile), loadWithdrawalEligibility()]);
  return { ok: true, data: { profile, places, withdrawalEligible } };
}

const idOf = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const unique = (values) => [...new Set(values.map(idOf).filter(Boolean))];

async function loadPlaceNames(studentProfile) {
  const [personal = {}, parents = {}, academic = {}] = studentProfile;
  const countryIds = unique([personal.country, parents.motherCountry, parents.fatherCountry, parents.guardianCountry]);
  const stateIds = unique([personal.state, parents.motherState, parents.fatherState, parents.guardianState]);
  const needCountries = countryIds.length > 0 || idOf(academic.previousCurrentSchoolCountry);
  const lookups = [
    ...(needCountries ? [{ kind: "countries", id: 0, requestData: { requestKey: "COUNTRIES-LIST" } }] : []),
    ...countryIds.map((id) => ({ kind: "states", id, requestData: { requestKey: "STATES-LIST", requestValue: String(id) } })),
    ...stateIds.map((id) => ({ kind: "cities", id, requestData: { requestKey: "CITIES-LIST", requestValue: String(id) } })),
  ];
  const places = { countries: {}, states: {}, cities: {} };
  if (!lookups.length) return places;

  const result = await backendRequest({
    path: "api/v1/common/masters-bulk",
    checkSession: null,
    buildBody: (me) => ({
      // The masters API asks for a request hash (any non-empty value, as the signup wizard's getHash()).
      authentication: { hash: randomUUID(), schoolId: me.schoolNumericId, schoolUUID: me.schoolUUID, userType: "STUDENT", userId: me.userId },
      requestDataList: lookups.map((l) => l.requestData),
    }),
  });
  if (!result.ok || !Array.isArray(result.data)) return places;
  result.data.forEach((answer, i) => {
    const kind = lookups[i]?.kind;
    (answer?.mastersData?.[kind] || []).forEach((item) => {
      if (item?.key != null) places[kind][String(item.key)] = item.value;
    });
  });
  return places;
}

async function loadWithdrawalEligibility() {
  // This endpoint still names the user by the legacy UNIQUEUUID header (the token decides who it really is).
  const result = await backendRequest({
    path: "dashboard/student/withdrawal-eligibility",
    headers: (me) => ({ UNIQUEUUID: me.uniqueId }),
    buildBody: () => ({}),
  });
  return Boolean(result.ok && String(result.data?.status) === "1" && result.data?.selfEligible === true);
}
