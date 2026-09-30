"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
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
 * schoolUUID comes from the {schoolId} path segment. In this app the common
 * routes are mounted WITHOUT a schoolId segment, so the slug falls back to
 * NEXT_PUBLIC_SCHOOL_ID — same single-school default the rest of the app uses.
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

  const schoolUUID = params.schoolId || process.env.NEXT_PUBLIC_SCHOOL_ID;
  const customReference = params.customReference;
  const uniqueUuid = params.UNIQUEUUID;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  // Snapshot the query params once (object) so the fetch effect doesn't
  // re-run on every render just because searchParams is a new instance.
  const query = useMemo(() => {
    const obj = {};
    for (const [k, v] of searchParams.entries()) obj[k] = v;
    return obj;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
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

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
            Your {data.paymentName} of {amount} for <b>{data.grade}</b> has been received.
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
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Thank You!</h2>
        <h3 className="mt-1 text-lg font-bold text-emerald-600">{successTitle(data)}</h3>

        {data.userName && <p className="mt-4 font-semibold text-slate-800">Dear {data.userName},</p>}
        {data.displaySchoolName && (
          <p className="mt-1 text-sm text-slate-600">Thank you for choosing {data.displaySchoolName}!</p>
        )}

        <div className="mt-4 space-y-2 text-sm leading-relaxed text-slate-600">
          <SuccessBody data={data} />
        </div>

        <ReceiptButtons data={data} />

        {showReload && returnUrl && !redirected && (
          <div className="mt-6 rounded-2xl bg-primary/5 px-4 py-5">
            <p className="text-sm font-semibold text-slate-700">
              Please wait… taking you to your dashboard in
            </p>
            <p className="mt-2 text-4xl font-extrabold text-primary tabular-nums">{countdown}</p>
            <div className="mx-auto mt-3 h-9 w-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
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
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Oops!</h2>
        {data.failedTitle && <h3 className="mt-1 text-lg font-bold text-red-600">{data.failedTitle}</h3>}
        {data.userName && <p className="mt-3 font-semibold text-primary">Dear {data.userName},</p>}
        {data.displaySchoolName && (
          <p className="mt-1 text-sm italic text-slate-600">Greetings from {data.displaySchoolName}!</p>
        )}
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          We believe you were trying to complete a transaction with us, but due to an issue we have not received your
          payment. Kindly contact us at <ContactEmail email={data.contactEmail} /> if we can help.
        </p>
        {data.feeFailedReason && (
          <p className="mt-3 text-sm text-slate-700">
            <b>Fee Failed Reason:</b> {data.feeFailedReason}
          </p>
        )}
        <ReturnButton data={data} label="Try again" />
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
  if (useLocalProxy) return "/backend";
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
