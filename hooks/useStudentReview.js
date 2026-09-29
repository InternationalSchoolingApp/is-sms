"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  choosePaymentPlan,
  getAirwallexPaymentMethods,
  getPaymentGatewayOptions,
  getSignupStageStatus,
  getStudentReviewDetails,
  invokePaymentGateway,
  proceedToDashboard,
  submitApplication,
} from "@/services/studentSignupApi";

// SeriConstant, same as useCourseSelection.js.
export const STATUS_SUCCESS = "1";
export const STATUS_SESSION_OUT = "3";

// statusCode values confirmed at SignupStudentUtil.java's getStudentReivewDetails/
// choosePaymentPlan — not plain success/failure, each needs its own redirect.
export const STATUS_REDIRECT_TO_DASHBOARD = "REDIRECT_TO_DASHBOOARD"; // typo confirmed at source
export const STATUS_ELIGIBLE_CUSTOM_PLAN = "ELIGIBLE_CUSTOME_PLAN"; // typo confirmed at source
export const STATUS_FLAGGED = "FLAGGED";

function reviewDetailsKey(userId) {
  return ["student-review-details", userId];
}

/**
 * get-student-review-details, matching getReviewAndPayRendered()'s initial
 * load in signupStudentStage3.js. `reloadRequired:"Y"` always — this page
 * is only ever entered fresh (from Stage 3's "Continue to Step 4" or a
 * stage-resume), never re-used without a reload.
 */
export function useStudentReviewDetails({ context, userId }) {
  return useQuery({
    queryKey: reviewDetailsKey(userId),
    queryFn: async () => {
      const response = await getStudentReviewDetails(context.schoolUUID, {
        userId,
        reloadRequired: "Y",
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
        queryClient.invalidateQueries({ queryKey: reviewDetailsKey(userId) });
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
  return useQuery({
    queryKey: ["signup-stage-status", uniqueId],
    queryFn: () => getSignupStageStatus(context.schoolUUID, uniqueId),
    enabled: Boolean(context?.schoolUUID && uniqueId && enabled),
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
    mutationFn: ({ userPaymentDetailsId, entityType, entityId, paidByUserId, countryCode }) =>
      getPaymentGatewayOptions(context.schoolUUID, {
        userPaymentDetailsId,
        entityType,
        entityId,
        paidByUserId,
        countryCode,
        schoolId: context.schoolNumericId,
        schoolIdOfPaymentGateway: context.schoolNumericId,
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
    mutationFn: ({ userPaymentDetailsId, paidByUserId, paymentGateway, backUrl }) =>
      invokePaymentGateway(context.schoolUUID, {
        userPaymentDetailsId,
        paidByUserId,
        schoolId: context.schoolNumericId,
        schoolIdOfPaymentGateway: context.schoolNumericId,
        paymentGateway,
        browserDetails: typeof navigator !== "undefined" ? navigator.userAgent : "",
        location: "",
        apiLocation: "",
        initiateVia: "signup",
        backUrl: backUrl || "",
      }),
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
    mutationFn: ({ countryCode }) =>
      getAirwallexPaymentMethods(context.schoolUUID, context.schoolNumericId, countryCode),
  });
}
