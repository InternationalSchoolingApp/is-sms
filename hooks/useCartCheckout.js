"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { checkCartPayment } from "@/services/cartApi";
import {
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
import { isDummyStudentMode, showDummyStripeCheckoutPage } from "@/utils/paymentGatewayChecks";
import { expireSession } from "@/utils/logout";

const STATUS_SUCCESS = "1";
const STATUS_SESSION_OUT = "3";
// getPaymentPaidStatus() polling in commonPaymentGateway.js: every 10s, gives up after 10 checks.
const PAID_STATUS_POLL_MS = 10000;
const PAID_STATUS_MAX_CHECKS = 10;
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
 */
export function useCartCheckout({ context, onPaid }) {
  const [picker, setPicker] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [incomplete, setIncomplete] = useState(false);
  const [underReview, setUnderReview] = useState(false);
  const pollRef = useRef({ timer: null, count: 0 });

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
    setPreparing(true);
    try {
      const checked = await checkCartPayment({ userPaymentDetailsId });
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

  async function launchGateway(gateway) {
    if (isDummyStudentMode()) {
      showDummyStripeCheckoutPage();
      return;
    }
    const details = picker.details;
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
      applyingFrom: "nextjs",
    };
    setLaunching(true);
    // isPopupBlocked(): legacy probes window.open('', '_blank') before the invoke call.
    const probe = window.open("", "_blank");
    if (!probe || probe.closed || typeof probe.closed === "undefined") {
      setLaunching(false);
      toast.error("Popup blocked. Please allow popups and try again.");
      return;
    }
    probe.close();
    try {
      const response = await invokePaymentGateway(context.schoolUUID, payload);
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
  };
}
