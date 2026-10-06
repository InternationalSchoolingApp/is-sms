"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  chooseCoursesByGrade,
  choosePaymentPlan,
  getPaymentDetails,
  getRecommendedCourses,
  getStudentCommissionPayBy,
} from "@/services/studentSignupBackendApi";
import { isKnownPaymentMode } from "@/utils/studentSignupValidation";

// SeriConstant: "1" success, "0" failed, "2" exception, "3" session out.
export const STATUS_SUCCESS = "1";
export const STATUS_SESSION_OUT = "3";

function isSuccessResponse(response) {
  return String(response?.status) === STATUS_SUCCESS;
}

// standardId is part of the key: without it, changing grade on Stage 1 and
// returning to Stage 3 would keep serving the previous grade's cached
// response (staleTime: Infinity below) instead of refetching for the new one.
function courseDetailsKey(userId, standardId) {
  return ["course-details", userId, standardId == null ? "" : String(standardId)];
}

/**
 * Request for course-details-by-standard-id, matching
 * getRequestForCourseSelection() in signupStudentStage3.js — confirmed
 * against a real captured payload from the live is-rest-api app:
 * `{"userId":"25391","courseId":"","callFrom":"signup","standardId":"4",
 * "selectedSubjects":"21992,...","controlType":"","requestFromMigration":"N"}`.
 * Every key is always present, `courseId`/`controlType` included as `""`
 * when not given (not omitted) — the plain read call carries them as
 * empty strings on the confirmed-working legacy payload too, not left out
 * of the JSON entirely, so this matches that shape exactly rather than
 * relying on "missing key" and "empty string" behaving the same downstream.
 * `standardId` in particular must always be sent (Stage 1's saved grade —
 * see app/step/3/page.jsx): the JS reads it live off `#signupStage3
 * #standardId`, pre-rendered with that grade. Leaving it out entirely (as
 * this used to do) gives the backend's `GradeLearningProgramMapping` lookup
 * nothing to key on and it NPEs (surfaces as the generic "technical
 * glitch" message).
 */
function buildCourseDetailsRequest(userId, { standardId, selectedSubjects = "", controlType = "", courseId = "" } = {}) {
  const request = { userId, courseId, callFrom: "signup", standardId: standardId || "", selectedSubjects, controlType, requestFromMigration: "N" };
  return request;
}

export function useCourseDetails({ context, userId, standardId }) {
  return useQuery({
    queryKey: courseDetailsKey(userId, standardId),
    queryFn: async () => {
      const response = await chooseCoursesByGrade(context.schoolUUID, buildCourseDetailsRequest(userId, { standardId }));
      if (!response) throw new Error("course-details-by-standard-id returned no response");
      return response;
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * Local-only edit of the cached course page — no request, no save. Add/remove use
 * this so the buttons never hit course-details-by-standard-id; the accumulated
 * selection is written to the server in one call later (see flushSelection in
 * Stage3CourseSelection). Returns false when there's no cached page to edit.
 */
export function useLocalCourseUpdate({ userId, standardId }) {
  const queryClient = useQueryClient();
  return function applyLocal(updater) {
    const queryKey = courseDetailsKey(userId, standardId);
    const previous = queryClient.getQueryData(queryKey);
    if (previous === undefined) return false;
    queryClient.setQueryData(queryKey, updater(previous));
    return true;
  };
}

/** Every add/remove/upgrade/recommended change; a successful response replaces the cached page. */
export function useUpdateCourseSelection({ context, userId, standardId: activeStandardId }) {
  const queryClient = useQueryClient();
  // Write into the exact query entry this screen observes. API grade IDs
  // can differ in type or be absent from the request's update response.
  function keyForChange(change) {
    const cacheStandardId = Object.prototype.hasOwnProperty.call(change, "cacheStandardId")
      ? change.cacheStandardId
      : activeStandardId;
    return courseDetailsKey(userId, cacheStandardId);
  }
  return useMutation({
    mutationFn: ({ cacheStandardId, ...change }) =>
      chooseCoursesByGrade(context.schoolUUID, buildCourseDetailsRequest(userId, change)),
    onSuccess: (response, change) => {
      if (isSuccessResponse(response)) {
        queryClient.setQueryData(keyForChange(change), response);
      }
    },
  });
}

/**
 * showPaymentOption "Y"/"N" from get-commission-pay-by (the legacy global
 * SHOW_PAYMENT_OPTION). "N" means a partner/commission-managed enrollment:
 * fee lines and the extra-fee confirmation are hidden, and the plan is
 * saved without a payment-details round trip. The backend answers "N" for
 * any non-Online signup.
 */
export function useShowPaymentOption({ context, userId }) {
  return useQuery({
    queryKey: ["commission-pay-by", userId],
    queryFn: async () => {
      const response = await getStudentCommissionPayBy(context.schoolUUID, { userId });
      if (!response) throw new Error("get-commission-pay-by returned no response");
      return response.showPaymentOption === "Y" ? "Y" : "N";
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/**
 * recommended-courses resolves the user from the Spring session
 * (sessionUtil.getUserId() in CTECourseUtil.getRecommendedCourse), not from
 * this userId, so it answers status "3" if the SESSION cookie is missing.
 */
export function useRecommendedCourses({ context, userId }) {
  return useMutation({
    mutationFn: () =>
      getRecommendedCourses(context.schoolUUID, { userId, reloadRequired: "", requestFromMigration: "N" }),
  });
}

/**
 * Step 3 -> Step 4, mirroring handleCourseSelectionStepThreeProceed() in
 * signupStudentStage3.js: with showPaymentOption "Y", get-payment-details
 * first (this is also where the backend's mandatory-category check runs),
 * then choose-payment-plan with the plan it returns; with "N", straight to
 * choose-payment-plan with the course page's saved plan. choose-payment-plan
 * is what moves nextSessionStage to 4, so the review page (and a later
 * login) resumes at step 4. The review page lets the student change the
 * plan before paying.
 *
 * Resolves to { ok, response } where response is whichever call failed, or
 * the choose-payment-plan response on success.
 */
export function useProceedToReview({ context, userId }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseData, showPaymentOption }) => {
      let paymentMode = courseData.paymentMode;
      if (showPaymentOption === "Y") {
        // Matches getRequestForPaymentModeSelection() in signupStudentStage3.js
        // field-for-field. courseId/controlType are always sent as "" here:
        // every signup call site passes callForPaymentModeSelection(formId, '',
        // ...) — that '' lands in the courseId param (a mis-wired but
        // confirmed-consistent bit of legacy plumbing) — and controlType's
        // backing #controlType field is reset to value="" on every course-list
        // re-render, so by the time Step 3 -> Step 4 fires it's always "".
        // (Backend confirmed to not even read courseId/controlType/standardId/
        // selectedSubjects for THIS endpoint — SignupStudentUtil.getPaymentDetails
        // only uses userId/callFrom — but the request shape is kept identical
        // to legacy's rather than relying on that.)
        const details = await getPaymentDetails(context.schoolUUID, {
          userId,
          courseId: "",
          callFrom: "signup",
          standardId: courseData.standardId,
          selectedSubjects: courseData.selectedSubjectsAsString || "",
          controlType: "",
          requestFromMigration: "N",
        });
        if (details?.status !== STATUS_SUCCESS) return { ok: false, response: details };
        paymentMode = details.paymentMode;
      }
      // Same fallback the backend applies when no plan is saved yet
      // (CTECourseUtil sets PAY_YEARLY); also covers a legacy-typo'd value
      // like "nineMonthlly" already stored on the student.
      if (!isKnownPaymentMode(paymentMode)) paymentMode = "annually";
      const plan = await choosePaymentPlan(context.schoolUUID, { userId, paymentMode, requestFromMigration: "N" });
      return { ok: plan?.status === STATUS_SUCCESS, response: plan };
    },
    // The review page caches get-student-review-details with staleTime: Infinity, so a visit to
    // Step 3 from the review screen (Edit) would otherwise come back to the pre-edit courses/fees.
    // Dropping the cached entry makes the review page fetch fresh data when it mounts.
    onSuccess: (result) => {
      if (result?.ok) {
        queryClient.removeQueries({ queryKey: ["student-review-details", userId] });
      }
    },
  });
}
