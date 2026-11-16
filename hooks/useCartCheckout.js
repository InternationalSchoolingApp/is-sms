"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { checkCartPayment } from "@/services/cartApi";
import {
  cancelPaymentAttempt,
  getAirwallexPaymentMethods,
  getPaymentGatewayOptions,
  getPaymentPaidStatus,
  invokePaymentGateway,
  submitOfflinePayment,
  uploadPaymentProof,
} from "@/services/studentSignupBackendApi";
import {
  callLocationForPaymentPromise,
  getAirwallexCountryCode,
  getLocationValue,
  getPayerCountryCodePromise,
  loadLocationGlobals,
} from "@/utils/locationFinder";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getPaymentBrowserId, resumeUrlForThisBrowser } from "@/utils/paymentBrowserId";
import { expireSession } from "@/utils/logout";

const STATUS_SUCCESS = "1";
const STATUS_SESSION_OUT = "3";
// getPaymentPaidStatus() polling in commonPaymentGateway.js: every 10s, gives up after 10 checks.
const PAID_STATUS_POLL_MS = 10000;
const PAID_STATUS_MAX_CHECKS = 10;
const STATUS_PAYMENT_IN_PROGRESS = "PAYMENT_IN_PROGRESS";
const STATUS_ALREADY_PAID = "ALREADY_PAID";
const STATUS_OLD_FEE = "OLD_FEE";
const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";

/**
 * Pay Now for the cart — commonPaymentGateway.js's checkPayment() ->
 * getPaymentGatewaysOptions() -> invokePaymentGateway() / callOfflinePayment(),
 * the same chain Stage4ReviewPayment runs for enrollment, started from the
 * cart's userPaymentDetailsId instead of the review data:
 *
 *   start(upid)      common/check-payment, then payment-gateway/options (+ Airwallex methods)
 *                    and open the "Choose Your Payment Method" picker
 *   launchGateway    common/invoke-payment-gateway, then redirect (and poll the paid status
 *                    when the gateway opens away from this page)
 *   uploadProof /    Cash / Wire Transfer proof upload + common/offline-payment
 *   submitOffline
 *
 * `onPaid` runs when the paid-status poll reports SUCCESS.
 *
 * Dummy (demo) student mode — legacy showDummyBookSessionPaymentOptions / showDummyStripeCheckoutPage:
 * start() opens the picker with Stripe + Airwallex only, and a gateway opens the dummy checkout page
 * (`dummyGateway`, rendered by the cart) instead of calling the backend.
 */
export function useCartCheckout({ context, onPaid }) {
  const [picker, setPicker] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [underReview, setUnderReview] = useState(false);
  const [dummyGateway, setDummyGateway] = useState(null);
  // "You already started this payment" (PAYMENT_IN_PROGRESS) / "already paid" from invoke-payment-gateway:
  // { attempt | alreadyPaidMessage, autoCancel, openedAt, relaunch: { gateway, details } }, shown by CheckoutExtraDialogs.
  const [paymentInProgress, setPaymentInProgress] = useState(null);
  // "School Payment Update" (OLD_FEE): the message of an old fee that can no longer be paid here.
  const [oldFee, setOldFee] = useState("");
  const pollRef = useRef({ timer: null, count: 0 });
  const dummy = useDummyStudent();

  useEffect(() => () => clearInterval(pollRef.current.timer), []);

  function sessionOut(response) {
    if (response?.status !== STATUS_SESSION_OUT) return false;
    expireSession(context.schoolUUID);
    return true;
  }

  function fail(response, fallback) {
    if (sessionOut(response)) return;
    toast.error(response?.message || fallback);
  }

  async function start(userPaymentDetailsId) {
    if (preparing || !context) return;
    if (dummy.enabled) {
      const schoolName = context.schoolName || "";
      setPicker({
        details: {
          paymentOptions: [
            { name: "STRIPE", label: "Option 1: Pay via Stripe", icon: "STRIPE.png" },
            { name: "Airwallex", label: "Option 2: Pay via Airwallex", icon: "Airwallex.png" },
          ],
          payAmount: dummy.student.checkoutAmount(),
          paymentLabel: `${schoolName ? `${schoolName} is` : "We are"} trusted by the safest and most reputed payment gateways, banks and wallets`,
        },
        methods: [],
        countryCode: "",
      });
      return;
    }
    setPreparing(true);
    try {
      const checked = await checkCartPayment({ userPaymentDetailsId });
      if (checked?.statusCode === STATUS_OLD_FEE) {
        // Legacy checkPayment: renderOldFeeCard(response) instead of a toast.
        setOldFee(checked.message || "This fee can no longer be paid here. Please contact the school.");
        return;
      }
      if (checked?.status !== STATUS_SUCCESS) {
        fail(checked, "Could not start the payment. Please try again.");
        return;
      }
      const due = checked.details || {};
      await loadLocationGlobals({ schoolUUID: context.schoolUUID, userId: context.userId });
      await callLocationForPaymentPromise();
      const countryCode = await getPayerCountryCodePromise();
      const options = await getPaymentGatewayOptions(context.schoolUUID, {
        userPaymentDetailsId: due.upid,
        entityType: due.entityType,
        entityId: due.entityId,
        paidByUserId: due.userId,
        schoolIdOfPaymentGateway: due.schoolId,
        schoolId: due.schoolId,
        countryCode,
      });
      if (options?.status !== STATUS_SUCCESS) {
        fail(options, "Could not load payment options. Please try again.");
        return;
      }
      const gateways = options.details?.paymentOptions || [];
      if (gateways.length === 0) {
        toast.error("No payment method is available right now. Please contact support.");
        return;
      }
      await callLocationForPaymentPromise();
      let methods = [];
      if (gateways.some((gateway) => gateway.name === "Airwallex")) {
        try {
          const airwallex = await getAirwallexPaymentMethods(context.schoolUUID, due.schoolId, getAirwallexCountryCode());
          methods = airwallex?.methods || [];
        } catch (err) {
          console.error("get-airwallex-payment-methods failed:", err);
        }
      }
      setPicker({ details: options.details, methods, countryCode });
    } catch (err) {
      console.error("Cart checkout failed:", err);
      toast.error(GENERIC_ERROR);
    } finally {
      setPreparing(false);
    }
  }

  function stopPoll() {
    clearInterval(pollRef.current.timer);
    pollRef.current.timer = null;
  }

  // flushPaymentInterval(): stop polling, drop the modal + overlay, show "Payment Incomplete".
  function flushPoll() {
    stopPoll();
    setPicker(null);
    setProcessing(false);
    setIncomplete(true);
  }

  async function checkPaidStatus(userPaymentDetailsId, schoolId) {
    try {
      const response = await getPaymentPaidStatus(context.schoolUUID, { userPaymentDetailsId, schoolId });
      if (response?.status !== STATUS_SUCCESS) return;
      if (pollRef.current.count > PAID_STATUS_MAX_CHECKS) {
        flushPoll();
        return;
      }
      pollRef.current.count += 1;
      if (response.statusCode === "SUCCESS") {
        stopPoll();
        setPicker(null);
        setProcessing(false);
        onPaid?.();
      } else if (response.statusCode === "FAILURE") {
        flushPoll();
      }
    } catch (err) {
      console.error("Cart get-payment-paid-status failed:", err);
    }
  }

  function startPoll(userPaymentDetailsId, schoolId) {
    stopPoll();
    pollRef.current.count = 0;
    setProcessing(true);
    pollRef.current.timer = setInterval(() => checkPaidStatus(userPaymentDetailsId, schoolId), PAID_STATUS_POLL_MS);
  }

  // options.details / skipPopupProbe: the launch that follows "Start a new payment" (the picker is already closed).
  async function launchGateway(gateway, options = {}) {
    if (dummy.enabled) {
      setPicker(null);
      setDummyGateway(gateway.name);
      return;
    }
    const details = options.details || picker.details;
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
      // invoke-payment-gateway runs from the Next.js server, so the backend would only see Node's User-Agent; the
      // "payment already in progress" message shows the payer's real device and browser.
      userAgent: navigator.userAgent,
      // This browser's own id: if its checkout tab was closed and it comes back, the in-progress pop-up is skipped.
      browserId: getPaymentBrowserId(),
      applyingFrom: "nextjs",
    };
    setLaunching(true);
    // isPopupBlocked(): legacy probes window.open('', '_blank') before the invoke call.
    if (!options.skipPopupProbe) {
      const probe = window.open("", "_blank");
      if (!probe || probe.closed || typeof probe.closed === "undefined") {
        setLaunching(false);
        toast.error("Popup blocked. Please allow popups and try again.");
        return;
      }
      probe.close();
    }
    try {
      const response = await invokePaymentGateway(context.schoolUUID, payload);
      const inProgress = response?.statusCode === STATUS_PAYMENT_IN_PROGRESS && response.details?.attemptRef;
      // This browser started that payment (its checkout tab was closed): back to the same checkout when it can be.
      const resumeUrl = inProgress ? resumeUrlForThisBrowser(response.details, gateway.name) : null;
      if (resumeUrl) {
        toast("Taking you back to the payment you started...");
        window.location.assign(resumeUrl);
        return;
      }
      if (inProgress || response?.statusCode === STATUS_ALREADY_PAID) {
        setLaunching(false);
        setPicker(null);
        setPaymentInProgress({
          attempt: inProgress ? response.details : null,
          // Same browser, nothing to reopen: close it at the gateway and start again without asking.
          autoCancel: Boolean(inProgress && response.details.sameBrowser),
          alreadyPaidMessage: inProgress ? "" : response.message || "This fee is already paid. You don't need to pay again.",
          openedAt: Date.now(),
          relaunch: { gateway, details },
        });
        return;
      }
      if (response?.statusCode === STATUS_OLD_FEE) {
        setLaunching(false);
        setPicker(null);
        setOldFee(response.message || "This fee can no longer be paid here. Please contact the school.");
        return;
      }
      if (response?.status !== STATUS_SUCCESS || !response.details?.redirectUrl) {
        setLaunching(false);
        setPicker(null);
        fail(response, "Could not start the payment. Please try again.");
        return;
      }
      toast("Please wait while redirecting to payment gateway...");
      if (response.details.openSelf) {
        window.location.replace(response.details.redirectUrl);
      } else {
        startPoll(payload.userPaymentDetailsId, payload.schoolId);
        window.location.href = response.details.redirectUrl;
      }
    } catch (err) {
      console.error("Cart launchGateway failed:", err);
      setLaunching(false);
      setPicker(null);
      toast.error(GENERIC_ERROR);
    }
  }

  // bindFileUploadNew1(): resolves to { fileName } or { error }.
  async function uploadProof(file, spec) {
    try {
      const response = await uploadPaymentProof(context.schoolUUID, context.uniqueId, { file, ...spec });
      if (!response) return { error: GENERIC_ERROR };
      if (sessionOut(response)) return { error: response.message || "Your session has timed out." };
      const fileName = response.uploadFiles?.[0]?.fileName;
      if (response.status === "0" || !fileName) return { error: response.message || "Upload failed. Please try again." };
      return { fileName };
    } catch (err) {
      console.error("Payment proof upload failed:", err);
      return { error: GENERIC_ERROR };
    }
  }

  // callOfflinePayment(): the legacy modal sends callingFrom "signup" from every page, the cart included.
  async function submitOffline(gateway, form, { paymentByUserId }) {
    const details = picker.details;
    try {
      const response = await submitOfflinePayment(context.schoolUUID, context.uniqueId, {
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
      if (sessionOut(response)) return { ok: false };
      if (response?.status !== STATUS_SUCCESS) return { ok: false, message: response?.message };
      setPicker(null);
      setUnderReview(true);
      return { ok: true };
    } catch (err) {
      console.error("Offline payment submit failed:", err);
      return { ok: false, message: GENERIC_ERROR };
    }
  }

  return {
    start,
    preparing,
    picker,
    closePicker: () => setPicker(null),
    launching,
    launchGateway,
    uploadProof,
    submitOffline,
    processing,
    incomplete,
    dismissIncomplete: () => setIncomplete(false),
    underReview,
    dismissUnderReview: () => setUnderReview(false),
    dummyGateway,
    closeDummyCheckout: () => setDummyGateway(null),
    // Shown by components/common/CheckoutExtraDialogs.jsx
    paymentInProgress,
    closePaymentInProgress: () => setPaymentInProgress(null),
    cancelPaymentAttempt: (attemptRef) => cancelPaymentAttempt(context.schoolUUID, { attemptRef }),
    // "Start a new payment" worked: the same gateway is launched again, without the popup probe (no user gesture here).
    relaunchAfterCancel: () => {
      const again = paymentInProgress?.relaunch;
      if (again) launchGateway(again.gateway, { details: again.details, skipPopupProbe: true });
    },
    paidAlready: () => {
      setPaymentInProgress(null);
      onPaid?.();
    },
    sessionExpired: () => expireSession(context.schoolUUID),
    oldFee,
    closeOldFee: () => setOldFee(""),
  };
}
