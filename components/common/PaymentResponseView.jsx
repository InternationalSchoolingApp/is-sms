"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Check, Clock, Copy, LoaderCircle, XCircle } from "lucide-react";
import { getPaymentResponseSuccess, getPaymentResponseFailure, savePurchaseBrowserDetails } from "@/services/paymentResponseApi";
import { useSession } from "next-auth/react";
import { getAddEnrollmentThankYou } from "@/services/addEnrollmentBackendApi";
import {
  clearAddEnrollmentChildState,
  loadAddEnrollmentRollNo,
  loadLastAddEnrollmentRollNo,
} from "@/utils/addEnrollmentStorage";
import { AccountSetupSection } from "@/components/add-enrollment/AccountSetupSection";
import { loginPageUrl, resolveBackendOrigin, withLoginPayload } from "@/utils/backendOrigin";
import { getBrowserDetailsForSignup } from "@/utils/utmCookies";
import { logoutEverywhere } from "@/utils/logout";

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
export function PaymentResponseView({ endpointPath, mode = "success", schoolUUID }) {
  return (
    <Suspense fallback={<ProcessingLoader />}>
      <PaymentResponseContent endpointPath={endpointPath} mode={mode} schoolUUID={schoolUUID} />
    </Suspense>
  );
}

function PaymentResponseContent({ endpointPath, mode, schoolUUID: schoolUUIDFromRoute }) {
  const params = useParams();
  const searchParams = useSearchParams();

  const customReference = params.customReference;

  // Add Another Student: the return URL carries ae=Y (+ parentId, sessionUserId = the caller's UNIQUEUUID).
  // On the path-based failure URL those arrive glued onto the UNIQUEUUID segment ("{uuid}&ae=Y&parentId=..").
  const [uuidSegment, ...gluedParts] = decodeURIComponent(params.UNIQUEUUID ?? "").split("&");
  const glued = new URLSearchParams(gluedParts.join("&"));
  const addEnrollmentParam = (key) => searchParams.get(key) || glued.get(key) || "";
  const isAddEnrollmentUrl = addEnrollmentParam("ae").toUpperCase() === "Y";
  const uniqueUuid = isAddEnrollmentUrl ? uuidSegment : params.UNIQUEUUID;
  // TEMP DEBUG: what the URL gave us
  console.log("[add-enrollment] url flags", { ae: addEnrollmentParam("ae"), parentId: addEnrollmentParam("parentId"), sessionUserId: addEnrollmentParam("sessionUserId") });
  const addEnrollment =
    isAddEnrollmentUrl && addEnrollmentParam("parentId") && addEnrollmentParam("sessionUserId")
      ? { parentId: addEnrollmentParam("parentId"), sessionUniqueId: addEnrollmentParam("sessionUserId"), childUniqueId: uniqueUuid }
      : null;
  // replay=Y: the wizard found this child already paid (refresh / paid via the payment link) and sent the user
  // here WITHOUT gateway params, so there is nothing to verify — show the thank-you from the thank-you API.
  const isReplay = Boolean(addEnrollment) && addEnrollmentParam("replay").toUpperCase() === "Y";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const { status: sessionStatus } = useSession();

  const search = searchParams.toString();
  const schoolUUID =
    schoolUUIDFromRoute ||
    params.school ||
    params.schoolId ||
    searchParams.get("schoolUUID") ||
    process.env.NEXT_PUBLIC_SCHOOL_ID;

  useEffect(() => {
    if (isReplay) return undefined;
    let cancelled = false;
    const requestTimer = window.setTimeout(() => {
      setLoading(true);
      const request =
        mode === "failure"
          ? getPaymentResponseFailure(schoolUUID, customReference, uniqueUuid, search)
          : getPaymentResponseSuccess(schoolUUID, endpointPath, search);

      // TEMP-DEBUG: every API call this page makes is printed as "[payment-response] api …"
      console.log("[payment-response] api call", mode === "failure" ? "response-failure" : endpointPath, { schoolUUID, search });
      request
        .then((res) => {
          console.log("[payment-response] api response", mode === "failure" ? "response-failure" : endpointPath, res);
          if (cancelled) return;
          if (!res) setFailed(true);
          else {
            setData(res);
            if (String(res.responseStatus) === "1" && res.userPaymentDetailsId) {
              savePurchaseBrowserDetails(schoolUUID, res.userPaymentDetailsId, getBrowserDetailsForSignup()).catch(() => {});
            }
          }
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => !cancelled && setLoading(false));
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(requestTimer);
    };
  }, [endpointPath, mode, schoolUUID, customReference, uniqueUuid, search, isReplay]);

  // No login session: send the visitor to the login page. Waits for the gateway verification call above to finish
  // first, so leaving the page never cuts off the backend confirming the payment.
  // Stage7.jsp asks for a login only when there is no session AND the payment was not made through a payment
  // link (initiatedVia 'Link') AND it is not an evaluation test form — those pages are shown without a login.
  const shownWithoutLogin =
    data &&
    (String(data.responseStatus ?? "") === "4" ||
      String(data.statusCode ?? "").toUpperCase() === "ALREADY_PAID" ||
      data.initiatedVia === "Link" ||
      data.contentFor === "EVALUATION-TEST-FORM");
  const redirectToLogin = sessionStatus === "unauthenticated" && (isReplay || !loading) && !shownWithoutLogin;
  useEffect(() => {
    if (redirectToLogin && !window.__loggingOut) window.location.replace(loginPageUrl(schoolUUID));
  }, [redirectToLogin, schoolUUID]);

  if (sessionStatus !== "authenticated" && !(shownWithoutLogin && sessionStatus === "unauthenticated")) {
    return <ProcessingLoader />;
  }

  if (isReplay) return <AddEnrollmentThankYouReplay
        schoolUUID={schoolUUID}
        parentId={addEnrollment.parentId}
        rollNo={searchParams.get("rollNo") || ""}
        childUniqueId={searchParams.get("childUniqueId") || ""}
      />;

  if (loading) return <ProcessingLoader />;

  // Network/parse failure, or the backend's own transport-level ERROR.
  if (failed || !data || String(data.status).toUpperCase() === "ERROR") {
    return <ErrorCard data={data} />;
  }

  const responseStatus = String(data.responseStatus ?? "");
  if (responseStatus === "1") return <SuccessCard data={data} addEnrollment={addEnrollment} schoolUUID={schoolUUID} />;
  if (responseStatus === "2") return <UnderVerificationCard data={data} />;
  return <FailedCard data={data} />;
}

// contentFor / advanceFeePaid / enrollmentFeePaid for SignupStudentStage7.jsp's cases, from the paid payment's
// title — the same mapping ClientCommonPaymentController#updatePaymentModal does for the JSP. The child is
// already paid here (replay), i.e. its enrollment is done.
const STAGE7_SAME_NAME_TYPES = new Set([
  "TEACHER REQUEST FEE",
  "BOOKSESSION_FEE",
  "EXTENSION_FEE",
  "ADDITIONAL_COURSE_PAYMENT",
  "NOTARIZATION_FEE",
  "OTHER_PAYMENT",
]);
const STAGE7_INSTALLMENT_TYPES = new Set(["INSTALLMENT-FEE", "SUBJECT_FEE", "CUSTOMIZED_SUBJECT_FEE", "SUBJECT_FEE_ADV"]);
const STAGE7_BOOK_SEAT_TYPES = new Set(["registration", "REGISTRATION_FEE", "REGISTRATION_FEE_ADV"]);

function stage7ContentFromPaymentTitle(paymentTitle) {
  const title = String(paymentTitle || "");
  if (STAGE7_SAME_NAME_TYPES.has(title)) return { contentFor: title, advanceFeePaid: "N" };
  if (title === "RECURRING_SESSION_FEE") return { contentFor: "RECURRING_SESSION_FEE", advanceFeePaid: "N" };
  if (STAGE7_INSTALLMENT_TYPES.has(title)) return { contentFor: "INSTALLMENT-FEE", advanceFeePaid: "N" };
  if (STAGE7_BOOK_SEAT_TYPES.has(title)) {
    const enrollmentFeePaid = title === "REGISTRATION_FEE_ADV" ? "A" : title === "REGISTRATION_FEE" ? "F" : "";
    return { contentFor: "BOOK-SEAT", advanceFeePaid: "N", enrollmentFeePaid };
  }
  // registration fee, pay-in-full, payment plans and anything else: the first payment
  return { contentFor: "FIRST-PAYMENT", advanceFeePaid: title === "REGISTRATION_SUBJECT_FEE_ADV" ? "Y" : "N" };
}

// Thank-you for an add-enrollment child that is already paid, built from the thank-you details API (child found
// by the roll number the wizard left in storage). Same SuccessCard as a live payment return, incl. the
// account-setup section on a first payment.
function AddEnrollmentThankYouReplay({ schoolUUID, parentId, rollNo, childUniqueId }) {
  const { data: session, status } = useSession();
  const [info, setInfo] = useState(undefined);

  useEffect(() => {
    if (!session?.userId || !session?.uniqueId) return undefined;
    let cancelled = false;
    const sessionSchool = session.schoolUUID || schoolUUID;
    const studentRollNumber =
      rollNo || loadAddEnrollmentRollNo(sessionSchool, parentId) || loadLastAddEnrollmentRollNo(sessionSchool, parentId);
    getAddEnrollmentThankYou(sessionSchool, {
      parentId,
      sessionUserId: session.userId,
      sessionUniqueId: session.uniqueId,
      studentRollNumber,
      childUniqueId,
    })
      .then((res) => {
        // TEMP-DEBUG: what the replay asked for and what the thank-you API answered
        console.log("[payment-response] api response enroll/another/child/thank-you (replay)", { studentRollNumber, childUniqueId, res });
        const ok = res?.status === "1" && res.data;
        // Finished: the next wizard entry in this tab must not pick this child up again (this page's own refresh
        // keeps working from the rollNo / childUniqueId in its URL).
        if (ok) clearAddEnrollmentChildState(sessionSchool, parentId);
        if (!cancelled) setInfo(ok ? res.data : null);
      })
      .catch(() => !cancelled && setInfo(null));
    return () => {
      cancelled = true;
    };
  }, [session?.userId, session?.uniqueId, session?.schoolUUID, schoolUUID, parentId, rollNo, childUniqueId]);

  if (status === "unauthenticated" || info === null) return <ErrorCard data={null} />;
  if (info === undefined) return <ProcessingLoader />;
  return (
    <SuccessCard
      data={{
        // Same variables SignupStudentStage7.jsp renders from, worked out from the payment title here.
        ...stage7ContentFromPaymentTitle(info.paymentTitle),
        userName: info.studentName,
        payAmount: info.payAmount,
        grade: info.grade,
        learningProgram: info.learningProgram,
        displaySchoolName: session?.schoolName,
        accountSetup: isFirstPayment(info) ? info : null,
      }}
    />
  );
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
  const amount = <b className="text-black">{data.payAmount}</b>;
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
        </>
      );
    case "BOOK-SEAT":
      return (
        <>
          <p>Your online payment of {amount} has been received.</p>
          <p>Your enrollment seat has been reserved. You can download the receipt by clicking on the button below.</p>
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
            requested subject within 2 calendar days. We believe that we will be able to make a positive contribution
            to your academic pursuits. We wish you a wonderful experience of schooling with us.
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

// contentFor sets that drive the Stage7 JSP's <c:choose> branching for the
// primary CTA, kept exactly as named in the JSP so the mapping is traceable.
const DASHBOARD_REDIRECT_TYPES = new Set([
  "FIRST-PAYMENT",
  "RECURRING_SESSION_FEE",
  "INSTALLMENT-FEE",
  "TEACHER REQUEST FEE",
  "BOOKSESSION_FEE",
  "EXTENSION_FEE",
]);

/**
 * Primary CTA on the Success card — mirrors Stage7.jsp's status==1 <c:choose>
 * exactly:
 *   - BOOK-SEAT: a second button after the receipt download, picked off
 *     `enrollmentFeePaid` (U -> enroll now, A -> dashboard, F/else -> review
 *     and payment), always rendered regardless of `initiatedVia`.
 *   - FIRST-PAYMENT/RECURRING_SESSION_FEE/INSTALLMENT-FEE/TEACHER REQUEST FEE/
 *     BOOKSESSION_FEE/EXTENSION_FEE: no separate button here — the JSP's own
 *     block for this case is commented out, since the countdown
 *     (showReloadOption) already owns navigation for these.
 *   - everything else (OTHER_PAYMENT, ADDITIONAL_COURSE_PAYMENT,
 *     NOTARIZATION_FEE, ADVANCE/registration flows, ...): "Click here to
 *     review and payment", but only when initiatedVia != 'Link' (a Link-
 *     initiated payment has no session to return into).
 */
function successPrimaryCta(data) {
  if (!data.returnUrl) return null;
  if (data.contentFor === "BOOK-SEAT") {
    if (data.enrollmentFeePaid === "U") return { href: data.returnUrl, label: "Click here to enroll now" };
    if (data.enrollmentFeePaid === "A") return { href: data.returnUrl, label: "Click here to dashboard" };
    return { href: data.returnUrl, label: "Click here to review and payment" };
  }
  if (DASHBOARD_REDIRECT_TYPES.has(data.contentFor)) return null;
  if (data.initiatedVia === "Link") return null;
  return { href: data.returnUrl, label: "Click here to review and payment" };
}

export function SuccessCard({ data, addEnrollment, schoolUUID }) {
  // Normal enrollment: countdown + auto-redirect. Add Another Student: the account-setup section replaces the timer.
  const showReload = data.showReloadOption === "Y" && !addEnrollment;
  const returnUrl = data.returnUrl;
  const [countdown, redirected] = useCountdownRedirect(showReload && !!returnUrl, returnUrl);
  const primaryCta = successPrimaryCta(data);

  const isEnrolled = successTitle(data).includes("Enrolled");
  const firstName = String(data.userName || "").trim().split(/\s+/)[0];

  // Add Another Student link return: the success response itself already carries the child's login credentials
  // (outlookEmail/loginEmail + outlookPassword, showAccountInfo = "Y"), so show the login panel straight from it.
  // This is the no-session path where the separate thank-you details call can't resolve the caller — skip it here.
  const inlineCredentials = Boolean(addEnrollment) && hasLoginCredentials(data);
  const showInlineLogin = Boolean(data.accountSetup) || isFirstPayment(data) || inlineCredentials;

  return (
    <PageShell schoolSettingsLinks={data.schoolSettingsLinks} schoolName={data.displaySchoolName}>
      <div className="text-center">
        {firstName && <p className="text-lg font-bold text-slate-900">Dear {firstName},</p>}
        <h2 className="mt-3 flex flex-col items-center justify-center gap-2 text-xl leading-tight font-extrabold tracking-tight text-emerald-700 min-[560px]:flex-row min-[560px]:gap-3 min-[560px]:text-2xl sm:text-[28px]">
          <span className="flex size-9 shrink-0 sm:size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600" aria-hidden="true">
            <Check className="size-5" strokeWidth={3} />
          </span>
          {isEnrolled ? "You are successfully enrolled!" : "Payment successful!"}
        </h2>
        {data.displaySchoolName && (
          <p className="mt-3 text-sm text-slate-800 sm:text-base">Thank you for choosing {data.displaySchoolName}.</p>
        )}

        <div className="mt-5 space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm sm:px-5 sm:py-4 leading-relaxed text-slate-800">
          <SuccessBody data={data} />
        </div>

        {showInlineLogin ? (
          <LoginDetails
            data={data.accountSetup || data}
            sourceApi={data.accountSetup ? "api/v1/enroll/another/child/thank-you" : "api/v1/{schoolId}/payment/response-success"}
            fallbackName={data.userName}
            loginHref={loginPageUrl(schoolUUID)}
            schoolUUID={schoolUUID}
          />
        ) : (
          !addEnrollment && <AccountInfoCard data={data} />
        )}

        <ReceiptButtons data={data} primaryCta={primaryCta} />

        {/* Add Another Student: the account-setup section replaces the timer. Skipped when the success
            response already carried the credentials (shown inline above) — the thank-you call would only fail
            on this no-session link return. */}
        {addEnrollment && !inlineCredentials && !data.accountSetup && (
          <AddEnrollmentAccountInfo
            schoolUUID={schoolUUID}
            parentId={addEnrollment.parentId}
            childUniqueId={addEnrollment.childUniqueId}
            sessionUniqueId={addEnrollment.sessionUniqueId}
          />
        )}

        {showReload && returnUrl && !redirected && (
          <div className="mt-5 flex items-center justify-center gap-4 rounded-2xl bg-blue-50 px-5 py-4 text-left ring-1 ring-blue-100">
            <CircularCountdown value={countdown} />
            <div>
              <p className="text-base font-bold text-primary">Please wait...</p>
              <p className="mt-1 text-xs leading-5 text-slate-700">We are taking you to your dashboard in a moment.</p>
            </div>
          </div>
        )}

        {/* Scoped to the countdown case only — mirrors the JSP's #redirectToDashboard, which
            only exists as a manual fallback for the auto-redirect, not a universal returnUrl
            link (that would duplicate the primary CTA button above for every other case). */}
        {showReload && returnUrl && (
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

// Add Another Student: loads the thank-you details (api/v1/enroll/another/child/thank-you) and shows the
// account-setup section when the response says isFirstPayment = Y. The caller identity comes from the login
// session when available, or from the payment callback URL; the child id also comes from that URL.
function AddEnrollmentAccountInfo({ schoolUUID, parentId, childUniqueId, sessionUniqueId }) {
  const { data: session, status: sessionStatus } = useSession();
  // Payment-link returns can arrive without a NextAuth session. The callback URL
  // still carries the caller's unique id, so use it to ask the thank-you API for
  // the completed child's account details instead of silently skipping the call.
  // The thank-you API expects numeric sessionUserId (same as session.userId in
  // the authenticated wizard), while the callback's sessionUserId query value
  // is the caller's UUID. For payment-link callbacks, parentId is the available
  // numeric account id; keep the UUID in sessionUniqueId below.
  const sessionUserId = session?.userId || Number(parentId) || 0;
  const [info, setInfo] = useState(null);

  useEffect(() => {
    // The wizard stores the roll number under the SESSION's school uuid; this common route has no {school}
    // segment, so its own schoolUUID can be a different spelling — try both.
    const rollNo =
      loadAddEnrollmentRollNo(session?.schoolUUID, parentId) ||
      loadAddEnrollmentRollNo(schoolUUID, parentId) ||
      // opened in another tab: no sessionStorage there, so use the copy the wizard left in localStorage
      loadLastAddEnrollmentRollNo(session?.schoolUUID || schoolUUID, parentId);
    // The URL's sessionUserId is the enrolled CHILD's unique id; the thank-you API wants the caller's
    // (sessionUserId and sessionUniqueId must be the same user), i.e. the logged-in session.
    const callerUniqueId = session?.uniqueId || sessionUniqueId;
    // TEMP DEBUG (remove once the section shows): which of the gates is closing?
    console.log("[add-enrollment account section] gates", {
      sessionStatus,
      sessionUserId,
      parentId,
      callerUniqueId,
      urlSessionUniqueId: sessionUniqueId,
      childUniqueId,
      rollNo,
    });
    if (!sessionUserId) return undefined;
    let cancelled = false;
    getAddEnrollmentThankYou(schoolUUID, {
      parentId,
      sessionUserId,
      sessionUniqueId: callerUniqueId,
      studentRollNumber: rollNo,
      childUniqueId,
    })
      .then((res) => {
        console.log("[payment-response] api response enroll/another/child/thank-you (account section)", { rollNo, res });
        if (!cancelled && String(res?.status ?? "") === "1" && res.data) setInfo(res.data);
      })
      .catch((err) => console.log("[add-enrollment account section] thank-you API failed", err));
    return () => {
      cancelled = true;
    };
  }, [schoolUUID, parentId, childUniqueId, sessionUserId, sessionUniqueId, session?.schoolUUID, session?.uniqueId]);

  // Only for the child's first payment, decided by the backend: payment title REGISTRATION_SUBJECT_FEE or
  // CUSTOMIZED_REGISTRATION_SUBJECT_FEE on a REGISTRATION_FRESH / REGISTRATION_FLEX_COURSE enrollment.
  // TEMP DEBUG (remove once the section shows): the gate that decides visibility
  console.log("[add-enrollment account section] visibility", {
    hasInfo: Boolean(info),
    isFirstPayment: info?.isFirstPayment,
    paymentTitle: info?.paymentTitle,
    hasCreatePasswordUrl: Boolean(info?.createPasswordUrl),
    hasOutlook: Boolean(info?.outlookEmail && info?.outlookPassword),
  });
  if (!isFirstPayment(info)) return null;
  return <LoginDetails data={info} sourceApi="api/v1/enroll/another/child/thank-you" loginHref={loginPageUrl(schoolUUID)} schoolUUID={schoolUUID} />;
}

// "Log in to your school dashboard" panel: login email + temporary password (show/hide, copy) and the dashboard
// button. When the response has no Outlook credentials (password-creation step only), the original
// AccountSetupSection is shown instead.
function LoginDetails({ data, sourceApi, fallbackName, loginHref, schoolUUID }) {
  const { data: session } = useSession();
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);
  // Same hand-off the add-enrollment create-password page uses: a short-lived HttpOnly cookie pair set by our
  // API route, scoped to the school's login page, which the Java login controller reads (then clears) to prefill.
  const storeLoginPrefill = () =>
    fetch("/api/add-enrollment/login-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school: schoolUUID, email, password }),
    }).catch(() => {});
  // Sign the current user out (Next.js session + Java session) and land on the login page so they can log in
  // with the details above.
  const goToDashboard = async (event) => {
    event.preventDefault();
    if (leaving) return;
    setLeaving(true);
    try {
      await storeLoginPrefill();
      // The cookie above only reaches the Java login page on a shared parent domain; the payload covers the rest.
      if (session?.uniqueId) await logoutEverywhere(session, { email, password });
      else window.location.assign(withLoginPayload(loginHref, email, password));
    } catch {
      window.location.assign(withLoginPayload(loginHref, email, password));
    }
  };
  const email = data.outlookEmail || data.loginEmail;
  const password = data.outlookPassword;
  console.log("[LoginDetails] credential source", {
    api: sourceApi,
    isFirstPayment: data.isFirstPayment,
    outlookEmail: data.outlookEmail,
    loginEmail: data.loginEmail,
    outlookPassword: data.outlookPassword,
    hasEmail: Boolean(email),
    hasPassword: Boolean(password),
  });
  if (!email || !password) return <AccountSetupSection data={data} />;
  const name = data.studentName || fallbackName;

  return (
    <section className="mt-6 border-t border-slate-200 pt-6" aria-labelledby="login-details-h">
      <h3 id="login-details-h" className="text-sm text-slate-800 sm:text-base">
        Log in to your school dashboard with the details below
      </h3>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 text-left">
        <div className="flex items-center gap-1 px-3 py-3 sm:gap-2 sm:px-4">
          <div className="min-w-0 flex-1">
            {name && <p className="font-bold text-slate-900">{name}</p>}
            <p className="mt-1 text-sm break-all text-slate-800">Login Email: {email}</p>
          </div>
          <CopyButton value={email} label="Copy login email" />
        </div>
        <div className="flex items-center gap-1 border-t border-slate-200 px-3 py-3 sm:gap-2 sm:px-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-600">Login Password</p>
            <p className="mt-0.5 font-mono text-sm break-all sm:text-base text-slate-900">
              {show ? password : "•".repeat(Math.min(password.length, 14))}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="min-h-10 px-2 text-sm font-semibold text-primary"
          >
            {show ? "Hide" : "Show"}
          </button>
          <CopyButton value={password} label="Copy login password" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-700">You can copy these details now. We have also sent them to your registered email address.</p>
      <a
        href={loginHref}
        onClick={goToDashboard}
        aria-disabled={leaving}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-8 text-base sm:w-auto font-semibold text-white shadow-sm transition hover:bg-primary/90"
      >
        {leaving ? "Redirecting…" : "Go to my dashboard"}
      </a>
       <p className="mt-1 text-sm text-slate-700">You can change your password once inside the dashboard.</p>
      <p className="mt-5 flex flex-col items-center justify-center gap-1 text-sm text-slate-700 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:gap-x-2">
        Need help?
        <a
          href="https://wa.me/15854990662"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1.5 text-left font-bold text-primary hover:underline sm:items-center"
        >
          <Image src="/images/whatsapp-new.webp" alt="" width={20} height={20} unoptimized className="mt-0.5 size-5 shrink-0 sm:mt-0" />
          Chat with us on WhatsApp: +1 (585) 499-0662
        </a>
      </p>
    </section>
  );
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={`flex size-10 shrink-0 items-center justify-center ${copied ? "text-emerald-700" : "text-primary"}`}
    >
      {copied ? <Check className="size-[18px]" aria-hidden="true" /> : <Copy className="size-[18px]" aria-hidden="true" />}
    </button>
  );
}

export function isFirstPayment(info) {
  return String(info?.isFirstPayment ?? "").toUpperCase() === "Y";
}

// The success/thank-you response already carries the child's login credentials (Outlook or fallback login email
// + password). Used to show the login panel straight from the success response on a no-session link return,
// without the separate thank-you details call (which needs the caller's session to resolve).
export function hasLoginCredentials(info) {
  return Boolean((info?.outlookEmail || info?.loginEmail) && info?.outlookPassword);
}

// Added-student (sibling) enrollment: same info as the invite mail — SMS password + Outlook account.
function AccountInfoCard({ data }) {
  if (data.showAccountInfo !== "Y") return null;
  const hasOutlook = data.outlookEmail && data.outlookPassword;
  return (
    <div className="mt-5 space-y-4 rounded-2xl bg-blue-50/80 px-5 py-4 text-left text-sm leading-relaxed text-slate-700 ring-1 ring-blue-100">
      <div>
        <p className="font-bold text-slate-900">Step 1: Create your SMS password</p>
        {data.createPasswordUrl && (
          <a
            href={data.createPasswordUrl}
            className="mt-2 inline-block rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Create Password
          </a>
        )}
      </div>
      <div>
        <p className="font-bold text-slate-900">Step 2: Sign in to Outlook and set your new password</p>
        {hasOutlook ? (
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="inline font-semibold">Outlook login URL: </dt>
              <dd className="inline">
                <a href={data.outlookLoginUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                  {data.outlookLoginUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold">Email: </dt>
              <dd className="inline break-all">{data.outlookEmail}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Temporary password: </dt>
              <dd className="inline font-mono">{data.outlookPassword}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2">Your Outlook account is being prepared. The details will be shared with you by email.</p>
        )}
      </div>
    </div>
  );
}

// Receipt download (BOOK-SEAT) + the primary CTA resolved by successPrimaryCta().
function ReceiptButtons({ data, primaryCta }) {
  const links = [];
  if (data.contentFor === "BOOK-SEAT" && data.receiptUrl) {
    links.push({ href: data.receiptUrl, label: "Click here to download receipt", primary: false, external: true });
  }
  if (data.viewRecipt) links.push({ href: data.viewRecipt, label: "View receipt", primary: false, external: true });
  if (data.viewFormDataUrl) links.push({ href: data.viewFormDataUrl, label: "View submitted form", primary: false, external: true });
  if (primaryCta) links.push({ ...primaryCta, primary: true, external: false });

  if (links.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-3">
      {links.map((l) => (
        <a
          key={l.href + l.label}
          href={l.href}
          {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
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

// contentFor set shared by status==2 (Under Verification) and the failed
// status's <c:choose> in Stage7.jsp — both pick "Click here for Dashboard"
// vs "Click here to review and payment" off this same set + initiatedVia.
const DASHBOARD_OR_REVIEW_TYPES = new Set([
  "FIRST-PAYMENT",
  "INSTALLMENT-FEE",
  "TEACHER REQUEST FEE",
  "BOOK-SEAT",
  "BOOKSESSION_FEE",
  "EXTENSION_FEE",
]);

// Mirrors the <c:choose> shared by status==2 and the failed branch: for the
// listed contentFor values, initiatedVia != 'Link' -> "Click here for
// Dashboard"; initiatedVia == 'Link' (or any other contentFor) -> "Click
// here to review and payment". Note this set is missing EXTENSION_FEE's
// sibling RECURRING_SESSION_FEE and ADDITIONAL_COURSE_PAYMENT/NOTARIZATION_FEE/
// OTHER_PAYMENT compared to the Success branch's own set — kept exactly as
// the JSP has it (not harmonized), since those fall into the "review and
// payment" `c:otherwise` here, same end destination either way.
// The failed branch's list in Stage7.jsp is the same minus BOOK-SEAT: a failed seat booking always offers
// "Click here to review and payment".
const FAILED_DASHBOARD_OR_REVIEW_TYPES = new Set([...DASHBOARD_OR_REVIEW_TYPES].filter((type) => type !== "BOOK-SEAT"));

function dashboardOrReviewCta(data, types = DASHBOARD_OR_REVIEW_TYPES) {
  if (!data.returnUrl) return null;
  if (types.has(data.contentFor) && data.initiatedVia !== "Link") {
    return { href: data.returnUrl, label: "Click here for Dashboard" };
  }
  return { href: data.returnUrl, label: "Click here to review and payment" };
}

function UnderVerificationCard({ data }) {
  const cta = dashboardOrReviewCta(data);
  return (
    <PageShell schoolSettingsLinks={data.schoolSettingsLinks} schoolName={data.displaySchoolName}>
      <div className="text-center">
        <StatusIcon variant="pending" />
        <p className="mt-3 text-xl font-bold text-slate-800">Thank You!</p>
        <h2 className="mt-1 text-2xl font-extrabold text-black">Payment Under Verification</h2>
        {data.userName && <p className="mt-3 font-semibold text-primary">Dear {data.userName},</p>}
        {data.displaySchoolName && (
          <p className="mt-1 text-sm italic text-slate-600">Greetings from {data.displaySchoolName}!</p>
        )}
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          We believe that you were trying to complete a transaction with us. However, your payment transaction is under
          verification and you will be notified through email if there is any change in your payment status. Kindly let
          us know by mailing on <ContactEmail email={data.contactEmail} /> if you need more information.
        </p>
        {data.feeFailedReason && (
          <p className="mt-3 text-sm text-slate-700">
            <b>Fee Failed Reason:</b> {data.feeFailedReason}
          </p>
        )}
        <ReturnButton cta={cta} />
      </div>
    </PageShell>
  );
}

/* -------------------------------- Failed ------------------------------- */

function FailedCard({ data }) {
  const cta = dashboardOrReviewCta(data, FAILED_DASHBOARD_OR_REVIEW_TYPES);
  return (
    <PageShell schoolSettingsLinks={data.schoolSettingsLinks} schoolName={data.displaySchoolName}>
      <div className="text-center">
        <StatusIcon variant="failed" />
        <p className="mt-3 text-xl font-bold text-slate-800">Oops!</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-rose-600 sm:text-3xl">
          {data.failedTitle || "Payment Unsuccessful"}
        </h2>
        {data.userName && <p className="mt-4 text-base font-bold text-black">Dear {data.userName}</p>}
        {data.displaySchoolName && (
          <p className="mt-3 text-sm font-semibold italic text-slate-700">Greetings from {data.displaySchoolName}!</p>
        )}
        <div className="mt-5 space-y-2 rounded-2xl bg-rose-50/80 px-5 py-4 text-sm leading-relaxed text-slate-700 ring-1 ring-rose-100">
          {data.paymentName && (
            <p className="font-semibold text-black">
              <PaymentLabel>{data.paymentName}</PaymentLabel>{data.payAmount ? ` · ${data.payAmount}` : ""}
            </p>
          )}
          <p>
            We believe that you were trying to complete a transaction with us. However, due to some issue, we have NOT
            received your payment for this transaction. Kindly let us know by mailing on{" "}
            <ContactEmail email={data.contactEmail} /> if we could help you on the same.
          </p>
          {data.feeFailedReason && (
            <p className="font-medium text-rose-700">
              <b>Fee Failed Reason:</b> {data.feeFailedReason}
            </p>
          )}
        </div>
        <ReturnButton cta={cta} />
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
        <h2 className="mt-4 text-2xl font-extrabold text-black">Something went wrong</h2>
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

function ReturnButton({ cta }) {
  if (!cta) return null;
  return (
    <a
      href={cta.href}
      className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {cta.label}
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
  // Success shows the animated tick (150x150 gif): smaller on phones, larger from md.
  if (variant === "success") {
    return (
      <Image
        src="/images/OrderSuccess.gif"
        alt="Payment successful"
        width={150}
        height={150}
        unoptimized
        priority
        className="mx-auto h-24 w-24 md:h-32 md:w-32"
      />
    );
  }
  const map = {
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
  const base = resolveBackendOrigin() || "";
  return `${base}${redirectTo.startsWith("/") ? "" : "/"}${redirectTo}`;
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
