"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, LoaderCircle, XCircle } from "lucide-react";
import { getPaymentResponseSuccess, getPaymentResponseFailure } from "@/services/paymentResponseApi";

/**
 * Shared view for every /common/*payment-response-* route. Ports the render
 * logic of SignupStudentStage7.jsp + verifyPaymentSucess()/verifyPaymentFailure()
 * in ClientCommonPaymentController.java, with a fresh design.
 *
 * Flow:
 *  1. On mount, call the backend (success endpoint given by `endpointPath`, or
 *     the failure endpoint when `mode="failure"`), forwarding EVERY query param
 *     the gateway appended. While in-flight, a processing loader is shown.
 *  2. When the JSON returns:
 *      - transport status "ERROR" -> generic error card (htmlMessage / redirectTo).
 *      - responseStatus "1"  -> Success
 *      - responseStatus "2"  -> Under Verification
 *      - anything else        -> Failed
 *  3. On Success with showReloadOption "Y", a 5s countdown auto-redirects to
 *     returnUrl (mirrors the JSP's page-redirect-counter), with a manual link.
 *
 * The school UUID comes from a schoolId path/query parameter when supplied,
 * then falls back to NEXT_PUBLIC_SCHOOL_ID for the common callback routes.
 */
export function PaymentResponseView({ endpointPath, mode = "success" }) {
  return (
    <Suspense fallback={<ProcessingLoader />}>
      <PaymentResponseContent endpointPath={endpointPath} mode={mode} />
    </Suspense>
  );
}

function PaymentResponseContent({ endpointPath, mode }) {
  const params = useParams();
  const searchParams = useSearchParams();

  const customReference = params.customReference;
  const uniqueUuid = params.UNIQUEUUID;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  const search = searchParams.toString();
  // Keep a stable snapshot so unrelated renders don't issue another payment lookup.
  const query = useMemo(() => new URLSearchParams(search), [search]);
  const schoolUUID =
    params.schoolId ||
    query.get("schoolUUID") ||
    process.env.NEXT_PUBLIC_SCHOOL_ID;

  useEffect(() => {
    let cancelled = false;
    const requestTimer = window.setTimeout(() => {
      setLoading(true);
      const request =
        mode === "failure"
          ? getPaymentResponseFailure(schoolUUID, customReference, uniqueUuid, query)
          : getPaymentResponseSuccess(schoolUUID, endpointPath, query);

      request
        .then((res) => {
          if (cancelled) return;
          if (!res) setFailed(true);
          else setData(res);
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => !cancelled && setLoading(false));
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(requestTimer);
    };
  }, [endpointPath, mode, schoolUUID, customReference, uniqueUuid, query]);

  if (loading) return <ProcessingLoader />;

  // Network/parse failure, or the backend's own transport-level ERROR.
  if (failed || !data || String(data.status).toUpperCase() === "ERROR") {
    return <ErrorCard data={data} />;
  }

  const responseStatus = String(data.responseStatus ?? "");
  if (responseStatus === "1") return <SuccessCard data={data} />;
  if (responseStatus === "2") return <UnderVerificationCard data={data} />;
  return <FailedCard data={data} />;
}

/* ------------------------------- Loader -------------------------------- */

function ProcessingLoader() {
  return (
    <PageShell>
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <LoaderCircle className="size-12 animate-spin text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">Please wait…</h1>
          <p className="mt-1 text-sm text-slate-500">
            We are processing your payment. This may take a few moments — please don’t close or refresh this page.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

/* ------------------------------- Success ------------------------------- */

const RE_ENROLL_TYPES = new Set([
  "REGISTRATION_NEXT_GRADE",
  "REGISTRATION_COMPLETE_GRADES",
  "REGISTRATION_REPEAT_GRADE",
  "REGISTRATION_IMPORVE_GRADES",
]);

function successTitle(data) {
  if (data.contentFor === "FIRST-PAYMENT" && data.advanceFeePaid === "N") {
    return RE_ENROLL_TYPES.has(data.enrollmentType) ? "Successfully Re-Enrolled" : "Successfully Enrolled";
  }
  return "Payment Successful";
}

function PaymentLabel({ children }) {
  return String(children ?? "")
    .split(/(<sup>.*?<\/sup>)/gi)
    .map((part, index) => {
      const match = part.match(/^<sup>(.*?)<\/sup>$/i);
      return match ? <sup key={index}>{match[1]}</sup> : part;
    });
}

// Body copy per contentFor — mirrors the JSP's <c:choose> blocks.
function SuccessBody({ data }) {
  const amount = <b className="text-slate-900">{data.payAmount}</b>;
  switch (data.contentFor) {
    case "FIRST-PAYMENT":
      return (
        <>
          <p>
            Your fee of {amount} for <b>{data.grade}</b> has been received for <b>{data.learningProgram}</b>.
          </p>
          {data.advanceFeePaid === "Y" && (
            <p>Kindly refer to the fee details in your profile for the receipt.</p>
          )}
          <p>Good luck &amp; we wish you a wonderful experience with us!</p>
        </>
      );
    case "BOOK-SEAT":
      return (
        <>
          <p>Your online payment of {amount} has been received.</p>
          <p>Your enrollment seat has been reserved. You can download the receipt below.</p>
        </>
      );
    case "INSTALLMENT-FEE":
    case "RECURRING_SESSION_FEE":
      return (
        <>
          <p>
            Your <PaymentLabel>{data.paymentName}</PaymentLabel> of {amount} for <b>{data.grade}</b> has been received.
          </p>
          <p>Kindly refer to the fee details in your profile for the receipt.</p>
          <p>Good luck &amp; we wish you a wonderful experience with us!</p>
        </>
      );
    case "TEACHER REQUEST FEE":
      return (
        <>
          <p>We confirm your online payment of {amount} is completed successfully.</p>
          <p>
            Kindly refer to the fee details in your profile for the receipt. You will be assigned a teacher for each
            requested subject within 2 calendar days. We wish you a wonderful experience of schooling with us.
          </p>
        </>
      );
    case "BOOKSESSION_FEE":
    case "EXTENSION_FEE":
    case "ADDITIONAL_COURSE_PAYMENT":
    case "NOTARIZATION_FEE":
    case "OTHER_PAYMENT":
      return (
        <>
          <p>We confirm your online payment of {amount} is completed successfully.</p>
          <p>Kindly refer to the fee details in your profile for the receipt.</p>
        </>
      );
    default:
      return (
        <p>
          We confirm your online payment{data.payAmount ? <> of {amount}</> : null} is completed successfully.
        </p>
      );
  }
}

function SuccessCard({ data }) {
  const showReload = data.showReloadOption === "Y";
  const returnUrl = data.returnUrl;
  const [countdown, redirected] = useCountdownRedirect(showReload && !!returnUrl, returnUrl);

  return (
    <PageShell schoolSettingsLinks={data.schoolSettingsLinks} schoolName={data.displaySchoolName}>
      <div className="text-center">
        <StatusIcon variant="success" />
        <h2 className="text-2xl font-extrabold tracking-tight text-emerald-600 sm:text-3xl">
          {successTitle(data)}!
        </h2>

        {data.userName && <p className="mt-4 text-base font-bold text-slate-900">Dear, {data.userName}</p>}
        {data.displaySchoolName && (
          <p className="mt-3 text-sm font-semibold text-slate-700">Thank you for choosing {data.displaySchoolName}!</p>
        )}

        <div className="mt-5 space-y-2 rounded-2xl bg-emerald-50/80 px-5 py-4 text-sm leading-relaxed text-slate-700 ring-1 ring-emerald-100">
          <SuccessBody data={data} />
        </div>

        <ReceiptButtons data={data} />

        {showReload && returnUrl && !redirected && (
          <div className="mt-5 flex items-center justify-center gap-4 rounded-2xl bg-blue-50 px-5 py-4 text-left ring-1 ring-blue-100">
            <CircularCountdown value={countdown} />
            <div>
              <p className="text-base font-bold text-primary">Please wait...</p>
              <p className="mt-1 text-xs leading-5 text-slate-700">We are taking you to your dashboard in a moment.</p>
            </div>
          </div>
        )}

        {returnUrl && (
          <a
            href={returnUrl}
            className="mt-5 inline-block text-sm font-semibold text-primary underline underline-offset-4"
          >
            If you are not redirected automatically, click here
          </a>
        )}
      </div>
    </PageShell>
  );
}

// Receipt / dashboard / enroll links used on the success card (BOOK-SEAT etc.).
function ReceiptButtons({ data }) {
  const links = [];
  if (data.contentFor === "BOOK-SEAT" && data.receiptUrl) {
    links.push({ href: data.receiptUrl, label: "Download receipt", primary: true });
  }
  if (data.viewRecipt) links.push({ href: data.viewRecipt, label: "View receipt", primary: false });
  if (data.viewFormDataUrl) links.push({ href: data.viewFormDataUrl, label: "View submitted form", primary: false });

  if (links.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-3">
      {links.map((l) => (
        <a
          key={l.href + l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className={
            l.primary
              ? "rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
              : "rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          }
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

/* -------------------------- Under Verification ------------------------- */

function UnderVerificationCard({ data }) {
  return (
    <PageShell schoolSettingsLinks={data.schoolSettingsLinks} schoolName={data.displaySchoolName}>
      <div className="text-center">
        <StatusIcon variant="pending" />
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Payment Under Verification</h2>
        {data.userName && <p className="mt-3 font-semibold text-primary">Dear {data.userName},</p>}
        {data.displaySchoolName && (
          <p className="mt-1 text-sm italic text-slate-600">Greetings from {data.displaySchoolName}!</p>
        )}
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          We believe you were trying to complete a transaction with us. However, your payment is under verification and
          you will be notified by email if the status changes. For more information, contact us at{" "}
          <ContactEmail email={data.contactEmail} />.
        </p>
        {data.feeFailedReason && (
          <p className="mt-3 text-sm text-slate-700">
            <b>Fee Failed Reason:</b> {data.feeFailedReason}
          </p>
        )}
        <ReturnButton data={data} label="Continue" />
      </div>
    </PageShell>
  );
}

/* -------------------------------- Failed ------------------------------- */

function FailedCard({ data }) {
  return (
    <PageShell schoolSettingsLinks={data.schoolSettingsLinks} schoolName={data.displaySchoolName}>
      <div className="text-center">
        <StatusIcon variant="failed" />
        <h2 className="text-2xl font-extrabold tracking-tight text-rose-600 sm:text-3xl">
          {data.failedTitle || "Payment Unsuccessful"}
        </h2>
        {data.userName && <p className="mt-4 text-base font-bold text-slate-900">Dear, {data.userName}</p>}
        {data.displaySchoolName && (
          <p className="mt-3 text-sm font-semibold text-slate-700">Greetings from {data.displaySchoolName}</p>
        )}
        <div className="mt-5 space-y-2 rounded-2xl bg-rose-50/80 px-5 py-4 text-sm leading-relaxed text-slate-700 ring-1 ring-rose-100">
          {data.paymentName && (
            <p className="font-semibold text-slate-900">
              <PaymentLabel>{data.paymentName}</PaymentLabel>{data.payAmount ? ` · ${data.payAmount}` : ""}
            </p>
          )}
          <p>
            We couldn’t confirm your payment. Please try again, or contact <ContactEmail email={data.contactEmail} /> for help.
          </p>
          {data.feeFailedReason && <p className="font-medium text-rose-700">{data.feeFailedReason}</p>}
        </div>
        <Link
          href="/step/review-and-payment"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Try again
        </Link>
      </div>
    </PageShell>
  );
}

/* ------------------------------- Error --------------------------------- */

// Transport-level ERROR (invalid school, unreachable backend, etc.). The
// backend sends htmlMessage as "FAILED|message" and may send a redirectTo.
function ErrorCard({ data }) {
  const message = parseHtmlMessage(data?.htmlMessage);
  const redirectTo = data?.redirectTo;

  return (
    <PageShell>
      <div className="text-center">
        <StatusIcon variant="failed" />
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Something went wrong</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {message || "We are experiencing a technical issue. Please try again later."}
        </p>
        {redirectTo && (
          <a
            href={buildRedirectHref(redirectTo)}
            className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Continue
          </a>
        )}
      </div>
    </PageShell>
  );
}

/* ------------------------------ Helpers -------------------------------- */

function useCountdownRedirect(active, returnUrl) {
  const [countdown, setCountdown] = useState(5);
  const [redirected, setRedirected] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          setRedirected(true);
          if (returnUrl && returnUrl.trim()) window.location.href = returnUrl;
          else window.location.reload();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [active, returnUrl]);

  return [countdown, redirected];
}

function ReturnButton({ data, label }) {
  if (!data.returnUrl) return null;
  return (
    <a
      href={data.returnUrl}
      className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
    >
      {label}
    </a>
  );
}

function ContactEmail({ email }) {
  const address = email || "info@internationalschooling.org";
  return (
    <a href={`mailto:${address}`} className="font-semibold text-primary underline underline-offset-2">
      {address}
    </a>
  );
}

function StatusIcon({ variant }) {
  const map = {
    success: { Icon: CheckCircle2, ring: "bg-emerald-50 text-emerald-500" },
    pending: { Icon: Clock, ring: "bg-amber-50 text-amber-500" },
    failed: { Icon: XCircle, ring: "bg-red-50 text-red-500" },
  };
  const { Icon, ring } = map[variant] || map.failed;
  return (
    <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${ring}`}>
      <Icon className="h-11 w-11" strokeWidth={1.75} />
    </div>
  );
}

function CircularCountdown({ value }) {
  const circumference = 2 * Math.PI * 18;
  const progress = ((5 - value) / 5) * circumference;

  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center" aria-label={`${value} seconds remaining`}>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-100" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          className="text-blue-400 transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="text-sm font-semibold tabular-nums text-blue-700">{value}</span>
    </div>
  );
}

// "FAILED|message" -> "message"
function parseHtmlMessage(htmlMessage) {
  if (!htmlMessage) return "";
  const idx = htmlMessage.indexOf("|");
  return idx >= 0 ? htmlMessage.slice(idx + 1) : htmlMessage;
}

// redirectTo like "/common/login/abc-school-uuid-123" -> absolute backend URL.
function buildRedirectHref(redirectTo) {
  if (/^https?:\/\//i.test(redirectTo)) return redirectTo;
  const base = resolveBackendOriginSafe();
  return `${base}${redirectTo.startsWith("/") ? "" : "/"}${redirectTo}`;
}

function resolveBackendOriginSafe() {
  const useLocalProxy = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true";
  if (useLocalProxy) return "";
  return process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";
}

/* ------------------------------- Shell --------------------------------- */

function PageShell({ children, schoolSettingsLinks, schoolName }) {
  const logoUrl = schoolSettingsLinks?.logo;
  const websiteUrl = schoolSettingsLinks?.website || "https://internationalschooling.org/";

  return (
    <main
      className="flex min-h-screen flex-col items-center bg-[#eef4fb] bg-cover bg-center bg-no-repeat p-4 sm:p-8"
      style={{ backgroundImage: "url('/images/signup-thankyou-bg.png')" }}
    >
      <div className="mt-6 mb-4 flex justify-center">
        <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo URL is a
              remote CDN asset resolved per-school from the backend; a plain
              <img> avoids next/image remotePatterns config for arbitrary hosts. */}
          <img
            src={logoUrl || "/images/IS_Final_Logo.webp"}
            alt={schoolName || "International Schooling"}
            className="h-11 w-auto"
          />
        </a>
      </div>

      <div className="flex w-full flex-1 items-center justify-center">
        <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:p-10">
          {children}
        </div>
      </div>

      <footer className="py-5 text-center text-xs text-slate-500">
        Copyright © {new Date().getFullYear()} - {schoolName || "International Schooling"} - All Rights Reserved.
      </footer>
    </main>
  );
}
