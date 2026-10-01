"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  saveStudentDetailsAction,
  getStudentDetailsAction,
  getEnrollmentsGradesAction,
  getCountriesAction,
  getStatesAction,
  getCitiesAction,
} from "@/actions/studentSignupActions";
import { buildAuthentication, buildAuthenticatedRequest } from "@/utils/authentication";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
import { formatDobForRequest } from "@/utils/ageValidation";
import { getUtmFieldsForSignup } from "@/utils/utmCookies";

const STATUS_SUCCESS = "1";

function toOptions(list) {
  return (list || []).map((item) => ({ value: String(item.key), label: item.value }));
}

/**
 * Grade list for this enrollmentFor/learningProgram — confirmed request
 * shape is FLAT (no authentication/data envelope): SignupStudentUtil
 * .getEnrollmentsGrades() reads schoolId/enrollmentFor/learningProgram
 * straight off the decoded payload root, unlike every other endpoint in
 * this file.
 *
 * CONFIRMED BY A LIVE CALL, not guessed: unlike the masters endpoint's
 * countries/states/cities (real JSON arrays), this endpoint's `grades` field
 * is a JSON-STRING of the array (`seriUtil.objectToJson(...)` on the Java
 * side, then `response.put("grades", <that string>)` — never parsed back
 * into a real JSON value before being put on the response). Must be
 * JSON.parse()'d here or every render throws "list.map is not a function"
 * and the query silently lands in an error state.
 */
export function useGradeOptions(context) {
  return useQuery({
    queryKey: ["signup-grades", context.schoolNumericId, context.enrollmentFor, context.learningProgram],
    queryFn: async () => {
      const response = await getEnrollmentsGradesAction(context.schoolUUID, {
        schoolId: context.schoolNumericId,
        enrollmentFor: context.enrollmentFor,
        learningProgram: getLearningProgramBackendValue(context.learningProgram),
      });
      const grades = typeof response?.grades === "string" ? JSON.parse(response.grades) : response?.grades;
      return toOptions(grades);
    },
    enabled: Boolean(context.schoolNumericId && context.enrollmentFor),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCountryOptions(context) {
  return useQuery({
    queryKey: ["signup-countries", context.schoolNumericId],
    queryFn: async () => {
      const response = await getCountriesAction(context.schoolUUID, buildAuthentication(context));
      return toOptions(response?.mastersData?.countries);
    },
    enabled: Boolean(context.schoolNumericId),
    staleTime: 30 * 60 * 1000,
  });
}

export function useStateOptions(context, countryId) {
  return useQuery({
    queryKey: ["signup-states", context.schoolNumericId, countryId],
    queryFn: async () => {
      const response = await getStatesAction(context.schoolUUID, buildAuthentication(context), countryId);
      return toOptions(response?.mastersData?.states);
    },
    enabled: Boolean(context.schoolNumericId && countryId),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCityOptions(context, stateId) {
  return useQuery({
    queryKey: ["signup-cities", context.schoolNumericId, stateId],
    queryFn: async () => {
      const response = await getCitiesAction(context.schoolUUID, buildAuthentication(context), stateId);
      return toOptions(response?.mastersData?.cities);
    },
    enabled: Boolean(context.schoolNumericId && stateId),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Converts a get-student-details response's `signupStudent`
 * (SignupStudentDTO, confirmed against SignupUtil.convertToSignupStudentDTO)
 * into Stage1StudentDetails' own field shape, so a returning student sees
 * whatever they already saved instead of a blank form. `dob` comes back as
 * "MMM dd, yyyy" (DateUtil.STANDARD_DATE_FORMAT_ONLY, e.g. "Sep 10, 2024") —
 * unambiguous for the JS Date constructor. IDs come back as numbers; every
 * select in this app keys options by String(item.key), so they're
 * stringified here too.
 */
export function mapSignupStudentToFields(signupStudent) {
  if (!signupStudent) return null;
  const dob = signupStudent.dob ? new Date(signupStudent.dob) : null;
  return {
    firstName: signupStudent.firstName || "",
    middleName: signupStudent.middleName || "",
    lastName: signupStudent.lastName || "",
    dob: dob && !Number.isNaN(dob.getTime()) ? dob : null,
    gender: signupStudent.gender || "",
    standardId: signupStudent.standardId ? String(signupStudent.standardId) : "",
    countryId: signupStudent.countryId ? String(signupStudent.countryId) : "",
    stateId: signupStudent.stateId ? String(signupStudent.stateId) : "",
    cityId: signupStudent.cityId ? String(signupStudent.cityId) : "",
    // courseProviderId is set server-side at account creation (never chosen
    // in this UI) — carried through prefill -> submit unchanged, same as the
    // legacy JS reading it off a hidden #courseProviderId field.
    courseProviderId: signupStudent.courseProviderId ?? "",
    // Backend's full LearningProgramConstant value (e.g. "DUAL_DIPLOMA") —
    // useEnrollmentContext reads this to resolve the short URL code for a
    // resumed session, since the session itself doesn't carry it.
    learningProgram: signupStudent.learningProgram || "",
    // Backend stores/returns nationality as the country NAME string (legacy
    // getNationalityOption() renders <option value="{name}">), but this
    // form's Nationality select is keyed by country ID like every other
    // select here (see toOptions()) — Stage1StudentDetails remaps this name
    // to the matching country ID once the country list has loaded.
    nationality: signupStudent.nationality || "",
    communicationEmail: signupStudent.communicationEmail || "",
    contactNumber: signupStudent.contactNumber || "",
    countryCode: signupStudent.countryCode || "",
    // countryIsdCode2 (ISO2, e.g. "IN") is what intl-tel-input needs to
    // restore the right flag — see PhoneNumberField's initialCountry prop.
    countryIsdCode: signupStudent.countryIsdCode2 || signupStudent.countryIsdCode || "",
    studyingSchoolName: signupStudent.studyingSchoolName || "",
    studyingGradeId: signupStudent.studyingGradeId ? String(signupStudent.studyingGradeId) : "",
    countryIdOfSchool: signupStudent.countryIdOfSchool ? String(signupStudent.countryIdOfSchool) : "",
  };
}

/**
 * Prefill for Stage 1 — get-student-details, confirmed at
 * SignupStudentUtil.java:5458. Request is StudentRequestDTO; only
 * studentUserId/userId/signupType are read for an in-progress student
 * (callFrom is only checked when equal to "signup", so omitting it here is
 * deliberate — this call must never trigger the
 * REDIRECT_TO_DASHBOOARD/registration-completed branch on a normal resume).
 * `studentUserId` and `userId` are the same value post-login: the backend
 * only diverges them for a pre-login Offline continuation, not our flow.
 *
 * signupType is hardcoded "Online" — the only account-creation mode wired
 * up so far (AccountFormOfflineB2B exists but Offline resume into this
 * page isn't); revisit once Offline reaches Stage 1.
 */
export function useStudentDetailsPrefill({ context, userId }) {
  return useQuery({
    queryKey: ["student-details-prefill", userId],
    queryFn: async () => {
      const response = await getStudentDetailsAction(context.schoolUUID, {
        studentUserId: userId,
        userId,
        signupType: "Online",
      });
      if (response?.status !== STATUS_SUCCESS) return null;
      return mapSignupStudentToFields(response.signupStudent);
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * Builds the save-student-details request, matching getRequestForStudent()
 * in signupStudentStage1.js field-for-field (request DTO confirmed at
 * SignupStudentUtil.java:1605 — SaveStudentDetailsRequestDTO { authentication,
 * signupStudent }). nationality/communicationEmail/contactNumber vs.
 * studyingSchoolName/studyingGradeId/countryIdOfSchool are mutually
 * exclusive, gated on isDualDiploma — see validateStudentDetails() in
 * utils/studentSignupValidation.js for the matching required-field rules.
 */
// Nationality select is keyed by country ID (toOptions()), but the backend's
// signupStudent.nationality is the country NAME string (getNationalityOption()
// in signupStudentContent.js renders <option value="{country name}">, not the
// id) — resolve the selected id back to its label from the same countries
// list Stage1StudentDetails already loads for the dropdown, matching how the
// legacy page reuses one countries list for both the Country and Nationality
// selects, just keyed differently.
function resolveNationalityName(countries, nationalityId) {
  const match = (countries || []).find((c) => c.value === nationalityId);
  return match ? match.label : nationalityId;
}

function buildSaveStudentDetailsRequest({ fields, context, userId, isDualDiploma, countries }) {
  const signupStudent = {
    themeType: "theme2",
    firstName: fields.firstName,
    middleName: fields.middleName || "",
    lastName: fields.lastName,
    dob: formatDobForRequest(fields.dob),
    gender: fields.gender,
    countryId: fields.countryId,
    stateId: fields.stateId,
    cityId: fields.cityId,
    standardId: fields.standardId || null,
    learningProgram: getLearningProgramBackendValue(context.learningProgram),
    enrollmentFor: context.enrollmentFor,
    // Both set server-side by the backend at account creation
    // (StudentStandard.courseProviderId / studyCenter=schoolId) — getRequestForStudent()
    // just reflects them back, never computes them; same here.
    courseProviderId: fields.courseProviderId,
    studyCenter: context.schoolNumericId,
    ...getUtmFieldsForSignup(),
  };

  // communicationEmail/nationality/countryCode/countryIsdCode/contactNumber
  // are sent for EVERY learning program, Dual Diploma included — legacy's
  // getStudentDetailsContent() renders those fields unconditionally (only
  // the studyingSchoolName/studyingGradeId/countryIdOfSchool block is
  // wrapped in the hidden-by-default `.dual-diploma` container, shown
  // ADDITIONALLY for Dual Diploma, not as a replacement); its own
  // validateRequestForSignupStudent() only skips REQUIRING email/phone/
  // nationality for Dual Diploma, it never drops them from the request.
  signupStudent.communicationEmail = fields.communicationEmail;
  signupStudent.nationality = resolveNationalityName(countries, fields.nationality);
  // useIntlTelInput's onChange (see PhoneNumberField) hands back
  // countryCode = ISO2 ("IN") and countryIsdCode = dial code with a
  // leading "+" ("+91") — the OPPOSITE of what these two DTO field names
  // mean on the backend: signupStudentDTO['countryCode'] is the dial code
  // (no "+", from country.dialCode) and signupStudentDTO['countryIsdCode']
  // is the lowercase ISO2 (from country.iso2). Swap and reformat here
  // rather than renaming the widget's own field names, which other
  // callers (initialCountry restore) also rely on.
  signupStudent.countryCode = fields.countryIsdCode ? fields.countryIsdCode.replace(/^\+/, "") : "";
  signupStudent.countryIsdCode = fields.countryCode ? fields.countryCode.toLowerCase() : "";
  signupStudent.contactNumber = (fields.contactNumber || "").replace(/\s+/g, "");

  if (isDualDiploma) {
    signupStudent.studyingSchoolName = fields.studyingSchoolName;
    signupStudent.studyingGradeId = fields.studyingGradeId;
    signupStudent.countryIdOfSchool = fields.countryIdOfSchool;
  }

  return { authentication: buildAuthenticatedRequest(context, userId), signupStudent };
}

/**
 * `userId` is the numeric User.id — from next-auth's session.userId post-login
 * (see app/api/auth/[...nextauth]/route.js) or, for a same-session
 * continuation right after Offline/B2B account creation, that signup
 * response's own `studentUserId` field.
 */
export function useStudentDetailsSignup({ context, userId, isDualDiploma, countries }) {
  return useMutation({
    mutationFn: (fields) =>
      saveStudentDetailsAction(
        context.schoolUUID,
        buildSaveStudentDetailsRequest({ fields, context, userId, isDualDiploma, countries })
      ),
  });
}
