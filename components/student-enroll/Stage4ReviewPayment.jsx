"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BiSolidBookAdd, BiSolidUserDetail } from "react-icons/bi";
import { Info } from "lucide-react";
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
import { getPaymentPaidStatus } from "@/services/studentSignupBackendApi";
import { useShowPaymentOption } from "@/hooks/useCourseSelection";
import { saveWizardParentFields, saveWizardStudentFields } from "@/utils/wizardStorage";
import { getOtherRelation, getPrimaryParentLabels, loadOtherParentCache } from "@/utils/parentRelation";
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
      <h2 className="hidden text-lg font-semibold text-black md:block">Kindly Review your details</h2>
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
      <h2 className="text-base font-semibold text-black md:text-lg">Select Payment Option</h2>
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
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 max-[367px]:gap-2 max-[367px]:px-2 md:rounded-none md:border-0 md:py-3"
    >
      <div className="flex min-w-0 items-center gap-2 md:gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary max-[367px]:h-7 max-[367px]:w-7 md:h-10 md:w-10">
          <Icon className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
        </span>
        <h2 className="text-[clamp(12px,3.5vw,15px)] font-bold text-black md:text-base md:font-semibold">{title}</h2>
      </div>
      <div className="flex shrink-0 gap-2 max-[367px]:gap-1">
        <Button
          type="button"
          variant="outline"
          className="h-8 cursor-pointer px-3 text-xs max-[367px]:h-7 max-[367px]:px-2 md:h-9 md:px-4 md:text-sm"
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
            className="h-8 rounded-md cursor-pointer bg-primary px-3 text-xs hover:bg-primary/90 max-[367px]:h-7 max-[367px]:px-2 md:h-9 md:px-4 md:text-sm"
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

// getPaymentPaidStatus() polling in commonPaymentGateway.js: every 10s, gives up after 10 checks.
const PAID_STATUS_POLL_MS = 10000;
const PAID_STATUS_MAX_CHECKS = 10;

const GENERIC_ERROR ="Something went wrong. Please check your connection and try again.";

// One "label  value" line of the review tables. Labels mirror the Step 1 / Step 2 form fields.
function ReviewRow({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-bold text-black md:font-medium">{children}</dd>
    </div>
  );
}

function phoneLine(person) {
  if (!person?.contactNumber) return "--";
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

function buildPlanOptions(fee, currencyCode) {
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
        ? `Pay in Full — Save ${currencyCode || "USD"} ${String(fee.oneTimePayment.paymentOptionDiscountString ?? "").replace(/^[^\d]+/, "")}`
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
      label: "Pay in Installments",
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
  const [applicationSubmittedLocally, setApplicationSubmittedLocally] = useState(false);
  const [submittedContactEmail, setSubmittedContactEmail] = useState("");
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

  const planOptions = useMemo(() => buildPlanOptions(data?.feePaymentDetailsResponse, data?.currencyIsoCode), [data]);

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
    // Enrollment already completed: reload like legacy does — enrollment/process then answers
    // REDIRECT and useEnrollmentContext sends the student to their dashboard.
    if (failure.statusCode === STATUS_REDIRECT_TO_DASHBOARD) {
      window.location.reload();
      return;
    }
    const baseUrl = resolveBackendOrigin();
    if (failure.statusCode === STATUS_ELIGIBLE_CUSTOM_PLAN && baseUrl) {
      window.location.href = `${baseUrl}/${context.schoolUUID}/student/enrollment/process/${userId}`;
    }
  }, [failure, context?.schoolUUID, userId, onSessionExpired]);

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
    if (response.statusCode === STATUS_REDIRECT_TO_DASHBOARD) {
      window.location.reload();
      return;
    }
    const baseUrl = resolveBackendOrigin();
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

  // Every selected gateway is launched through common/invoke-payment-gateway.
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
      const response = await getPaymentPaidStatus(context.schoolUUID, { userPaymentDetailsId, schoolId });
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
      // Legacy signupStudentStage3.js#callForApplicationSubmit keys this off
      // $('#signupType').val() === 'Online'. "Online" = student self-signup
      // (incl. partner URLs) → waits for admin/partner to Move to Dashboard.
      // "Offline" = admin/B2B-created student → proceeds straight to dashboard.
      const isOffline = context.signupType === "Offline";
      const response = isOffline ? await proceedToDashboard.mutateAsync() : await submitApplication.mutateAsync();
      if (response?.status !== STATUS_SUCCESS) {
        handleFailure(response, "Could not submit your application. Please try again.");
        return;
      }
      onOfflineSignup?.();
      setSubmittedContactEmail(response?.details?.contactEmail || data.contactEmail || "");
      setApplicationSubmittedLocally(true);
    } catch (err) {
      console.error("Stage4ReviewPayment submit failed:", err);
      setNotice({ tone: "error", text: GENERIC_ERROR });
    }
  }

  if (reviewQuery.isLoading || paymentOption.isLoading) {
    return (
      <div className="mt-6 grid gap-x-8 gap-y-8 lg:grid-cols-[555fr_723fr]" aria-busy="true">
        <ReviewDetailsSkeleton />
        {paymentOption.data !== "N" && <PaymentOptionsSkeleton />}
        <FullScreenLoader />
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
        : "Parent|Guardian Details";
  // parentDetailsPreview(): rows are titled after the relation ("Father's Name"); Father / Mother also list
  // the other parent, which the review response does not carry, so it comes from the client-side cache.
  const parentLabels = getPrimaryParentLabels(parent?.relationship);
  const otherRelation = getOtherRelation(parent?.relationship);
  const otherParent = otherRelation ? loadOtherParentCache(context.schoolUUID, userId)[otherRelation] : null;
  const paymentPending = showPaymentOption === "Y";

  const showFee = paymentPending && fee;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 md:mb-0 md:rounded-none md:border-0 md:bg-transparent md:p-0">
      <h1 className="mb-4 text-center text-xl font-bold text-black sm:text-2xl md:hidden">Review Your Details &amp; Pay</h1>
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 text-sm font-semibold ${notice.tone === "error" ? "text-red-600" : notice.tone === "success" ? "text-emerald-900" : "text-slate-600"}`}
        >
          {notice.text}
        </p>
      )}

      <div
        className={`grid grid-cols-1 gap-x-8 gap-y-4 md:mt-6 md:gap-y-8 ${
          showFee ? "lg:grid-cols-[555fr_723fr]" : "mx-auto max-w-2xl"
        } ${busy ? "opacity-60" : ""}`}
        aria-busy={busy}
      >
        <div className="min-w-0 space-y-2 md:space-y-3">
        <h2 className="hidden text-lg font-semibold text-black md:block">Kindly Review your details</h2>
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
          <dl className="py-2 text-sm md:divide-y md:divide-slate-100 md:border-t md:border-slate-100 md:px-4 md:text-sm">
            <ReviewRow label="Student's First Name">{student?.firstName}</ReviewRow>
            <ReviewRow label="Student's Last Name">{student?.lastName}</ReviewRow>
            {course?.standardName && <ReviewRow label="Select Grade">{course.standardName}</ReviewRow>}
            <ReviewRow label="Date of Birth">{student?.dob}</ReviewRow>
            <ReviewRow label="Select Gender">{student?.genderName}</ReviewRow>
            <ReviewRow label="Student's Email">{student?.communicationEmail}</ReviewRow>
            <ReviewRow label="Mobile Number">{phoneLine(student)}</ReviewRow>
            <ReviewRow label="Nationality">{student?.nationality}</ReviewRow>
            <ReviewRow label="Country (Student's Current Location)">{student?.countryName}</ReviewRow>
            <ReviewRow label="Province / State">{student?.stateName}</ReviewRow>
            <ReviewRow label="City">{student?.cityName}</ReviewRow>
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
          <dl className="px-1 py-2 text-sm md:divide-y md:divide-slate-100 md:border-t md:border-slate-100 md:px-4 md:text-sm">
            {parent?.workingProfessionName ? (
              <>
                <ReviewRow label="Are you a student or a working professional?">{parent.workingProfessionName}</ReviewRow>
                <ReviewRow label="School / College / Organization Name">{parent.institutionName}</ReviewRow>
                <ReviewRow label="Country of School / College / Organization">{parent.institutionCountryName}</ReviewRow>
              </>
            ) : (
              <>
                <ReviewRow label="Relationship to Student">{parent?.relationshipName}</ReviewRow>
                <ReviewRow label={parentLabels.firstName}>{parent?.firstName}</ReviewRow>
                <ReviewRow label={parentLabels.lastName}>{parent?.lastName}</ReviewRow>
                <ReviewRow label={parentLabels.mobile}>{phoneLine(parent)}</ReviewRow>
                {otherRelation && (
                  <>
                    <ReviewRow label={`${otherRelation}'s First Name`}>{otherParent?.firstName || "--"}</ReviewRow>
                    <ReviewRow label={`${otherRelation}'s Last Name`}>{otherParent?.lastName || "--"}</ReviewRow>
                    <ReviewRow label={`${otherRelation}'s Mobile Number`}>
                      {otherParent?.contactNumber ? phoneLine({ countryCode: otherParent.countryIsdCode?.replace(/^\+/, ""), contactNumber: otherParent.contactNumber }) : "--"}
                    </ReviewRow>
                  </>
                )}
                <ReviewRow label="Country (Parent's Current Location)">{parent?.countryName}</ReviewRow>
                <ReviewRow label="Province / State">{parent?.stateName}</ReviewRow>
                <ReviewRow label="City">{parent?.cityName}</ReviewRow>
                {parent?.referralCode && <ReviewRow label="Referral Code">{parent.referralCode}</ReviewRow>}
              </>
            )}
          </dl>
          </Collapse>
        </section>

        <section className={ROW_CLASS}>
          <SectionHeader
            title="Grade & Selected Courses"
            icon={FaNotesMedical}
            open={openSectionFor() === "course"}
            onToggle={() => toggleSection("course")}
            onEdit={data.customPaymentEnabled || !onBack ? undefined : () => onBack(3)}
          />
          <Collapse open={openSectionFor() === "course"}>
          <div className="py-3 md:border-t md:border-slate-100 md:px-4">
            <h3 className="mb-2 text-sm font-semibold text-black">{course?.standardName}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-black">
                  <th className="py-1">Course Name</th>
                  {/* {!hideCredits && <th className="py-1 text-right">Credit</th>} */}
                </tr>
              </thead>
              <tbody>
                {(course?.courseDTO || []).map((c, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    <td className="py-1">{c.courseName}</td>
                    {/* {!hideCredits && <td className="py-1 text-right">{c.creditScore}</td>} */}
                  </tr>
                ))}
              </tbody>
              {/* {!hideCredits && (
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold">
                    <td className="py-1">Total Credit</td>
                    <td className="py-1 text-right">{course?.totalCredit}</td>
                  </tr>
                </tfoot>
              )} */}
            </table>
          </div>
          </Collapse>
        </section>

        </div>

        {showFee && (
          <div className="min-w-0">
            <hr className="mb-4 border-slate-200 md:hidden" />
            <h2 className="text-center text-base font-semibold text-black md:text-left md:text-lg">
              {data.customPaymentEnabled ? data.feeSetionTitile || "Fee Payment" : "Select Payment Option"}
            </h2>
            <div className="mt-3">
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
              {busy ? "Please wait…" : "Continue to Payment"}
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
      <Dialog
        open={applicationSubmittedLocally || (showPaymentOption === "N" && data.applicationSubmitted === "Y")}
        onOpenChange={() => {}}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-xl overflow-hidden p-0 text-center">
          <DialogHeader className="bg-primary px-6 py-3 text-left"> 
            <DialogTitle className="text-xl font-medium text-white">Application Under Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 pb-7 pt-2">
            <p className="text-lg font-bold leading-8 text-slate-950">
              Your enrollment application is under review. For any further queries, reach out to
              {" "}
              <a
                href={`mailto:${submittedContactEmail || data.contactEmail || ""}`}
                className="block break-all text-violet-800"
              >
                {submittedContactEmail || data.contactEmail}
              </a>
            </p>
            <div className="border-t border-slate-200 pt-5">
              <Button
                type="button"
                onClick={() => onSessionExpired?.()}
                className="rounded-md bg-primary px-4 text-white shadow hover:bg-teal-600"
              >
                LOG OUT
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
        <DialogContent showCloseButton={false} className="gap-0 overflow-hidden rounded-2xl p-0 text-slate-800 shadow-2xl sm:max-w-xl">
          <div className="space-y-2 px-6 pb-5 pt-1 text-center text-base leading-6 text-slate-600 sm:px-10 sm:text-lg">
            <h2 className="text-lg font-semibold text-slate-800 mt-2">Your payment is under review.</h2>
            <p>
              {data.enrollmentType !== "REGISTRATION_REGISTER" && "You will be able to access the dashboard once the payment is received. "}
              You can contact us at{" "}
              <b>
                <a href={`mailto:${data.contactEmail}`} className="break-all font-semibold text-slate-700 underline underline-offset-2">
                  {data.contactEmail}
                </a>
              </b>{" "}
              for more information
            </p>
          </div>
          <div className="flex justify-center border-t border-slate-200 bg-slate-50 px-5 py-4">
            <Button type="button" onClick={() => onSessionExpired?.()} className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90">
              Log out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
