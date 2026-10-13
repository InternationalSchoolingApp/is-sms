"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { getAirwallexPaymentInit, getStripeEmbeddedInit } from "@/services/paymentInitApi";
import { isFramed } from "@/utils/embed";
import { getAirwallexCheckoutIntentUrl, getFailureMessage, loadAirwallexSdk } from "@/components/common/PaymentGatewayInitView";

/**
 * Payment page that keeps the gateway's own payment form INSIDE this page, so it can run in the dashboard's iframe (the hosted
 * Stripe Checkout / Airwallex pages refuse to be framed). Used by the re-enrollment launch when the page is framed, for:
 *   stripe    -> Stripe Embedded Checkout (is-rest-api: stripe-embedded-init, Checkout Session with ui_mode embedded)
 *   airwallex -> Airwallex Drop-in on the same payment intent the hosted flow uses
 * Both bring the payer back to the same response page the hosted flow does, so verification is unchanged. URL query: the same
 * userPaymentDetailsId / metaInfoId / schoolIdOfPaymentGateway / applyingFrom the hosted init pages get.
 */

function loadStripeSdk() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (window.__stripeSdkPromise) return window.__stripeSdkPromise;
  window.__stripeSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.addEventListener("load", () => (window.Stripe ? resolve(window.Stripe) : reject(new Error("Stripe could not be loaded."))), { once: true });
    script.addEventListener("error", () => reject(new Error("Stripe could not be loaded.")), { once: true });
    document.head.appendChild(script);
  });
  return window.__stripeSdkPromise;
}

async function mountStripe({ uniqueUuid, search, schoolUUID, container }) {
  const response = await getStripeEmbeddedInit(uniqueUuid, search, schoolUUID);
  if (response?.status !== "SUCCESS") throw new Error(getFailureMessage(response));
  const Stripe = await loadStripeSdk();
  const checkout = await Stripe(response.publishableKey).initEmbeddedCheckout({ clientSecret: response.clientSecret });
  checkout.mount(container);
  return () => checkout.destroy();
}

async function mountAirwallex({ uniqueUuid, search, schoolUUID, container, onError }) {
  const init = await getAirwallexPaymentInit(uniqueUuid, search, schoolUUID);
  if (String(init?.status) !== "1") throw new Error(getFailureMessage(init));
  const url = getAirwallexCheckoutIntentUrl(init.airwallexCheckoutUrl);
  if (!url) throw new Error("The Airwallex checkout URL is invalid.");
  const response = await fetch(url, { method: "GET", credentials: "include" });
  if (!response.ok) throw new Error("We could not reach the payment gateway. Please try again.");
  const intent = await response.json();
  if (String(intent?.status) !== "1") throw new Error(getFailureMessage(intent));

  const airwallex = await loadAirwallexSdk();
  airwallex.init({ env: intent.environment, origin: window.location.origin });
  const element = airwallex.createElement("dropIn", {
    intent_id: intent.intentId,
    client_secret: intent.clientSecret,
    currency: intent.currency,
    autoCapture: intent.autoCapture,
  });
  const onSuccess = () => window.location.assign(intent.successUrl);
  const onFailure = () => (intent.failUrl ? window.location.assign(intent.failUrl) : onError("The payment could not be completed."));
  element.mount(container);
  container.addEventListener("onSuccess", onSuccess);
  container.addEventListener("onError", onFailure);
  return () => {
    container.removeEventListener("onSuccess", onSuccess);
    container.removeEventListener("onError", onFailure);
    element.destroy?.();
  };
}

export function PaymentEmbeddedView({ gateway }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const containerRef = useRef(null);
  const [state, setState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const uniqueUuid = params?.UNIQUEUUID;
  const schoolUUID = params?.school;
  const search = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    const fail = (message) => {
      if (cancelled) return;
      setErrorMessage(message || "We couldn’t start your payment. Please try again in a moment.");
      setState("error");
    };
    (async () => {
      try {
        const mount = gateway === "stripe" ? mountStripe : mountAirwallex;
        const dispose = await mount({ uniqueUuid, search, schoolUUID, container: containerRef.current, onError: fail });
        if (cancelled) dispose();
        else {
          cleanup = dispose;
          setState("ready");
        }
      } catch (error) {
        fail(error?.message);
      }
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [gateway, uniqueUuid, search, schoolUUID]);

  // Back to where the payment was started (the re-enrollment payment / review screen the student came from).
  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign(`/${schoolUUID}/${isFramed() ? "embed" : "share"}/re-enrollment?resume=1`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 text-black">
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Back
      </button>
      {state === "loading" && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-600">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Preparing your secure payment…
        </p>
      )}
      {state === "error" && (
        <div className="rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-rose-600">{errorMessage}</p>
          <button type="button" onClick={goBack} className="mt-4 cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
            Back
          </button>
        </div>
      )}
      {/* The gateway form mounts here; kept in the DOM while loading so the ref exists. */}
      <div ref={containerRef} className={state === "ready" ? "" : "hidden"} />
    </main>
  );
}
