"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/student-enroll/ConfirmDialog";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { CustomPlanTable, FeePaymentPlans } from "@/components/student-enroll/FeePaymentPlans";
import { InfoModal } from "@/components/student-enroll/InfoModal";
import { ParentInlineEdit, StudentInlineEdit } from "@/components/student-enroll/ReviewInlineEdit";
import { Stage3CourseSelection } from "@/components/student-enroll/Stage3CourseSelection";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { launchPaymentGatewayForm } from "@/services/studentSignupApi";
import { launchPaymentGatewayForm } from "@/services/studentSignupApi";
import { useShowPaymentOption } from "@/hooks/useCourseSelection";
import { saveWizardParentFields, saveWizardStudentFields } from "@/utils/wizardStorage";
import {
  STATUS_ELIGIBLE_CUSTOM_PLAN,
  STATUS_FLAGGED,
  STATUS_REDIRECT_TO_DASHBOARD,
  STATUS_SESSION_OUT,
  STATUS_SUCCESS,
  useAirwallexPaymentMethods,
  useChoosePaymentPlan,
  useInvokePaymentGateway,
  useOfflinePayment,
  useOfflinePayment,
  usePaymentGatewayOptions,
  useProceedToDashboard,
  useSignupStageStatusPoll,
  useStudentReviewDetails,
  useSubmitApplication,
} from "@/hooks/useStudentReview";
import { hidesCourseCredits, isKnownPaymentMode } from "@/utils/studentSignupValidation";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
import {
  callLocationForPaymentPromise,
  getAirwallexCountryCode,
  getLocationValue,
  getPayerCountryCodePromise,
  loadLocationGlobals,
} from "@/utils/locationFinder";
import {
  callLocationForPaymentPromise,
  getAirwallexCountryCode,
  getLocationValue,
  getPayerCountryCodePromise,
  loadLocationGlobals,
} from "@/utils/locationFinder";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

const SECTION_CLASS = "overflow-hidden rounded-xl border border-slate-200 bg-white";

/** Card shell for a section while it is being edited in place (no Edit button; the form has its own Save/Cancel). */
function EditingSection({ title, children }) {
  return (
    <section className={SECTION_CLASS}>
      <header className="bg-primary px-4 py-3 text-white">
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="px-4 py-5">{children}</div>
    </section>
  );
}

/**
 * Accordion header — legacy `<h4 class="a-title">` with an Edit button
 * (.edit-btn) and a Review button (.review-btn). The whole header toggles the
 * section, like the old `.accordion .a-title` click handler; Edit stops the
 * click bubbling so it doesn't also toggle.
 */
function SectionHeader({ title, open, onToggle, onEdit }) {
  return (
    <header
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle();
        }
      }}
      className="flex cursor-pointer items-center justify-between gap-3 bg-primary px-4 py-3 text-white"
    >
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="flex gap-2">
        {onEdit && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Edit
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          Review
        </Button>
      </div>
    </header>
  );
}

// Gateways with no server-side redirect (inline card entry / offline methods) — legacy
// CLIENT_SIDE_GATEWAYS; matched case-insensitively, gateway names are cased inconsistently.
const CLIENT_SIDE_GATEWAYS = ["wellsfargo", "convera", "yoco", "wiretransfer", "cash", "paypal transfer", "smoovpay"];

// Closing animation of the shadcn Dialog is 100ms; the redirect waits a beat longer so the
// modal is actually gone from the screen before the browser starts leaving the page.
const MODAL_DISPOSE_MS = 150;
const disposeDelay = () => new Promise((resolve) => setTimeout(resolve, MODAL_DISPOSE_MS));

// Gateways with no server-side redirect (inline card entry / offline methods) — legacy
// CLIENT_SIDE_GATEWAYS; matched case-insensitively, gateway names are cased inconsistently.
const CLIENT_SIDE_GATEWAYS = ["wellsfargo", "convera", "yoco", "wiretransfer", "cash", "paypal transfer", "smoovpay"];

// Closing animation of the shadcn Dialog is 100ms; the redirect waits a beat longer so the
// modal is actually gone from the screen before the browser starts leaving the page.
const MODAL_DISPOSE_MS = 150;
const disposeDelay = () => new Promise((resolve) => setTimeout(resolve, MODAL_DISPOSE_MS));

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";

function fullName(person) {
  if (!person) return "";
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

function locationLine(person) {
  if (!person) return "";
  return [person.countryName, person.stateName, person.cityName].filter(Boolean).join(" | ");
}

function phoneLine(person) {
  if (!person?.contactNumber) return "N/A";
  const code = person.countryIsdCode || person.countryCode || "";
  return `+${code} ${person.contactNumber}`;
}

// Mirrors getPaymentSelectionBodyContent() in signupStudentContent.js: one
// radio per plan the backend currently offers, built straight off
// feePaymentDetailsResponse (no separate "available plans" list exists).
function buildPlanOptions(fee) {
  if (!fee) return [];
  const options = [];
  if (fee.bookASeatOpted === 1 && fee.enrollmentFee?.enrollmentFee > 0 && !fee.bookAnEnrollmentPaidStatus) {
    options.push({
      key: "registration",
      kind: "registration",
      label: "Reserve an enrollment Seat",
      amount: fee.enrollmentFee.enrollmentFeeString,
    });
  }
  if (fee.oneTimePayment) {
    const discount = fee.oneTimePayment.paymentOptionDiscount > 0;
    options.push({
      key: fee.oneTimePayment.paymentKey,
      kind: "annual",
      label: discount
        ? `Pay ${fee.oneTimePayment.paymentMode} & save ${fee.oneTimePayment.paymentOptionDiscountString}`
        : `Pay ${fee.oneTimePayment.paymentMode}`,
      amount: fee.oneTimePayment.payableFeeString,
    });
  }
  if (fee.monthlyFeeDetails) {
    options.push({
      key: fee.monthlyFeeDetails.paymentKey,
      kind: "monthly",
      label: "Pay Easy installments",
      amount: fee.monthlyFeeDetails.payableFeeString,
    });
  }
  return options;
}

/**
 * Stage 4 ("Review and Payment"). Mirrors getReviewAndPayContent() /
 * studentDetailsPreview() / parentDetailsPreview() / courseDetailsPreview() /
 * feePaymentReview() in signupStudentContent.js and showPaymentModal() /
 * choosePaymentOption() / callForApplicationSubmit() /
 * callForProgressionToDashboard() in signupStudentStage3.js.
 *
 * Read-only port for v1: the legacy "Edit" buttons move a step's own form
 * fields inline into the review screen (openReviewInlineEdit); here they
 * just navigate back to that step instead, since Stage 1-3 already own that
 * editing UI.
 *
 * Plan switching on this screen is deferred (not eager), matching legacy:
 * the radio only updates local state, and choose-payment-plan is only
 * called when the primary action button is pressed.
 */
export function Stage4ReviewPayment({ context, userId, uniqueId, onBack, onSessionExpired, onOfflineSignup }) {
  const reviewQuery = useStudentReviewDetails({ context, userId });
  // API order on this screen: get-payment-details and choose-payment-plan run
  // on Stage 3's "Continue" (useProceedToReview), then get-student-review-details
  // above, then enrollment-stage-status — held back until the review call has
  // succeeded so it always fires 4th, then repeats every 3 min (getSignupStatus()).
  const stageStatus = useSignupStageStatusPoll({ context, uniqueId, enabled: reviewQuery.isSuccess });
  const paymentOption = useShowPaymentOption({ context, userId });
  const choosePlan = useChoosePaymentPlan({ context, userId });
  const submitApplication = useSubmitApplication({ context, userId });
  const proceedToDashboard = useProceedToDashboard({ context, userId });
  const gatewayOptions = usePaymentGatewayOptions({ context });
  const invokeGateway = useInvokePaymentGateway({ context });
  const airwallexMethods = useAirwallexPaymentMethods({ context });
  const offlinePayment = useOfflinePayment({ context, uniqueId });
  const offlinePayment = useOfflinePayment({ context, uniqueId });

  const [notice, setNotice] = useState(null);
  const [flaggedModal, setFlaggedModal] = useState(null);
  const [infoDismissed, setInfoDismissed] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [gatewayPicker, setGatewayPicker] = useState(null);
  // Cash / Wire Transfer submitted: "Payment Under Review" (#logout_modal_logout) replaces Confirm & Pay.
  const [paymentUnderReview, setPaymentUnderReview] = useState(false);
  // Cash / Wire Transfer submitted: "Payment Under Review" (#logout_modal_logout) replaces Confirm & Pay.
  const [paymentUnderReview, setPaymentUnderReview] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submittedMessage, setSubmittedMessage] = useState(null);
  // Which section is being edited in place ("student" | "parent" | "course" | null) —
  // openReviewInlineEdit() in signupStudentContent.js. Edits stay on this screen.
  const [editing, setEditing] = useState(null);
  // Accordion: only one section open at a time (siblings slide up in legacy).
  // undefined = untouched, so the default applies: everything collapsed except
  // Selected Courses when there is no payment step (SHOW_PAYMENT_OPTION == 'N').
  const [openOverride, setOpenOverride] = useState(undefined);

  const data = reviewQuery.data?.status === STATUS_SUCCESS ? reviewQuery.data : null;
  const failure = reviewQuery.data && reviewQuery.data.status !== STATUS_SUCCESS ? reviewQuery.data : null;
  const showPaymentOption = paymentOption.data;
  const busy =
    reviewQuery.isFetching ||
    choosePlan.isPending || submitApplication.isPending || proceedToDashboard.isPending || gatewayOptions.isPending || airwallexMethods.isPending || invokeGateway.isPending;

  const planOptions = useMemo(() => buildPlanOptions(data?.feePaymentDetailsResponse), [data]);

  // Same "derive a default, let the user's own choice override it" pattern
  // Stage3CourseSelection uses for effectiveOpenId — avoids a setState-in-effect.
  const preferredPlan = data?.signupCourse?.payMode;
  const defaultPlan =
    preferredPlan && planOptions.some((option) => option.key === preferredPlan) ? preferredPlan : planOptions[0]?.key;
  const currentPlan = selectedPlan ?? defaultPlan;

  const infoMessage =
    data?.isOptedAlternetPaymentMethod === 1
      ? <p>You already have a Cash or Wire Transfer payment pending confirmation for this enrollment.</p>
      : data?.isOptedAlternetPaymentMethod === 2
        ? <p>Your Wire Transfer payment is still being verified. This can take a few business days.</p>
        : null;

  useEffect(() => {
    if (!failure) return;
    if (failure.status === STATUS_SESSION_OUT) {
      onSessionExpired?.();
      return;
    }
    const baseUrl = resolveBackendOrigin();
    if (failure.statusCode === STATUS_REDIRECT_TO_DASHBOARD && baseUrl) {
      window.location.href = `${baseUrl}/${context.schoolUUID}/dashboard/student/${userId}`;
      return;
    }
    if (failure.statusCode === STATUS_ELIGIBLE_CUSTOM_PLAN && baseUrl) {
      window.location.href = `${baseUrl}/${context.schoolUUID}/student/enrollment/process/${userId}`;
    }
  }, [failure, context?.schoolUUID, userId, onSessionExpired]);

  // getSignupStatusFinal(): "3" = session out; anything other than 0/2/3 means
  // the stage moved server-side (enrollment complete / custom plan confirmed)
  // and the response carries the page to go to.
  const stageStatusData = stageStatus.data;
  useEffect(() => {
    if (!stageStatusData) return;
    if (stageStatusData.status === STATUS_SESSION_OUT) {
      onSessionExpired?.();
    } else if (stageStatusData.status === STATUS_SUCCESS && stageStatusData.redirectUri) {
      window.location.replace(stageStatusData.redirectUri);
    }
  }, [stageStatusData, onSessionExpired]);

  // Coming back from the payment gateway (browser Back / bfcache) restores this page exactly as it
  // was left — with the payment modal open. Dispose it (and the "redirecting…" notice) whenever the
  // page is hidden or restored from the back/forward cache.
  useEffect(() => {
    const dispose = () => {
      setGatewayPicker(null);
      setNotice((current) => (current?.tone === "info" ? null : current));
    };
    const onPageShow = (event) => {
      if (event.persisted) dispose();
    };
    window.addEventListener("pagehide", dispose);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pagehide", dispose);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // Coming back from the payment gateway (browser Back / bfcache) restores this page exactly as it
  // was left — with the payment modal open. Dispose it (and the "redirecting…" notice) whenever the
  // page is hidden or restored from the back/forward cache.
  useEffect(() => {
    const dispose = () => {
      setGatewayPicker(null);
      setNotice((current) => (current?.tone === "info" ? null : current));
    };
    const onPageShow = (event) => {
      if (event.persisted) dispose();
    };
    window.addEventListener("pagehide", dispose);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pagehide", dispose);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  useEffect(() => {
    if (notice?.tone !== "success" && notice?.tone !== "info") return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // finishReviewInlineEditSave(): leave edit mode and re-render the review from
  // freshly saved data. The chosen plan is dropped so the (possibly changed)
  // plan list falls back to the backend's saved plan.
  function openSectionFor(type) {
    return openOverride === undefined ? (showPaymentOption === "N" ? "course" : null) : openOverride;
  }

  // Review button / header click. Toggling a section that is mid-edit discards
  // the edit without saving (finishReviewEdit() in legacy), then collapses it.
  function toggleSection(type) {
    if (editing === type) setEditing(null);
    setOpenOverride(openSectionFor() === type ? null : type);
  }

  function startEdit(type) {
    setEditing(type);
    setOpenOverride(type);
  }

  function finishEdit(type, fields) {
    if (type === "student" && fields) saveWizardStudentFields(context.schoolUUID, userId, fields);
    if (type === "parent" && fields) saveWizardParentFields(context.schoolUUID, userId, fields);
    setEditing(null);
    setSelectedPlan(null);
    reviewQuery.refetch();
  }

  function handleFailure(response, fallback) {
    if (!response) {
      setNotice({ tone: "error", text: GENERIC_ERROR });
      return;
    }
    if (response.status === STATUS_SESSION_OUT) {
      onSessionExpired?.();
      return;
    }
    if (response.statusCode === STATUS_FLAGGED) {
      setFlaggedModal({ sessionName: response.message });
      return;
    }
    // choosePaymentOption()/invokePaymentGateway(): the enrollment moved on server-side -> reload.
    const baseUrl = resolveBackendOrigin();
    if (response.statusCode === STATUS_REDIRECT_TO_DASHBOARD && baseUrl) {
      window.location.href = `${baseUrl}/${context.schoolUUID}/dashboard/student/${userId}`;
      return;
    }
    if (response.statusCode === STATUS_ELIGIBLE_CUSTOM_PLAN && baseUrl) {
      window.location.href = `${baseUrl}/${context.schoolUUID}/student/enrollment/process/${userId}`;
      return;
    }
    // choosePaymentOption()/invokePaymentGateway(): the enrollment moved on server-side -> reload.
    const baseUrl = resolveBackendOrigin();
    if (response.statusCode === STATUS_REDIRECT_TO_DASHBOARD && baseUrl) {
      window.location.href = `${baseUrl}/${context.schoolUUID}/dashboard/student/${userId}`;
      return;
    }
    if (response.statusCode === STATUS_ELIGIBLE_CUSTOM_PLAN && baseUrl) {
      window.location.href = `${baseUrl}/${context.schoolUUID}/student/enrollment/process/${userId}`;
      return;
    }
    setNotice({ tone: "error", text: response.categoryMandatoryMessage || response.message || fallback });
  }

  // showPaymentModal(): persist the selected plan (unless it's already fixed
  // by a custom plan), then resolve and launch the payment gateway.
  async function confirmAndPay() {
    if (busy) return;
    setNotice(null);
    try {
      // showPaymentModal(): LOCATION_SERVICE_BYPASS / DEFAULT_LOCATION globals, then
      // `await callLocationForPaymentPromise()` (fills #location) before the options flow.
      await loadLocationGlobals({ schoolUUID: context.schoolUUID, userId });
      await callLocationForPaymentPromise();
      // showPaymentModal(): LOCATION_SERVICE_BYPASS / DEFAULT_LOCATION globals, then
      // `await callLocationForPaymentPromise()` (fills #location) before the options flow.
      await loadLocationGlobals({ schoolUUID: context.schoolUUID, userId });
      await callLocationForPaymentPromise();
      let userPaymentDetailsId = data.userPaymentDetailsId;
      if (!data.customPaymentEnabled) {
        if (!currentPlan) {
          setNotice({ tone: "error", text: "Please choose a fee payment plan." });
          return;
        }
        const plan = await choosePlan.mutateAsync(isKnownPaymentMode(currentPlan) ? currentPlan : "annually");
        if (plan?.status !== STATUS_SUCCESS) {
          handleFailure(plan, "Could not save your payment plan. Please try again.");
          return;
        }
        userPaymentDetailsId = plan.userPaymentDetailsId || userPaymentDetailsId;
      }
      // getPaymentGatewaysOptions(): the payer's country goes with the options call so the
      // server can gate region-specific gateways (e.g. AFS).
      const countryCode = await getPayerCountryCodePromise();
      const options = await gatewayOptions.mutateAsync({
        userPaymentDetailsId,
        entityType: data.entityType,
        entityId: data.entityId,
        paidByUserId: data.userId,
        schoolId: data.schoolId,
        paidByUserId: data.userId,
        schoolId: data.schoolId,
        countryCode,
      });
      if (options?.status !== STATUS_SUCCESS) {
        handleFailure(options, "Could not load payment options. Please try again.");
        return;
      }
      const gateways = options.details?.paymentOptions || [];
      if (gateways.length === 0) {
        setNotice({ tone: "error", text: "No payment method is available right now. Please contact support." });
        return;
      }
      // getPaymentGatewaysOptions(), after the modal is appended: `await callLocationForPaymentPromise()`
      // refreshes #location, then get-airwallex-payment-methods runs for the "Airwallex" entry (its
      // country read from #location, else the browser locale). A failure just means no method
      // tiles, never a blocked payment.
      await callLocationForPaymentPromise();
      // getPaymentGatewaysOptions(), after the modal is appended: `await callLocationForPaymentPromise()`
      // refreshes #location, then get-airwallex-payment-methods runs for the "Airwallex" entry (its
      // country read from #location, else the browser locale). A failure just means no method
      // tiles, never a blocked payment.
      await callLocationForPaymentPromise();
      let methods = [];
      if (gateways.some((gateway) => gateway.name === "Airwallex")) {
        try {
          const airwallex = await airwallexMethods.mutateAsync({
            schoolId: data.schoolId,
            countryCode: getAirwallexCountryCode(),
          });
          const airwallex = await airwallexMethods.mutateAsync({
            schoolId: data.schoolId,
            countryCode: getAirwallexCountryCode(),
          });
          methods = airwallex?.methods || [];
        } catch (err) {
          console.error("get-airwallex-payment-methods failed:", err);
        }
      }
      // Legacy always opens the "Choose Your Payment Method" modal, even for a single gateway.
      setGatewayPicker({ details: options.details, methods, countryCode });
      // Legacy always opens the "Choose Your Payment Method" modal, even for a single gateway.
      setGatewayPicker({ details: options.details, methods, countryCode });
    } catch (err) {
      console.error("Stage4ReviewPayment confirmAndPay failed:", err);
      setNotice({ tone: "error", text: GENERIC_ERROR });
    }
  }

  // invokePaymentGateway() in commonPaymentGateway.js: every gateway is launched through a plain
  // top-level GET form to common/launch-payment-gateway, except the client-side ones, which have
  // no server redirect and go through the JSON invoke call.
  async function launchGateway(gateway) {
    const details = gatewayPicker.details;
    const payload = {
      location: getLocationValue(),
      browserDetails: details.upid,
      userPaymentDetailsId: details.upid,
      paidByUserId: details.paidByUserId,
      schoolId: details.schoolId,
      schoolIdOfPaymentGateway: details.schoolIdOfPaymentGateway,
      paymentGateway: gateway.name,
      initiateVia: "",
      backUrl: window.location.href,
    };
    // Pay Now: the payment modal is disposed first, then the browser goes to the gateway.
    const disposePicker = async () => {
      flushSync(() => setGatewayPicker(null));
      await disposeDelay();
    };
    if (!CLIENT_SIDE_GATEWAYS.includes((gateway.name || "").toLowerCase())) {
      setNotice({ tone: "info", text: "Please wait while redirecting to payment gateway..." });
      await disposePicker();
      launchPaymentGatewayForm(context.schoolUUID, payload);
      return;
    }
    try {
      const response = await invokeGateway.mutateAsync(payload);
  // invokePaymentGateway() in commonPaymentGateway.js: every gateway is launched through a plain
  // top-level GET form to common/launch-payment-gateway, except the client-side ones, which have
  // no server redirect and go through the JSON invoke call.
  async function launchGateway(gateway) {
    const details = gatewayPicker.details;
    const payload = {
      location: getLocationValue(),
      browserDetails: details.upid,
      userPaymentDetailsId: details.upid,
      paidByUserId: details.paidByUserId,
      schoolId: details.schoolId,
      schoolIdOfPaymentGateway: details.schoolIdOfPaymentGateway,
      paymentGateway: gateway.name,
      initiateVia: "",
      backUrl: window.location.href,
    };
    // Pay Now: the payment modal is disposed first, then the browser goes to the gateway.
    const disposePicker = async () => {
      flushSync(() => setGatewayPicker(null));
      await disposeDelay();
    };
    if (!CLIENT_SIDE_GATEWAYS.includes((gateway.name || "").toLowerCase())) {
      setNotice({ tone: "info", text: "Please wait while redirecting to payment gateway..." });
      await disposePicker();
      launchPaymentGatewayForm(context.schoolUUID, payload);
      return;
    }
    try {
      const response = await invokeGateway.mutateAsync(payload);
      if (response?.status !== STATUS_SUCCESS || !response.details?.redirectUrl) {
        setGatewayPicker(null);
        setGatewayPicker(null);
        handleFailure(response, "Could not start the payment. Please try again.");
        return;
      }
      setNotice({ tone: "info", text: "Please wait while redirecting to payment gateway..." });
      await disposePicker();
      if (response.details.openSelf) window.location.replace(response.details.redirectUrl);
      else window.location.href = response.details.redirectUrl;
      setNotice({ tone: "info", text: "Please wait while redirecting to payment gateway..." });
      await disposePicker();
      if (response.details.openSelf) window.location.replace(response.details.redirectUrl);
      else window.location.href = response.details.redirectUrl;
    } catch (err) {
      console.error("Stage4ReviewPayment launchGateway failed:", err);
      setGatewayPicker(null);
      setGatewayPicker(null);
      setNotice({ tone: "error", text: GENERIC_ERROR });
    }
  }

  // bindFileUploadNew1(): upload the proof; resolves to { fileName } or { error }.
  async function uploadProof(file, spec) {
    try {
      const response = await offlinePayment.upload({ file, ...spec });
      if (!response) return { error: GENERIC_ERROR };
      if (response.status === STATUS_SESSION_OUT) {
        onSessionExpired?.();
        return { error: response.message || "Your session has timed out." };
      }
      const fileName = response.uploadFiles?.[0]?.fileName;
      if (response.status === "0" || !fileName) return { error: response.message || "Upload failed. Please try again." };
      return { fileName };
    } catch (err) {
      console.error("Payment proof upload failed:", err);
      return { error: GENERIC_ERROR };
    }
  }

  // callOfflinePayment(): common/offline-payment; status "1" -> "Your Payment is under review."
  async function submitOffline(gateway, form, { paymentByUserId }) {
    const details = gatewayPicker.details;
    try {
      const response = await offlinePayment.submit({
        userId: paymentByUserId,
        paymentByUserId,
        userPaymentDetailsId: details.upid,
        callingFrom: "signup",
        gatewayName: gateway.name,
        referenceNumber: form.referenceNumber,
        uplaodedFileName: form.fileName, // (sic) the backend's field name
        amountPaid: details.payAmount,
        schoolId: details.schoolId,
      });
      if (response?.status === STATUS_SESSION_OUT) {
        onSessionExpired?.();
        return { ok: false };
      }
      if (response?.status !== STATUS_SUCCESS) return { ok: false, message: response?.message };
      setGatewayPicker(null);
      setPaymentUnderReview(true);
      return { ok: true };
    } catch (err) {
      console.error("Offline payment submit failed:", err);
      return { ok: false, message: GENERIC_ERROR };
    }
  }

  // bindFileUploadNew1(): upload the proof; resolves to { fileName } or { error }.
  async function uploadProof(file, spec) {
    try {
      const response = await offlinePayment.upload({ file, ...spec });
      if (!response) return { error: GENERIC_ERROR };
      if (response.status === STATUS_SESSION_OUT) {
        onSessionExpired?.();
        return { error: response.message || "Your session has timed out." };
      }
      const fileName = response.uploadFiles?.[0]?.fileName;
      if (response.status === "0" || !fileName) return { error: response.message || "Upload failed. Please try again." };
      return { fileName };
    } catch (err) {
      console.error("Payment proof upload failed:", err);
      return { error: GENERIC_ERROR };
    }
  }

  // callOfflinePayment(): common/offline-payment; status "1" -> "Your Payment is under review."
  async function submitOffline(gateway, form, { paymentByUserId }) {
    const details = gatewayPicker.details;
    try {
      const response = await offlinePayment.submit({
        userId: paymentByUserId,
        paymentByUserId,
        userPaymentDetailsId: details.upid,
        callingFrom: "signup",
        gatewayName: gateway.name,
        referenceNumber: form.referenceNumber,
        uplaodedFileName: form.fileName, // (sic) the backend's field name
        amountPaid: details.payAmount,
        schoolId: details.schoolId,
      });
      if (response?.status === STATUS_SESSION_OUT) {
        onSessionExpired?.();
        return { ok: false };
      }
      if (response?.status !== STATUS_SUCCESS) return { ok: false, message: response?.message };
      setGatewayPicker(null);
      setPaymentUnderReview(true);
      return { ok: true };
    } catch (err) {
      console.error("Offline payment submit failed:", err);
      return { ok: false, message: GENERIC_ERROR };
    }
  }

  // SHOW_PAYMENT_OPTION=='N': plain confirm-and-submit, no payment involved.
  async function confirmSubmitApplication() {
    setConfirmSubmit(false);
    setNotice(null);
    try {
      const isOffline = data.registrationType !== "ONLINE" && data.enrollmentType !== "ONLINE";
      const response = isOffline ? await proceedToDashboard.mutateAsync() : await submitApplication.mutateAsync();
      if (response?.status !== STATUS_SUCCESS) {
        handleFailure(response, "Could not submit your application. Please try again.");
        return;
      }
      onOfflineSignup?.();
      setSubmittedMessage(
        <p>
          Your application has been submitted and is under review. We will reach out to you at{" "}
          <strong>{data.contactEmail}</strong> with the next steps.
        </p>
      );
    } catch (err) {
      console.error("Stage4ReviewPayment submit failed:", err);
      setNotice({ tone: "error", text: GENERIC_ERROR });
    }
  }

  const header = (
    <>
      <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Review and payment</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        Step 4 of 4. Kindly review your details {showPaymentOption === "Y" ? "and choose a payment plan" : ""}.
      </p>
    </>
  );

  if (reviewQuery.isLoading) {
    return (
      <div>
        {header}
        <p className="mt-8 text-sm text-slate-500">Loading your details…</p>
      </div>
    );
  }

  if (!data) {
    const message =
      failure?.statusCode === STATUS_REDIRECT_TO_DASHBOARD || failure?.statusCode === STATUS_ELIGIBLE_CUSTOM_PLAN
        ? "Redirecting…"
        : failure?.message || "Could not load your review details.";
    return (
      <div>
        {header}
        <p className="mt-8 text-sm font-semibold text-red-600">{message}</p>
        {failure?.statusCode !== STATUS_REDIRECT_TO_DASHBOARD && failure?.statusCode !== STATUS_ELIGIBLE_CUSTOM_PLAN && (
          <div className="mt-6 flex gap-3">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            <Button type="button" onClick={() => reviewQuery.refetch()} disabled={reviewQuery.isFetching}>
              Try again
            </Button>
          </div>
        )}
      </div>
    );
  }

  const student = data.signupStudent;
  const parent = data.signupParent;
  const course = data.signupCourse;
  const fee = data.feePaymentDetailsResponse;
  const hideCredits = hidesCourseCredits(course?.standardId);
  const paymentPending = showPaymentOption === "Y";

  return (
    <div>
      {header}

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 text-sm font-semibold ${notice.tone === "error" ? "text-red-600" : notice.tone === "success" ? "text-emerald-700" : "text-slate-600"}`}
        >
          {notice.text}
        </p>
      )}

      <div className={`mt-6 space-y-4 ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
        {editing === "student" ? (
          <StudentInlineEdit
            context={context}
            userId={userId}
            student={student}
            gradeName={course?.standardName}
            onSaved={(fields) => finishEdit("student", fields)}
            onCancel={() => setEditing(null)}
            onReview={() => toggleSection("student")}
            onSessionExpired={onSessionExpired}
          />
        ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <SectionHeader
            title="Student Details"
            open={openSectionFor() === "student"}
            onToggle={() => toggleSection("student")}
            onEdit={data.customPaymentEnabled ? undefined : () => startEdit("student")}
          />
          {openSectionFor() === "student" && (
          <dl className="divide-y divide-slate-100 px-4 py-2 text-sm">
            <div className="flex justify-between py-2"><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900">{fullName(student)}</dd></div>
            {course?.standardName && (
              <div className="flex justify-between py-2"><dt className="text-slate-500">Grade</dt><dd className="font-medium text-slate-900">{course.standardName}</dd></div>
            )}
            <div className="flex justify-between py-2"><dt className="text-slate-500">Date of Birth</dt><dd className="font-medium text-slate-900">{student?.dob}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-slate-500">Gender</dt><dd className="font-medium text-slate-900">{student?.genderName}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900">{student?.communicationEmail}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-slate-500">Phone Number</dt><dd className="font-medium text-slate-900">{phoneLine(student)}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-slate-500">Nationality</dt><dd className="font-medium text-slate-900">{student?.nationality}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-slate-500">Country | State | City</dt><dd className="font-medium text-slate-900">{locationLine(student)}</dd></div>
          </dl>
          )}
        </section>
        )}

        {editing === "parent" ? (
          <ParentInlineEdit
            context={context}
            userId={userId}
            parent={parent}
            onSaved={(fields) => finishEdit("parent", fields)}
            onCancel={() => setEditing(null)}
            onReview={() => toggleSection("parent")}
            onSessionExpired={onSessionExpired}
          />
        ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <SectionHeader
            title="Parent/Guardian Details"
            open={openSectionFor() === "parent"}
            onToggle={() => toggleSection("parent")}
            onEdit={data.customPaymentEnabled ? undefined : () => startEdit("parent")}
          />
          {openSectionFor() === "parent" && (
          <dl className="divide-y divide-slate-100 px-4 py-2 text-sm">
            {parent?.workingProfessionName ? (
              <>
                <div className="flex justify-between py-2"><dt className="text-slate-500">Student or a working professional</dt><dd className="font-medium text-slate-900">{parent.workingProfessionName}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-slate-500">School/College/Organization</dt><dd className="font-medium text-slate-900">{parent.institutionName}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-slate-500">Country</dt><dd className="font-medium text-slate-900">{parent.institutionCountryName}</dd></div>
              </>
            ) : (
              <>
                <div className="flex justify-between py-2"><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900">{fullName(parent)}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-slate-500">Relation with student</dt><dd className="font-medium text-slate-900">{parent?.relationshipName}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900">{parent?.email || "N/A"}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-slate-500">Phone Number</dt><dd className="font-medium text-slate-900">{phoneLine(parent)}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-slate-500">Country | State | City</dt><dd className="font-medium text-slate-900">{locationLine(parent)}</dd></div>
                {parent?.referralCode && (
                  <div className="flex justify-between py-2"><dt className="text-slate-500">Referral Code</dt><dd className="font-medium text-slate-900">{parent.referralCode}</dd></div>
                )}
              </>
            )}
          </dl>
          )}
        </section>
        )}

        {editing === "course" ? (
          <EditingSection title="Edit Selected Courses">
          <Stage3CourseSelection
            context={context}
            userId={userId}
            inReview
            standardId={course?.standardId ? String(course.standardId) : null}
            onNext={() => finishEdit("course")}
            onBack={() => setEditing(null)}
            onSessionExpired={onSessionExpired}
          />
          </EditingSection>
        ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <SectionHeader
            title="Selected Courses"
            open={openSectionFor() === "course"}
            onToggle={() => toggleSection("course")}
            onEdit={data.customPaymentEnabled ? undefined : () => startEdit("course")}
          />
          {openSectionFor() === "course" && (
          <div className="px-4 py-3">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">{course?.standardName}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Course Name</th>
                  {!hideCredits && <th className="py-1 text-right">Credit</th>}
                </tr>
              </thead>
              <tbody>
                {(course?.courseDTO || []).map((c, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    <td className="py-1">{c.courseName}</td>
                    {!hideCredits && <td className="py-1 text-right">{c.creditScore}</td>}
                  </tr>
                ))}
              </tbody>
              {!hideCredits && (
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold">
                    <td className="py-1">Total Credit</td>
                    <td className="py-1 text-right">{course?.totalCredit}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          )}
        </section>
        )}

        {paymentPending && fee && editing !== "course" && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="bg-primary px-4 py-3 text-white">
              <h2 className="text-sm font-semibold">{data.feeSetionTitile || "Fee Payment"}</h2>
            </header>
            <div className="px-4 py-4 text-sm">
              {data.customPaymentEnabled ? (
                <CustomPlanTable fee={fee} />
              ) : (
                <FeePaymentPlans
                  fee={fee}
                  options={planOptions}
                  selected={currentPlan}
                  onSelect={setSelectedPlan}
                  disabled={busy}
                  standardId={course?.standardId}
                  isFlexOrDual={["ONE_TO_ONE_FLEX", "DUAL_DIPLOMA"].includes(getLearningProgramBackendValue(context.learningProgram))}
                />
              )}
            </div>
          </section>
        )}
      </div>

      <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
        {onBack && (
          <Button type="button" variant="outline" onClick={() => onBack(3)} disabled={busy || !!editing}>
            Back
          </Button>
        )}
        {paymentOption.isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : paymentPending && paymentUnderReview ? null : paymentPending ? (
        ) : paymentPending && paymentUnderReview ? null : paymentPending ? (
          <Button type="button" onClick={confirmAndPay} disabled={busy || !!editing} className="rounded-md bg-primary px-6 hover:bg-primary/90">
            {busy ? "Please wait…" : "Confirm & Pay"}
          </Button>
        ) : (
          <Button type="button" onClick={() => setConfirmSubmit(true)} disabled={busy || !!editing} className="rounded-md bg-primary px-6 hover:bg-primary/90">
            {busy ? "Please wait…" : "Submit Application"}
          </Button>
        )}
      </div>

      <ConfirmDialog
        request={confirmSubmit ? { title: "Submit application", message: <p>Are you sure you want to submit your application?</p>, confirmLabel: "Yes, submit" } : null}
        onResolve={(ok) => (ok ? confirmSubmitApplication() : setConfirmSubmit(false))}
      />
      <FlaggedSeatsModal
        open={!!flaggedModal}
        onOpenChange={(open) => !open && setFlaggedModal(null)}
        schoolName={context.schoolName}
        sessionName={flaggedModal?.sessionName}
      />
      <InfoModal open={!!infoMessage && !infoDismissed} onOpenChange={(open) => !open && setInfoDismissed(true)}>
        {infoMessage}
      </InfoModal>
      <InfoModal open={!!submittedMessage} onOpenChange={(open) => !open && setSubmittedMessage(null)}>
        {submittedMessage}
      </InfoModal>
      <PaymentGatewayPickerModal
        open={!!gatewayPicker}
        onOpenChange={(open) => !open && setGatewayPicker(null)}
        details={gatewayPicker?.details}
        details={gatewayPicker?.details}
        airwallexMethods={gatewayPicker?.methods}
        payerCountryCode={gatewayPicker?.countryCode}
        schoolNumericId={context.schoolNumericId}
        schoolName={context.schoolName}
        payerCountryCode={gatewayPicker?.countryCode}
        schoolNumericId={context.schoolNumericId}
        schoolName={context.schoolName}
        busy={invokeGateway.isPending}
        onPay={launchGateway}
        onUploadProof={uploadProof}
        onSubmitOffline={submitOffline}
      />
      <Dialog open={paymentUnderReview}>
        <DialogContent showCloseButton={false} className="text-center sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Payment Under Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-700">
            <h2 className="text-lg font-semibold text-slate-900">Your payment is under review.</h2>
            <p>
              {data.enrollmentType !== "REGISTRATION_REGISTER" && "You will be able to access the dashboard once the payment is received. "}
              You can contact us at{" "}
              <b>
                <a href={`mailto:${data.contactEmail}`} className="underline">
                  {data.contactEmail}
                </a>
              </b>{" "}
              for more information
            </p>
            <Button type="button" onClick={() => onSessionExpired?.()}>
              Log out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        onPay={launchGateway}
        onUploadProof={uploadProof}
        onSubmitOffline={submitOffline}
      />
      <Dialog open={paymentUnderReview}>
        <DialogContent showCloseButton={false} className="text-center sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Payment Under Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-700">
            <h2 className="text-lg font-semibold text-slate-900">Your payment is under review.</h2>
            <p>
              {data.enrollmentType !== "REGISTRATION_REGISTER" && "You will be able to access the dashboard once the payment is received. "}
              You can contact us at{" "}
              <b>
                <a href={`mailto:${data.contactEmail}`} className="underline">
                  {data.contactEmail}
                </a>
              </b>{" "}
              for more information
            </p>
            <Button type="button" onClick={() => onSessionExpired?.()}>
              Log out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
