"use server";
import * as studentSignupApi from "@/services/studentSignupBackendApi";

/**
 * Server Action layer for the authenticated (session-cookie-dependent)
 * Student Signup endpoints: every Client Component calls one of these
 * instead of importing services/studentSignupBackendApi.js directly. Each
 * wrapper is a thin one-liner delegating to the existing service — no
 * endpoint path, payload shape, or response handling is reimplemented here;
 * that all stays in services/studentSignupBackendApi.js, which is the
 * single place that logic lives. Same argument order/return shape as that
 * file's exports, just reached through a "use server" boundary instead of a
 * plain import, so the actual backend fetch always executes on the Next.js
 * server.
 *
 * The handful of public/pre-auth endpoints (getEnrollmentSignupInfo,
 * getPublicSchoolInfo, getEnrollmentProcess) don't go through this file —
 * AccountCreationForm.jsx and hooks/useEnrollmentContext.js call them
 * directly from services/studentSignupApi.js, which needs no session cookie
 * and is safe to import straight into a Client Component.
 */

export async function saveStudentDetailsAction(schoolUUID, request) {
  return studentSignupApi.saveStudentDetails(schoolUUID, request);
}

export async function getStudentDetailsAction(schoolUUID, request) {
  return studentSignupApi.getStudentDetails(schoolUUID, request);
}

export async function getEnrollmentsGradesAction(schoolUUID, request) {
  return studentSignupApi.getEnrollmentsGrades(schoolUUID, request);
}

export async function getCountriesAction(schoolUUID, authentication) {
  return studentSignupApi.getCountries(schoolUUID, authentication);
}

export async function getStatesAction(schoolUUID, authentication, countryId) {
  return studentSignupApi.getStates(schoolUUID, authentication, countryId);
}

export async function getCitiesAction(schoolUUID, authentication, stateId) {
  return studentSignupApi.getCities(schoolUUID, authentication, stateId);
}

export async function saveParentDetailsAction(schoolUUID, request) {
  return studentSignupApi.saveParentDetails(schoolUUID, request);
}

export async function getParentDetailsAction(schoolUUID, request) {
  return studentSignupApi.getParentDetails(schoolUUID, request);
}

export async function chooseCoursesByGradeAction(schoolUUID, request) {
  return studentSignupApi.chooseCoursesByGrade(schoolUUID, request);
}

export async function choosePaymentPlanAction(schoolUUID, request) {
  return studentSignupApi.choosePaymentPlan(schoolUUID, request);
}

export async function getPaymentDetailsAction(schoolUUID, request) {
  return studentSignupApi.getPaymentDetails(schoolUUID, request);
}

export async function getRecommendedCoursesAction(schoolUUID, request) {
  return studentSignupApi.getRecommendedCourses(schoolUUID, request);
}

export async function getStudentCommissionPayByAction(schoolUUID, request) {
  return studentSignupApi.getStudentCommissionPayBy(schoolUUID, request);
}

export async function getStudentReviewDetailsAction(schoolUUID, request) {
  return studentSignupApi.getStudentReviewDetails(schoolUUID, request);
}

export async function submitApplicationAction(schoolUUID, request) {
  return studentSignupApi.submitApplication(schoolUUID, request);
}

export async function proceedToDashboardAction(schoolUUID, request) {
  return studentSignupApi.proceedToDashboard(schoolUUID, request);
}

export async function getSignupStageStatusAction(schoolUUID, uniqueId) {
  return studentSignupApi.getSignupStageStatus(schoolUUID, uniqueId);
}

export async function getPaymentGatewayOptionsAction(schoolUUID, request) {
  return studentSignupApi.getPaymentGatewayOptions(schoolUUID, request);
}

export async function invokePaymentGatewayAction(schoolUUID, request) {
  return studentSignupApi.invokePaymentGateway(schoolUUID, request);
}

export async function getPaymentPaidStatusAction(schoolUUID, request) {
  return studentSignupApi.getPaymentPaidStatus(schoolUUID, request);
}

export async function getAirwallexPaymentMethodsAction(schoolUUID, schoolIdOfPaymentGateway, countryCode) {
  return studentSignupApi.getAirwallexPaymentMethods(schoolUUID, schoolIdOfPaymentGateway, countryCode);
}

export async function submitOfflinePaymentAction(schoolUUID, uniqueId, request) {
  return studentSignupApi.submitOfflinePayment(schoolUUID, uniqueId, request);
}

export async function uploadPaymentProofAction(schoolUUID, uniqueId, args) {
  return studentSignupApi.uploadPaymentProof(schoolUUID, uniqueId, args);
}

export async function logoutSignupAction(schoolUUID, uniqueId) {
  return studentSignupApi.logoutSignup(schoolUUID, uniqueId);
}

export async function signupStage1Action(schoolUUID, request) {
  return studentSignupApi.signupStage1(schoolUUID, request);
}

export async function checkEmailAvailabilityAction(schoolUUID, request) {
  return studentSignupApi.checkEmailAvailability(schoolUUID, request);
}

export async function resendEmailVerificationAction(schoolUUID, request) {
  return studentSignupApi.resendEmailVerification(schoolUUID, request);
}

// Used by utils/locationFinder.js's loadLocationGlobals — not IP-dependent
// itself (only the ip-location fetch it pairs with is), so it executes
// server-side like everything else here.
export async function getCommonScriptVariablesAction(schoolUUID, request) {
  return studentSignupApi.getCommonScriptVariables(schoolUUID, request);
}
