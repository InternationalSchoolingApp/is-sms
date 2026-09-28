"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { saveStudentDetails, getEnrollmentsGrades, getCountries, getStates, getCities } from "@/services/studentSignupApi";
import { buildAuthentication, buildAuthenticatedRequest } from "@/utils/authentication";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
import { formatDobForRequest } from "@/utils/ageValidation";

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
      const response = await getEnrollmentsGrades(context.schoolUUID, {
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
      const response = await getCountries(context.schoolUUID, buildAuthentication(context));
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
      const response = await getStates(context.schoolUUID, buildAuthentication(context), countryId);
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
      const response = await getCities(context.schoolUUID, buildAuthentication(context), stateId);
      return toOptions(response?.mastersData?.cities);
    },
    enabled: Boolean(context.schoolNumericId && stateId),
    staleTime: 30 * 60 * 1000,
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
function buildSaveStudentDetailsRequest({ fields, context, userId, isDualDiploma }) {
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
  };

  if (isDualDiploma) {
    signupStudent.studyingSchoolName = fields.studyingSchoolName;
    signupStudent.studyingGradeId = fields.studyingGradeId;
    signupStudent.countryIdOfSchool = fields.countryIdOfSchool;
  } else {
    signupStudent.communicationEmail = fields.communicationEmail;
    signupStudent.nationality = fields.nationality;
    signupStudent.countryCode = fields.countryCode;
    signupStudent.countryIsdCode = fields.countryIsdCode;
    signupStudent.contactNumber = fields.contactNumber;
  }

  return { authentication: buildAuthenticatedRequest(context, userId), signupStudent };
}

/**
 * `userId` is the numeric User.id — from next-auth's session.userId post-login
 * (see app/api/auth/[...nextauth]/route.js) or, for a same-session
 * continuation right after Offline/B2B account creation, that signup
 * response's own `studentUserId` field.
 */
export function useStudentDetailsSignup({ context, userId, isDualDiploma }) {
  return useMutation({
    mutationFn: (fields) =>
      saveStudentDetails(context.schoolUUID, buildSaveStudentDetailsRequest({ fields, context, userId, isDualDiploma })),
  });
}
