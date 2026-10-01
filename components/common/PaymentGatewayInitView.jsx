"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { getAirwallexPaymentInit, getStripePaymentInit } from "@/services/paymentInitApi";

const GATEWAY_CONFIG = {
  stripe: {
    name: "Stripe",
    request: getStripePaymentInit,
    redirectField: "redirectUrl",
    successStatus: "SUCCESS",
  },
  airwallex: {
    name: "Airwallex",
    request: getAirwallexPaymentInit,
    redirectField: "airwallexCheckoutUrl",
    successStatus: "1",
  },
};

function getSafeRedirectUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function getAirwallexCheckoutIntentUrl(value) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value, window.location.origin);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !/^\/[^/]+\/create-checkout-intent\/[^/]+$/.test(url.pathname)
    ) {
      return null;
    }

    // The JSP's AJAX request is same-origin. The API currently builds an
    // absolute backend URL, so use its path on the Next.js origin; the local
    // rewrite (and the production reverse proxy) forwards it to Spring.
    if (process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true" || url.origin === window.location.origin) {
      return `${url.pathname}${url.search}`;
    }
    return url.href;
  } catch {
    return null;
  }
}

function loadAirwallexSdk() {
  if (window.Airwallex) return Promise.resolve(window.Airwallex);
  if (window.__airwallexSdkPromise) return window.__airwallexSdkPromise;

  window.__airwallexSdkPromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-airwallex-sdk="true"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://checkout.airwallex.com/assets/elements.bundle.min.js";
      script.async = true;
      script.dataset.airwallexSdk = "true";
    }

    script.addEventListener("load", () => {
      if (window.Airwallex) resolve(window.Airwallex);
      else reject(new Error("Airwallex checkout could not be loaded."));
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Airwallex checkout could not be loaded.")), { once: true });

    if (!script.isConnected) document.head.appendChild(script);
  });

  return window.__airwallexSdkPromise;
}

async function startAirwallexCheckout(checkoutUrl) {
  const url = getAirwallexCheckoutIntentUrl(checkoutUrl);
  if (!url) throw new Error("The Airwallex checkout URL is invalid.");

  const response = await fetch(url, { method: "GET", credentials: "include" });
  if (!response.ok) throw new Error("We could not reach the payment gateway. Please try again.");

  const intent = await response.json();
  if (String(intent?.status) !== "1") {
    throw new Error(getFailureMessage(intent));
  }

  const airwallex = await loadAirwallexSdk();
  airwallex.init({
    env: intent.environment,
    origin: window.location.origin,
  });
  await airwallex.redirectToCheckout({
    env: intent.environment,
    mode: "payment",
    intent_id: intent.intentId,
    client_secret: intent.clientSecret,
    currency: intent.currency,
    autoCapture: intent.autoCapture,
    successUrl: intent.successUrl,
    failUrl: intent.failUrl,
    cancelUrl: intent.cancelUrl,
    disableAutoRedirect: intent.disableAutoRedirect,
    logoUrl: intent.logoUrl,
    shopper_name: intent.shopperName,
  });
}

function getFailureMessage(response) {
  const message = typeof response?.message === "string" ? response.message : "";
  const cleanMessage = message.replace(/^FAILED\|/, "").trim();
  return cleanMessage || "We couldn’t start your payment. Please try again in a moment.";
}

export function PaymentGatewayInitView({ gateway, schoolUUID: schoolUUIDFromRoute }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const config = GATEWAY_CONFIG[gateway];
  const uniqueUuid = params?.UNIQUEUUID;
  const schoolUUID = schoolUUIDFromRoute || params?.school || process.env.NEXT_PUBLIC_SCHOOL_ID;
  const [state, setState] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const startPayment = useCallback(async () => {
    try {
      const response = await config.request(
        uniqueUuid,
        new URLSearchParams(searchParams.toString()),
        schoolUUID
      );
      if (response?.status === config.successStatus) {
        if (gateway === "airwallex") {
          await startAirwallexCheckout(response.airwallexCheckoutUrl);
          return;
        }

        const redirectUrl = getSafeRedirectUrl(response[config.redirectField]);
        if (redirectUrl) {
          window.location.assign(redirectUrl);
          return;
        }
      }

      setErrorMessage(getFailureMessage(response));
      setState("error");
    } catch (error) {
      setErrorMessage(error?.message || "We couldn’t start your payment. Please try again in a moment.");
      setState("error");
    }
  }, [config, gateway, schoolUUID, searchParams, uniqueUuid]);

  useEffect(() => {
    const timer = window.setTimeout(() => startPayment(), 0);
    return () => window.clearTimeout(timer);
  }, [startPayment]);

  function retryPayment() {
    setState("loading");
    setErrorMessage("");
    startPayment();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-white to-indigo-50 px-5 py-12 text-slate-900">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28)] sm:p-10">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          {state === "loading" ? <LoaderCircle className="size-8 animate-spin" aria-hidden="true" /> : state === "error" ? <RefreshCw className="size-7" aria-hidden="true" /> : <ShieldCheck className="size-8" aria-hidden="true" />}
        </div>

        {state === "loading" ? (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Secure checkout</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Connecting to {config.name}</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">Please wait while we prepare your secure payment. This should only take a moment.</p>
            <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-slate-500"><ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" /> Your payment details stay protected</div>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">Payment setup interrupted</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">We couldn’t connect to {config.name}</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">{errorMessage}</p>
            <button type="button" onClick={retryPayment} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
              Try again <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <p className="mt-5 text-xs leading-5 text-slate-500">If the issue continues, go back to the previous page or contact support.</p>
          </>
        )}
      </section>
    </main>
  );
}
