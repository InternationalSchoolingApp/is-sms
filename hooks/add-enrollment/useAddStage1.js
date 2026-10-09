"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getEnrollmentsGrades,
  getCountries,
  getMasters,
  getStudentDetails,
} from "@/services/studentSignupBackendApi";
import { saveAnotherChildStudentDetails } from "@/services/addEnrollmentBackendApi";
import { buildAuthentication } from "@/utils/authentication";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
import { formatDobForRequest } from "@/utils/ageValidation";
import { mapSignupStudentToFields } from "@/hooks/useStudentDetailsSignup";

/**
 * Add-Another-Student Stage 1 data hooks — kept separate from
 * hooks/useStudentDetailsSignup.js on purpose: this wizard is a brand-new
 * flow (see add-another-student roadmap + mermaid-flow docs), and must not
 * share hooks with the main enrollment flow. Separate query keys too, so
 * cache from either flow never crosses into the other.
 *
 * Underlying endpoints (getEnrollmentsGrades, getCountries, getStudentDetails)
 * are generic service wrappers reused as-is — the per-flow isolation is
 * enforced at the hook layer, not the raw fetch layer.
 */

const STATUS_SUCCESS = "1";

function toOptions(list) {
  return (list || []).map((item) => ({ value: String(item.key), label: item.value }));
}

/**
 * Learning Program dropdown — same /api/v1/common/masters endpoint as
 * countries/states/cities, with requestKey LEARNING_PROGRAM_LIST. Response
 * items land under response.mastersData.learningPrograms as MasterDTO
 * { key, value } (same shape as the other lookups).
 */
export function useAddLearningProgramOptions(context) {
  return useQuery({
    queryKey: ["add-enrollment-learning-programs", context.schoolNumericId],
    queryFn: async () => {
      const response = await getMasters(context.schoolUUID, {
        authentication: buildAuthentication(context),
        requestData: { requestKey: "LEARNING_PROGRAM_LIST" },
      });
      return toOptions(response?.mastersData?.learningPrograms);
    },
    enabled: Boolean(context.schoolNumericId),
    staleTime: 30 * 60 * 1000,
  });
}

export function useAddCountryOptions(context) {
  return useQuery({
    queryKey: ["add-enrollment-countries", context.schoolNumericId],
    queryFn: async () => {
      const response = await getCountries(context.schoolUUID, buildAuthentication(context));
      return toOptions(response?.mastersData?.countries);
    },
    enabled: Boolean(context.schoolNumericId),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Grade list for the SELECTED learning program (passed in from the form),
 * not context.learningProgram — Add Stage 1 lets the user pick the LP, so
 * the grade query must re-fire when the picker changes.
 */
export function useAddGradeOptions(context, learningProgram) {
  return useQuery({
    queryKey: ["add-enrollment-grades", context.schoolNumericId, context.enrollmentFor, learningProgram],
    queryFn: async () => {
      const response = await getEnrollmentsGrades(context.schoolUUID, {
        schoolId: context.schoolNumericId,
        enrollmentFor: context.enrollmentFor,
        learningProgram: getLearningProgramBackendValue(learningProgram),
      });
      const grades = typeof response?.grades === "string" ? JSON.parse(response.grades) : response?.grades;
      return toOptions(grades);
    },
    enabled: Boolean(context.schoolNumericId && context.enrollmentFor && learningProgram),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddStudentDetailsPrefill({ context, userId }) {
  return useQuery({
    queryKey: ["add-enrollment-student-details-prefill", userId],
    queryFn: async () => {
      const response = await getStudentDetails(context.schoolUUID, {
        studentUserId: userId,
        userId,
        signupType: "Online",
      });
      if (response?.status !== STATUS_SUCCESS) return null;
      return mapSignupStudentToFields(response.signupStudent);
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * Nationality name → id resolver, local to the Add-Another-Student flow.
 * Same semantics as the main-flow helper (prefill returns the country NAME,
 * selects are keyed by country ID), reimplemented here so this hook file
 * does not depend on main-flow internals.
 */
function resolveNationalityName(countries, nationalityId) {
  const match = (countries || []).find((c) => c.value === nationalityId);
  return match ? match.label : nationalityId;
}

/**
 * Add-Another-Student Stage 1 request builder. Shape matches the backend
 * sample exactly for POST {schoolId}/api/v1/parent/child/student-details:
 * a FLAT object (NOT the main-flow {authentication, signupStudent} nested
 * envelope) carrying the 7 user-entered fields plus the ids the controller
 * needs to resolve this child + parent (parentId, userId, uniqueId). DOB
 * stays MM-DD-YYYY (formatDobForRequest); standardId goes as a number so
 * the controller doesn't have to coerce it.
 */
function buildAddSaveRequest({ fields, context, userId, uniqueId, countries }) {
  return {
    parentId: context.parentId,
    userId,
    uniqueId,
    firstName: fields.firstName,
    lastName: fields.lastName,
    dob: formatDobForRequest(fields.dob),
    gender: fields.gender,
    standardId: fields.standardId ? Number(fields.standardId) : null,
    learningProgram: getLearningProgramBackendValue(fields.learningProgram),
    nationality: resolveNationalityName(countries, fields.nationality),
  };
}

export function useAddStudentDetailsSignup({ context, userId, uniqueId, countries }) {
  return useMutation({
    mutationFn: (fields) =>
      saveAnotherChildStudentDetails(
        context.schoolUUID,
        buildAddSaveRequest({ fields, context, userId, uniqueId, countries })
      ),
  });
}
