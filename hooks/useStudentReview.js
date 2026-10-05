"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  choosePaymentPlan,
  getAirwallexPaymentMethods,
  submitOfflinePayment,
  uploadPaymentProof,
  getPaymentGatewayOptions,
  getSignupStageStatus,
  getStudentReviewDetails,
  invokePaymentGateway,
  proceedToDashboard,
  submitApplication,
} from "@/services/studentSignupBackendApi";

// SeriConstant, same as useCourseSelection.js.
export const STATUS_SUCCESS = "1";
export const STATUS_SESSION_OUT = "3";

// statusCode values confirmed at SignupStudentUtil.java's getStudentReivewDetails/
// choosePaymentPlan — not plain success/failure, each needs its own redirect.
export const STATUS_REDIRECT_TO_DASHBOARD = "REDIRECT_TO_DASHBOOARD"; // typo confirmed at source
export const STATUS_ELIGIBLE_CUSTOM_PLAN = "ELIGIBLE_CUSTOME_PLAN"; // typo confirmed at source
export const STATUS_FLAGGED = "FLAGGED";

function reviewDetailsKey(userId, reloadRequired) {
  return ["student-review-details", userId, reloadRequired];
}

/**
 * get-student-review-details, matching getReviewAndPayRendered()'s initial
 * load in signupStudentStage3.js. `reloadRequired:"Y"` always — this page
 * is only ever entered fresh (from Stage 3's "Continue to Step 4" or a
 * stage-resume), never re-used without a reload.
 */
export function useStudentReviewDetails({ context, userId, reloadRequired = "Y" }) {
  return useQuery({
    queryKey: reviewDetailsKey(userId, reloadRequired),
    queryFn: async () => {
      const response = await getStudentReviewDetails(context.schoolUUID, {
        userId,
        reloadRequired,
        requestFromMigration: "N",
      });
      if (!response) throw new Error("get-student-review-details returned no response");
      return response;
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * choose-payment-plan, called again from the review screen when the
 * student switches plans (radio_id) before paying — same endpoint Stage 3
 * already calls via useProceedToReview, matching choosePaymentOption() in
 * signupStudentStage3.js. On success, refreshes the cached review data so
 * userPaymentDetailsId/feePaymentDetailsResponse reflect the new plan.
 */
export function useChoosePaymentPlan({ context, userId }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentMode) => choosePaymentPlan(context.schoolUUID, { userId, paymentMode, requestFromMigration: "N" }),
    onSuccess: (response) => {
      if (response?.status === STATUS_SUCCESS) {
        queryClient.invalidateQueries({ queryKey: ["student-review-details", userId] });
      }
    },
  });
}

/** SHOW_PAYMENT_OPTION=='N' branch: student/submit-application, matches callForApplicationSubmit(). */
export function useSubmitApplication({ context, userId }) {
  return useMutation({
    mutationFn: () => submitApplication(context.schoolUUID, { userId }),
  });
}

/** Offline/B2B signup type's SHOW_PAYMENT_OPTION=='N' branch: student/proceed-to-dashboard, matches callForProgressionToDashboard(). */
export function useProceedToDashboard({ context, userId }) {
  return useMutation({
    mutationFn: () => proceedToDashboard(context.schoolUUID, { userId }),
  });
}

/**
 * Background resume poll, matching getSignupStatusFinal() in
 * signupStudentStage3.js (every 180000ms/3min). Caller is responsible for
 * acting on a non-failure `redirectUri` (window.location.replace) — this
 * hook only fetches.
 */
export function useSignupStageStatusPoll({ context, uniqueId, enabled = true }) {
  // First call only after one full interval, so a page refresh doesn't hit
  // enrollment-stage-status (resume uses enrollment/process' signupPage instead).
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => setArmed(true), 180000);
    return () => clearTimeout(t);
  }, [enabled]);
  return useQuery({
    queryKey: ["signup-stage-status", uniqueId],
    queryFn: () => getSignupStageStatus(context.schoolUUID, uniqueId),
    enabled: Boolean(context?.schoolUUID && uniqueId && enabled && armed),
    refetchInterval: 180000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * "Confirm & Pay": resolves the available payment gateway(s) for this
 * payment (common/payment-gateway/options), matching getPaymentGatewaysOptions()
 * in commonPaymentGateway.js. Request shape confirmed against
 * PaymentOptionRequest.java. Resolves to the ResponseCommon envelope so the
 * caller can branch on status/statusCode (FLAGGED, E00x, etc.) before
 * reading `details.paymentOptions`.
 */
export function usePaymentGatewayOptions({ context }) {
  return useMutation({
    // Payload as getPaymentGatewaysOptions() builds it; both school ids are the review
    // data's schoolId (legacy passes `.payabledetails` schoolId for each).
    mutationFn: ({ userPaymentDetailsId, entityType, entityId, paidByUserId, schoolId, countryCode }) =>
      getPaymentGatewayOptions(context.schoolUUID, {
        userPaymentDetailsId,
        entityType,
        entityId,
        paidByUserId,
        schoolIdOfPaymentGateway: schoolId,
        schoolId,
        countryCode,
      }),
  });
}

/**
 * Launches the chosen gateway (common/invoke-payment-gateway) — a JSON call
 * that returns a redirect URL rather than redirecting itself (see
 * paymentApi.js's doc comment for the alternative form-POST variant this
 * page does NOT use). Caller does `window.location.href = details.redirectUrl`
 * on success.
 */
export function useInvokePaymentGateway({ context }) {
  return useMutation({
    // `payload` is built by the caller in invokePaymentGateway()'s exact legacy shape.
    mutationFn: (payload) => invokePaymentGateway(context.schoolUUID, payload),
  });
}

/**
 * get-airwallex-payment-methods — fired right after common/payment-gateway/options
 * when "Airwallex" is among the returned gateways (getPaymentGatewaysOptions() ->
 * getAirwallexMethods() in commonPaymentGateway.js). Resolves to
 * `{ methods: [{ labelName, image }] }`; callers treat a failure as "no methods"
 * rather than blocking the payment.
 */
export function useAirwallexPaymentMethods({ context }) {
  return useMutation({
    // schoolId is the gateway's school id (legacy passes schoolIdOfPaymentGateway).
    mutationFn: ({ schoolId, countryCode }) => getAirwallexPaymentMethods(context.schoolUUID, schoolId, countryCode),
  });
}

/** Cash / Wire Transfer: proof upload, then common/offline-payment (see PaymentGatewayPickerModal's OfflineForm). */
export function useOfflinePayment({ context, uniqueId }) {
  return {
    upload: (args) => uploadPaymentProof(context.schoolUUID, uniqueId, args),
    submit: (request) => submitOfflinePayment(context.schoolUUID, uniqueId, request),
  };
}
