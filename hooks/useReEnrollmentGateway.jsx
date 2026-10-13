"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FullScreenLoader } from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { getPaymentPaidStatus } from "@/services/studentSignupBackendApi";
import { isFramed, navigateTop } from "@/utils/embed";
import {
  STATUS_SESSION_OUT,
  STATUS_SUCCESS,
  useAirwallexPaymentMethods,
  useInvokePaymentGateway,
  useOfflinePayment,
  usePaymentGatewayOptions,
} from "@/hooks/useStudentReview";
import {
  callLocationForPaymentPromise,
  getAirwallexCountryCode,
  getLocationValue,
  getPayerCountryCodePromise,
  loadLocationGlobals,
} from "@/utils/locationFinder";

// The init page the backend returns for Stripe / Airwallex has an embedded twin next to it with the same query.
function embeddedPaymentUrl(gatewayName, redirectUrl) {
  const name = String(gatewayName || "").toLowerCase();
  if (name !== "stripe" && name !== "airwallex") return null;
  const from = `/common/${name}-payment-init/`;
  return redirectUrl.includes(from) ? redirectUrl.replace(from, `/common/${name}-embedded/`) : null;
}

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";
// getPaymentPaidStatus() polling in commonPaymentGateway.js: every 10s, gives up after 10 checks.
const PAID_STATUS_POLL_MS = 10000;
const PAID_STATUS_MAX_CHECKS = 10;

/**
 * Payment gateway launch for the re-enrollment screens. It is the same sequence Stage4ReviewPayment runs on
 * "Confirm & Pay" (gateway options -> "Choose Your Payment Method" modal -> invoke-payment-gateway, cash /
 * wire transfer proof, paid-status polling), minus the plan choice: the plan is already saved by
 * choose-payment-plan, and `review` (the re-enrollment review API) supplies the payment to start.
 *
 *   const gateway = useReEnrollmentGateway({ ... });
 *   gateway.start(review);   // review: re-enrollment review response (paymentRequired = true)
 *   return <>... {gateway.modals}</>;
 */
export function useReEnrollmentGateway({ context, uniqueId, onPaid, onSessionExpired }) {
  const gatewayOptions = usePaymentGatewayOptions({ context });
  const invokeGateway = useInvokePaymentGateway({ context });
  const airwallexMethods = useAirwallexPaymentMethods({ context });
  const offlinePayment = useOfflinePayment({ context, uniqueId });

  const [gatewayPicker, setGatewayPicker] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentIncomplete, setPaymentIncomplete] = useState(false);
  const [paymentUnderReview, setPaymentUnderReview] = useState(false);
  const paidPollRef = useRef({ timer: null, count: 0 });

  // Coming back from the gateway with Back (bfcache) restores the page with the modal open and busy.
  useEffect(() => {
    const onPageShow = (event) => {
      if (!event.persisted) return;
      setLaunching(false);
      setGatewayPicker(null);
    };
    window.addEventListener("pageshow", onPageShow);
    const poll = paidPollRef.current;
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      clearInterval(poll.timer);
    };
  }, []);

  function handleFailure(response, fallback) {
    if (!response) {
      toast.error(GENERIC_ERROR);
      return;
    }
    if (response.status === STATUS_SESSION_OUT) {
      onSessionExpired?.();
      return;
    }
    toast.error(response.message || fallback);
  }

  /** review: the re-enrollment review response of a payment that is still pending. */
  async function start(review) {
    if (!review?.paymentRequired || !review.userPaymentDetailsId) {
      toast.error("There is no pending payment.");
      return;
    }
    try {
      await loadLocationGlobals({ schoolUUID: context.schoolUUID, userId: review.userId });
      await callLocationForPaymentPromise();
      const countryCode = await getPayerCountryCodePromise();
      const options = await gatewayOptions.mutateAsync({
        userPaymentDetailsId: review.userPaymentDetailsId,
        entityType: review.entityType,
        entityId: review.entityId,
        paidByUserId: review.userId,
        schoolId: review.schoolId,
        countryCode,
      });
      if (options?.status !== STATUS_SUCCESS) {
        handleFailure(options, "Could not load payment options. Please try again.");
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
          const airwallex = await airwallexMethods.mutateAsync({
            schoolId: review.schoolId,
            countryCode: getAirwallexCountryCode(),
          });
          methods = airwallex?.methods || [];
        } catch (err) {
          console.error("get-airwallex-payment-methods failed:", err);
        }
      }
      setGatewayPicker({ details: options.details, methods, countryCode });
    } catch (err) {
      console.error("Re-enrollment payment start failed:", err);
      toast.error(GENERIC_ERROR);
    }
  }

  function stopPaidStatusPoll() {
    clearInterval(paidPollRef.current.timer);
    paidPollRef.current.timer = null;
  }

  function flushPaidStatusPoll() {
    stopPaidStatusPoll();
    setGatewayPicker(null);
    setPaymentProcessing(false);
    setPaymentIncomplete(true);
  }

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
        onPaid?.();
      } else if (response.statusCode === "FAILURE") {
        flushPaidStatusPoll();
      }
    } catch (err) {
      console.error("Re-enrollment get-payment-paid-status failed:", err);
    }
  }

  function startPaidStatusPoll(userPaymentDetailsId, schoolId) {
    stopPaidStatusPoll();
    paidPollRef.current.count = 0;
    setPaymentProcessing(true);
    paidPollRef.current.timer = setInterval(() => checkPaidStatus(userPaymentDetailsId, schoolId), PAID_STATUS_POLL_MS);
  }

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
      applyingFrom: "nextjs",
    };
    setLaunching(true);
    try {
      const response = await invokeGateway.mutateAsync(payload);
      if (response?.status !== STATUS_SUCCESS || !response.details?.redirectUrl) {
        setLaunching(false);
        setGatewayPicker(null);
        handleFailure(response, "Could not start the payment. Please try again.");
        return;
      }
      toast("Please wait while redirecting to payment gateway...");
      // Inside the dashboard's iframe the hosted gateway pages (Stripe Checkout, Airwallex hosted page) refuse to run, so Stripe and
      // Airwallex open their embedded form on a page of this app, in the same frame (see PaymentEmbeddedView); they bring the payer
      // back to the usual response page, in the frame as well. Any other gateway opens in the whole window, as before.
      const redirectUrl = response.details.redirectUrl;
      if (isFramed()) {
        const embeddedUrl = embeddedPaymentUrl(gateway.name, redirectUrl);
        if (embeddedUrl) window.location.assign(embeddedUrl);
        else navigateTop(redirectUrl, { replace: false });
      } else {
        window.location.assign(redirectUrl);
      }
      // Still here after a while (the navigation was blocked): free the button instead of spinning forever.
      setTimeout(() => setLaunching(false), 10000);
    } catch (err) {
      console.error("Re-enrollment launchGateway failed:", err);
      setLaunching(false);
      setGatewayPicker(null);
      toast.error(GENERIC_ERROR);
    }
  }

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

  const busy = gatewayOptions.isPending || airwallexMethods.isPending || invokeGateway.isPending || launching;

  const modals = (
    <>
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
            <h2 className="mt-2 text-lg font-semibold text-slate-800">Your payment is under review.</h2>
            <p>You will be able to continue once the payment is received.</p>
          </div>
          <div className="flex justify-center border-t border-slate-200 bg-slate-50 px-5 py-4">
            <Button type="button" onClick={() => onSessionExpired?.()} className="cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90">
              Log out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  return { start, modals, busy };
}
