"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BiSolidBookAdd, BiSolidPencil, BiSolidUserDetail } from "react-icons/bi";
import { ChevronDown } from "lucide-react";
import { FaNotesMedical } from "react-icons/fa6";
import { IoMdPeople } from "react-icons/io";
import { FullScreenLoader } from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/student-enroll/ConfirmDialog";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { CustomPlanTable, FeePaymentPlans, FeeSummaryCard } from "@/components/student-enroll/FeePaymentPlans";
import { InfoModal } from "@/components/student-enroll/InfoModal";
import { ParentInlineEdit, StudentInlineEdit } from "@/components/student-enroll/ReviewInlineEdit";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { launchPaymentGatewayForm } from "@/services/studentSignupClientApi";
import { getPaymentPaidStatus as getPaymentPaidStatusAction } from "@/services/studentSignupBackendApi";
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
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import { isDummyStudentMode, showDummyStripeCheckoutPage } from "@/utils/paymentGatewayChecks";

const ROW_CLASS = "md:overflow-hidden md:rounded-lg md:border md:border-slate-200 md:bg-white";

// Gray placeholder blocks matching the three review rows (same idea as Stage 1's FieldSkeleton),
// shown under the real heading while get-student-review-details loads.
function ReviewDetailsSkeleton() {
  return (
    <div className="space-y-3">
      <h2 className="hidden text-lg font-semibold text-slate-900 md:block">Kindly Review your details</h2>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-[62px] w-full animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  );
}

// Right column placeholder: two plan cards and the Fee Summary card.
function PaymentOptionsSkeleton() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Choose Payment Option</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-[80px] animate-pulse rounded-xl bg-slate-200" />
        <div className="h-[80px] animate-pulse rounded-xl bg-slate-200" />
      </div>
      <div className="mt-5 h-[360px] animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}

// Accordion body: animates its height (grid row 0fr -> 1fr) instead of mounting/unmounting, so it
// opens and closes smoothly. Collapsed content is inert so it cannot be tabbed into.
function Collapse({ open, children }) {
  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * Accordion header — legacy `<h4 class="a-title">` with an Edit button
 * (.edit-btn) and a Review button (.review-btn). The whole header toggles the
 * section, like the old `.accordion .a-title` click handler; Edit stops the
 * click bubbling so it doesn't also toggle.
 */
function SectionHeader({ title, icon: Icon, open, onToggle, onEdit }) {
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
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 md:rounded-none md:border-0 md:py-3"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary md:h-10 md:w-10">
          <Icon className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
        </span>
        <h2 className="text-[clamp(12px,3.5vw,15px)] font-bold text-slate-900 md:text-base md:font-semibold">{title}</h2>
      </div>
      <ChevronDown
        className={`h-4 w-4 shrink-0 text-slate-900 transition-transform duration-300 motion-reduce:transition-none md:hidden ${open ? "rotate-180" : ""}`}
        strokeWidth={3}
        aria-hidden="true"
      />
      <div className="hidden gap-2 md:flex">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          Review
        </Button>
        {onEdit && (
          <Button
            type="button"
            className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Edit
          </Button>
        )}
      </div>
    </header>
  );
}

// Mobile-only "Edit Details  ✎ Edit" line above an expanded section (the header's Edit button is desktop-only).
function MobileEditRow({ onEdit }) {
  if (!onEdit) return null;
  return (
    <div className="mt-4 flex items-center justify-between md:hidden">
      <h3 className="text-sm font-bold text-slate-900">Edit Details</h3>
      <button type="button" onClick={onEdit} className="flex items-center gap-1.5 text-sm font-semibold text-primary">
        <BiSolidPencil className="h-4 w-4" aria-hidden="true" /> Edit
      </button>
    </div>
  );
}

// Gateways with no server-side redirect (inline card entry / offline methods) — legacy
// CLIENT_SIDE_GATEWAYS; matched case-insensitively, gateway names are cased inconsistently.
const CLIENT_SIDE_GATEWAYS = ["wellsfargo", "convera", "yoco", "wiretransfer", "cash", "paypal transfer", "smoovpay"];

// getPaymentPaidStatus() polling in commonPaymentGateway.js: every 10s, gives up after 10 checks.
const PAID_STATUS_POLL_MS = 10000;
const PAID_STATUS_MAX_CHECKS = 10;

const GENERIC_ERROR ="Something went wrong. Please check your connection and try again.";

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
// choose-payment-plan wants the legacy pay-mode word, not the rule engine's radio id
// (displayScholorshipDetails() in signupStudentStage3.js maps dtl-* -> mode).
const PAY_MODE_BY_KEY = {
  "dtl-one": "annually",
  "dtl-two": "twoMonthly",
  "dtl-three": "threeMonthly",
  "dtl-four": "fourMonthly",
  "dtl-five": "fiveMonthly",

};
const PAY_MODE_BY_MONTHS = { 2: "twoMonthly", 3: "threeMonthly", 4: "fourMonthly", 5: "fiveMonthly", 6: "sixMonthly" };
const MONTHS_BY_PAY_MODE = { twoMonthly: 2, threeMonthly: 3, fourMonthly: 4, fiveMonthly: 5, sixMonthly: 6 };

// The installment plan has one variant per monthly-fee object the backend sends
// (monthlyFeeDetails, fourMonthlyFeeDetails, fiveMonthlyFeeDetails); more than one -> month chips.
function buildMonthlyVariants(fee) {
  const make = (details, fixedMode) => {
    const mode = fixedMode || PAY_MODE_BY_KEY[details.paymentKey] || PAY_MODE_BY_MONTHS[details.monthlyFees?.length] || "threeMonthly";
    const months = details.monthlyFees?.length || MONTHS_BY_PAY_MODE[mode];
    return { key: mode, mode, months, label: months ? `${months} Months` : "Installments", amount: details.payableFeeString, details };
  };
  return [
    fee.monthlyFeeDetails && make(fee.monthlyFeeDetails),
    fee.fourMonthlyFeeDetails && make(fee.fourMonthlyFeeDetails, "fourMonthly"),
    fee.fiveMonthlyFeeDetails && make(fee.fiveMonthlyFeeDetails, "fiveMonthly"),
  ]
    .filter(Boolean)
    .sort((x, y) => (x.months || 0) - (y.months || 0));
}

function buildPlanOptions(fee) {
  if (!fee) return [];
  const options = [];
  if (fee.bookASeatOpted === 1 && fee.enrollmentFee?.enrollmentFee > 0 && !fee.bookAnEnrollmentPaidStatus) {
    options.push({
      key: "registration",
      kind: "registration",
      mode: "registration",
      label: "Reserve an enrollment Seat",
      amount: fee.enrollmentFee.enrollmentFeeString,
    });
  }
  if (fee.oneTimePayment) {
    const discount = fee.oneTimePayment.paymentOptionDiscount > 0;
    options.push({
      key: fee.oneTimePayment.paymentKey || "annual",
      kind: "annual",
      mode: "annually",
      label: discount
        ? `Pay ${fee.oneTimePayment.paymentMode} & save ${fee.oneTimePayment.paymentOptionDiscountString}`
        : `Pay ${fee.oneTimePayment.paymentMode}`,
      amount: fee.oneTimePayment.payableFeeString,
      badge: discount ? "Best Value" : undefined,
    });
  }
  const variants = buildMonthlyVariants(fee);
  if (variants.length > 0) {
    options.push({
      key: fee.monthlyFeeDetails?.paymentKey || "monthly",
      kind: "monthly",
      mode: variants[0].mode,
      label: "Pay Easy installments",
      amount: variants[0].amount,
      variants,
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
  const reviewQuery = useStudentReviewDetails({
    context,
    userId,
    // SignupStudentStage6Preview.jsp calls callForReviewAndPaymentSelection('N').
    // A confirmed custom plan must bypass the API's reloadRequired=Y redirect guard.
    reloadRequired: context.customPaymentEnabled ? "N" : "Y",
  });
  // API order on this screen: get-payment-details and choose-payment-plan run
  // on Stage 3's "Continue" (useProceedToReview), then get-student-review-details
  // above, then enrollment-stage-status — held back until the review call has
  // succeeded so it always fires 4th, then repeats every 3 min (getSignupStatus()).
  const stageStatus = useSignupStageStatusPoll({
    context,
    uniqueId,
    // Custom plans always return the backend's SSO redirect from stage-status;
    // polling it here would send the user straight back into this page forever.
    enabled: reviewQuery.isSuccess && !context.customPaymentEnabled,
  });
  const paymentOption = useShowPaymentOption({ context, userId });
  const choosePlan = useChoosePaymentPlan({ context, userId });
  const submitApplication = useSubmitApplication({ context, userId });
  const proceedToDashboard = useProceedToDashboard({ context, userId });
  const gatewayOptions = usePaymentGatewayOptions({ context });
  const invokeGateway = useInvokePaymentGateway({ context });
  const airwallexMethods = useAirwallexPaymentMethods({ context });
  const offlinePayment = useOfflinePayment({ context, uniqueId });

  const [notice, setNotice] = useState(null);
  const [flaggedModal, setFlaggedModal] = useState(null);
  const [infoDismissed, setInfoDismissed] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [gatewayPicker, setGatewayPicker] = useState(null);
  // Cash / Wire Transfer submitted: "Payment Under Review" (#logout_modal_logout) replaces Confirm & Pay.
  const [paymentUnderReview, setPaymentUnderReview] = useState(false);
  // Pay Now clicked: the modal stays open (busy) until the browser actually leaves for the gateway.
  const [launching, setLaunching] = useState(false);
  // paymentUnderProcessOverlay() / paymentStatusResponseModal(): shown while polling a gateway
  // that opens away from this page (openSelf false), and when that poll ends unpaid.
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentIncomplete, setPaymentIncomplete] = useState(false);
  const paidPollRef = useRef({ timer: null, count: 0 });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
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
  const preferredMode = data?.signupCourse?.payMode;
  const preferredOption = planOptions.find(
    (option) => option.mode === preferredMode || option.variants?.some((variant) => variant.mode === preferredMode)
  );
  const defaultPlan = preferredOption?.key ?? planOptions[0]?.key;
  const currentPlan = selectedPlan ?? defaultPlan;
  const currentOption = planOptions.find((option) => option.key === currentPlan);
  // Installment variant (3 / 4 / 5 months): the student's pick, else the saved mode, else the first.
  const currentVariant =
    selectedVariant ??
    (currentOption?.variants?.some((variant) => variant.mode === preferredMode) ? preferredMode : currentOption?.variants?.[0]?.mode);
  const currentPayMode = currentOption?.variants ? currentVariant : currentOption?.mode;

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
    if (!stageStatusData || context.customPaymentEnabled) return;
    if (stageStatusData.status === STATUS_SESSION_OUT) {
      onSessionExpired?.();
    } else if (stageStatusData.status === STATUS_SUCCESS && stageStatusData.redirectUri) {
      window.location.replace(stageStatusData.redirectUri);
    }
  }, [stageStatusData, context.customPaymentEnabled, onSessionExpired]);

  // Coming back from the payment gateway (browser Back / bfcache) restores this page exactly as it
  // was left — with the payment modal open and busy. Reset it when the page is restored from the cache.
  useEffect(() => {
    const onPageShow = (event) => {
      if (!event.persisted) return;
      setLaunching(false);
      setGatewayPicker(null);
      setNotice((current) => (current?.tone === "info" ? null : current));
    };
    window.addEventListener("pageshow", onPageShow);
    const poll = paidPollRef.current;
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      clearInterval(poll.timer);
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

  // Review button / header click: expand or collapse the read-only details.
  function toggleSection(type) {
    setOpenOverride(openSectionFor() === type ? null : type);
  }

  function startEdit(type) {
    setEditing(type);
  }

  function finishEdit(type, fields) {
    if (type === "student" && fields) saveWizardStudentFields(context.schoolUUID, userId, fields);
    if (type === "parent" && fields) saveWizardParentFields(context.schoolUUID, userId, fields);
    setEditing(null);
    setSelectedPlan(null);
    setSelectedVariant(null);
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
      let userPaymentDetailsId = data.userPaymentDetailsId;
      if (!data.customPaymentEnabled) {
        if (!currentPlan) {
          setNotice({ tone: "error", text: "Please choose a fee payment plan." });
          return;
        }
        const plan = await choosePlan.mutateAsync(isKnownPaymentMode(currentPayMode) ? currentPayMode : "annually");
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
      let methods = [];
      if (gateways.some((gateway) => gateway.name === "Airwallex")) {
        try {
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
    } catch (err) {
      console.error("Stage4ReviewPayment confirmAndPay failed:", err);
      setNotice({ tone: "error", text: GENERIC_ERROR });
    }
  }

  // invokePaymentGateway() in commonPaymentGateway.js: every gateway is launched through a plain
  // top-level GET form to common/launch-payment-gateway, except the client-side ones, which have
  // no server redirect and go through the JSON invoke call.
  function stopPaidStatusPoll() {
    clearInterval(paidPollRef.current.timer);
    paidPollRef.current.timer = null;
  }

  // flushPaymentInterval(): stop polling, drop the modal + overlay, show "Payment Incomplete".
  function flushPaidStatusPoll() {
    stopPaidStatusPoll();
    setGatewayPicker(null);
    setPaymentProcessing(false);
    setPaymentIncomplete(true);
  }

  // getPaymentPaidStatus(): only a status "1" reply counts as a check; SUCCESS ends the wait,
  // FAILURE (or more than PAID_STATUS_MAX_CHECKS checks) ends it as incomplete.
  async function checkPaidStatus(userPaymentDetailsId, schoolId) {
    if (!userPaymentDetailsId || !schoolId) return;
    try {
      const response = await getPaymentPaidStatusAction(context.schoolUUID, { userPaymentDetailsId, schoolId });
      if (response?.status !== STATUS_SUCCESS) return;
      if (paidPollRef.current.count > PAID_STATUS_MAX_CHECKS) {
        flushPaidStatusPoll();
        return;
      }
      paidPollRef.current.count += 1;
      if (response.statusCode === "SUCCESS") {
        stopPaidStatusPoll();
        setGatewayPicker(null);
        setPaymentProcessing(false);
        reviewQuery.refetch();
      } else if (response.statusCode === "FAILURE") {
        flushPaidStatusPoll();
      }
    } catch (err) {
      console.error("Stage4ReviewPayment get-payment-paid-status failed:", err);
    }
  }

  function startPaidStatusPoll(userPaymentDetailsId, schoolId) {
    stopPaidStatusPoll();
    paidPollRef.current.count = 0;
    setPaymentProcessing(true);
    paidPollRef.current.timer = setInterval(
      () => checkPaidStatus(userPaymentDetailsId, schoolId),
      PAID_STATUS_POLL_MS
    );
  }

  async function launchGateway(gateway) {
    if (isDummyStudentMode()) {
      showDummyStripeCheckoutPage();
      return;
    }
    setNotice(null);
    const details = gatewayPicker.details;
    const payload = {
      location: getLocationValue(),
      browserDetails: details.upid,
      userPaymentDetailsId: details.upid,
      paidByUserId: details.paidByUserId,
      schoolId: details.schoolId,
      schoolIdOfPaymentGateway: details.schoolIdOfPaymentGateway,
      paymentGateway: gateway.name,
      initiateVia: window.location.href.includes("fee-receipt") ? "Link" : "",
      backUrl: window.location.href,
      applyingFrom: "nextjs",
    };
    // Pay Now: the payment modal stays open (legacy leaves #paymentOptionsModal up) while the
    // browser goes to the gateway; it is only closed if the launch fails.
    setLaunching(true);
    if (!CLIENT_SIDE_GATEWAYS.includes((gateway.name || "").toLowerCase())) {
      setNotice({ tone: "info", text: "Please wait while redirecting to payment gateway..." });
      launchPaymentGatewayForm(context.schoolUUID, payload);
      return;
    }
    // isPopupBlocked(): legacy probes window.open('', '_blank') before the AJAX invoke.
    const probe = window.open("", "_blank");
    if (!probe || probe.closed || typeof probe.closed === "undefined") {
      setLaunching(false);
      setNotice({ tone: "error", text: "Popup blocked. Please allow popups and try again." });
      return;
    }
    probe.close();
    try {
      const response = await invokeGateway.mutateAsync(payload);
      if (response?.status !== STATUS_SUCCESS || !response.details?.redirectUrl) {
        setLaunching(false);
        setGatewayPicker(null);
        handleFailure(response, "Could not start the payment. Please try again.");
        return;
      }
      setNotice({ tone: "info", text: "Please wait while redirecting to payment gateway..." });
      if (response.details.openSelf) {
        window.location.replace(response.details.redirectUrl);
      } else {
        startPaidStatusPoll(payload.userPaymentDetailsId, payload.schoolId);
        window.location.href = response.details.redirectUrl;
      }
    } catch (err) {
      console.error("Stage4ReviewPayment launchGateway failed:", err);
      setLaunching(false);
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

  if (reviewQuery.isLoading) {
    return (
      <div className="mt-6 grid gap-x-8 gap-y-8 lg:grid-cols-[555fr_723fr]" aria-busy="true">
        <ReviewDetailsSkeleton />
        {paymentOption.data !== "N" && <PaymentOptionsSkeleton />}
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
        <p className="text-sm font-semibold text-red-600">{message}</p>
        {failure?.statusCode !== STATUS_REDIRECT_TO_DASHBOARD && failure?.statusCode !== STATUS_ELIGIBLE_CUSTOM_PLAN && (
          <div className="mt-6 flex gap-3">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack} className="cursor-pointer">
                Back
              </Button>
            )}
            <Button type="button" onClick={() => reviewQuery.refetch()} disabled={reviewQuery.isFetching} className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90">
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
  // parentDetailsPreview() in signupStudentContent.js: the parent section's title depends on the program.
  const parentTitle =
    getLearningProgramBackendValue(context.learningProgram) === "ONE_TO_ONE_FLEX"
      ? "Academic & Communication Details"
      : student?.courseProviderId === 39
        ? "Communication Details"
        : "Parent/Guardian Details";
  const paymentPending = showPaymentOption === "Y";

  const showFee = paymentPending && fee;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 md:mb-0 md:rounded-none md:border-0 md:bg-transparent md:p-0">
      <h1 className="mb-4 text-center text-1.5xl font-extrabold text-slate-900 sm:text-2xl md:hidden">Review Your Details &amp; Payment</h1>
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 text-sm font-semibold ${notice.tone === "error" ? "text-red-600" : notice.tone === "success" ? "text-emerald-700" : "text-slate-600"}`}
        >
          {notice.text}
        </p>
      )}

      <div
        className={`grid gap-x-8 gap-y-4 md:mt-6 md:gap-y-8 ${
          showFee ? "lg:grid-cols-[555fr_723fr]" : "mx-auto max-w-2xl"
        } ${busy ? "opacity-60" : ""}`}
        aria-busy={busy}
      >
        <div className="space-y-2 md:space-y-3">
        <h2 className="hidden text-lg font-semibold text-slate-900 md:block">Kindly Review your details</h2>
        {editing === "student" && (
          <StudentInlineEdit
            context={context}
            userId={userId}
            student={student}
            standardId={course?.standardId}
            onSaved={(fields) => finishEdit("student", fields)}
            onCancel={() => setEditing(null)}
            onSessionExpired={onSessionExpired}
          />
        )}
        <section className={ROW_CLASS}>
          <SectionHeader
            title="Student Details"
            icon={BiSolidUserDetail}
            open={openSectionFor() === "student"}
            onToggle={() => toggleSection("student")}
            onEdit={data.customPaymentEnabled ? undefined : () => startEdit("student")}
          />
          <Collapse open={openSectionFor() === "student"}>
          <MobileEditRow onEdit={data.customPaymentEnabled ? undefined : () => startEdit("student")} />
          <dl className="py-2 text-[13px] md:divide-y md:divide-slate-100 md:border-t md:border-slate-100 md:px-4 md:text-sm">
            <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Name</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{fullName(student)}</dd></div>
            {course?.standardName && (
              <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Grade</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{course.standardName}</dd></div>
            )}
            <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Date of Birth</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{student?.dob}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Gender</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{student?.genderName}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Email</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{student?.communicationEmail}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Phone Number</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{phoneLine(student)}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Nationality</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{student?.nationality}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Country | State | City</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{locationLine(student)}</dd></div>
          </dl>
          </Collapse>
        </section>

        {editing === "parent" && (
          <ParentInlineEdit
            context={context}
            userId={userId}
            parent={parent}
            title={parentTitle}
            onSaved={(fields) => finishEdit("parent", fields)}
            onCancel={() => setEditing(null)}
            onSessionExpired={onSessionExpired}
          />
        )}
        <section className={ROW_CLASS}>
          <SectionHeader
            title={parentTitle}
            icon={IoMdPeople}
            open={openSectionFor() === "parent"}
            onToggle={() => toggleSection("parent")}
            onEdit={data.customPaymentEnabled ? undefined : () => startEdit("parent")}
          />
          <Collapse open={openSectionFor() === "parent"}>
          <MobileEditRow onEdit={data.customPaymentEnabled ? undefined : () => startEdit("parent")} />
          <dl className="px-1 py-2 text-base md:divide-y md:divide-slate-100 md:border-t md:border-slate-100 md:px-4 md:text-sm">
            {parent?.workingProfessionName ? (
              <>
                <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Student or a working professional</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{parent.workingProfessionName}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">School/College/Organization</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{parent.institutionName}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Country</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{parent.institutionCountryName}</dd></div>
              </>
            ) : (
              <>
                <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Name</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{fullName(parent)}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Relation with student</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{parent?.relationshipName}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Email</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{parent?.email || "N/A"}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Phone Number</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{phoneLine(parent)}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Country | State | City</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{locationLine(parent)}</dd></div>
                {parent?.referralCode && (
                  <div className="flex justify-between gap-4 py-2"><dt className="text-slate-500">Referral Code</dt><dd className="text-right font-bold text-slate-900 md:font-medium">{parent.referralCode}</dd></div>
                )}
              </>
            )}
          </dl>
          </Collapse>
        </section>

        <section className={ROW_CLASS}>
          <SectionHeader
            title="Selected Courses"
            icon={FaNotesMedical}
            open={openSectionFor() === "course"}
            onToggle={() => toggleSection("course")}
            onEdit={data.customPaymentEnabled || !onBack ? undefined : () => onBack(3)}
          />
          <Collapse open={openSectionFor() === "course"}>
          <MobileEditRow onEdit={data.customPaymentEnabled || !onBack ? undefined : () => onBack(3)} />
          <div className="py-3 md:border-t md:border-slate-100 md:px-4">
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
          </Collapse>
        </section>

        </div>

        {showFee && (
          <div>
            <hr className="mb-4 border-slate-200 md:hidden" />
            <h2 className="hidden text-lg font-semibold text-slate-900 md:block">
              {data.customPaymentEnabled ? data.feeSetionTitile || "Fee Payment" : "Choose Payment Option"}
            </h2>
            <div className="md:mt-3">
              {data.customPaymentEnabled ? (
                <FeeSummaryCard>
                  <CustomPlanTable fee={fee} />
                </FeeSummaryCard>
              ) : (
                <FeePaymentPlans
                  fee={fee}
                  options={planOptions}
                  selected={currentPlan}
                  onSelect={setSelectedPlan}
                  selectedVariant={currentVariant}
                  onSelectVariant={setSelectedVariant}
                  disabled={busy}
                  standardId={course?.standardId}
                  isFlexOrDual={["ONE_TO_ONE_FLEX", "DUAL_DIPLOMA"].includes(getLearningProgramBackendValue(context.learningProgram))}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: a fixed action bar above the footer (WhatsApp left, Back / Final Step right). From md
          it is the centred button row at the end of the content. */}
      <MobileActionBar context={context} className="md:mt-10 md:pt-6">
          {onBack && !data.customPaymentEnabled && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onBack(3)}
              disabled={busy || !!editing}
              className="cursor-pointer"
            >
              Back
            </Button>
          )}
          {paymentOption.isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : paymentPending && paymentUnderReview ? null : paymentPending ? (
            <Button type="button" onClick={confirmAndPay} disabled={busy || !!editing} className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90">
              {busy ? "Please wait…" : "Final Step"}
            </Button>
          ) : (
            <Button type="button" onClick={() => setConfirmSubmit(true)} disabled={busy || !!editing} className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90">
              {busy ? "Please wait…" : "Submit Application"}
            </Button>
          )}
      </MobileActionBar>

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
        airwallexMethods={gatewayPicker?.methods}
        payerCountryCode={gatewayPicker?.countryCode}
        schoolNumericId={context.schoolNumericId}
        schoolName={context.schoolName}
        busy={invokeGateway.isPending || launching}
        onPay={launchGateway}
        onUploadProof={uploadProof}
        onSubmitOffline={submitOffline}
      />
      {paymentProcessing && <FullScreenLoader message="Payment is under process..." />}
      <Dialog open={paymentIncomplete} onOpenChange={(open) => !open && setPaymentIncomplete(false)}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Oops!</DialogTitle>
          </DialogHeader>
          <h3 className="text-lg font-semibold text-red-600">Payment Incomplete</h3>
        </DialogContent>
      </Dialog>
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
            <Button type="button" onClick={() => onSessionExpired?.()} className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90">
              Log out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
