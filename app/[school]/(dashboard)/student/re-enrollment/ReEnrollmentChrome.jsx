"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter, useSelectedLayoutSegment } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { SchoolThemeStyle } from "@/components/common/SchoolThemeStyle";
import { ReEnrollmentProvider, useReEnrollmentContext } from "@/hooks/useReEnrollment";
import { ReEnrollmentFlow } from "@/components/re-enrollment/ReEnrollmentFlow";
import { expireSession } from "@/utils/logout";
import { reEnrollmentStepPath, SEGMENT_TO_STEP, STEP_PAYMENT } from "@/utils/reEnrollmentSteps";

/**
 * Custom payment plan, the same way the enrollment wizard handles it:
 *  - while its first installment is unpaid the student is on the PAYMENT step, whatever screen they were on (also when the
 *    admin confirms the plan while this page is open: the eligibility poll picks it up);
 *  - the grade fee getting paid elsewhere (the admin's payment link, another tab) shows the payment success page, whose
 *    countdown goes to the dashboard and on to the next step (course selection), like a payment made here.
 */
function useCustomPlanWatch() {
  const router = useRouter();
  const { school } = useParams();
  const segment = useSelectedLayoutSegment();
  const { ready, customPlanUnpaid, eligibility, steps } = useReEnrollmentContext();
  const feePaid = eligibility?.feePaid;
  const previousFeePaid = useRef(feePaid);

  useEffect(() => {
    if (ready && customPlanUnpaid && steps.includes(STEP_PAYMENT) && SEGMENT_TO_STEP[segment] !== STEP_PAYMENT) {
      router.replace(reEnrollmentStepPath(school, STEP_PAYMENT));
    }
  }, [ready, customPlanUnpaid, steps, segment, router, school]);

  useEffect(() => {
    const wasUnpaid = previousFeePaid.current === false;
    previousFeePaid.current = feePaid;
    // A payment made from this page leaves it for the gateway; one still here when the fee turns paid was made elsewhere.
    if (ready && wasUnpaid && feePaid === true && !window.__reEnrollmentGatewayStarted) {
      window.location.replace(`/${school}/common/other-payment-response-success?re=Y&replay=Y`);
    }
  }, [ready, feePaid, school]);
}

/**
 * Chrome of the re-enrollment pages, mounted once by the route layout: resolves the re-enrollment context
 * (session, ENROLLMENT_VIA_NEXTJS, eligibility). The student dashboard layout around it provides the
 * sidebar / header / footer.
 */
function Frame({ children }) {
  const { school } = useParams();
  const { status, rootcss, ready, leavingForDashboard, loadFailed, retryLoading } = useReEnrollmentContext();
  useCustomPlanWatch();

  useEffect(() => {
    if (status === "unauthenticated") expireSession(school);
  }, [status, school]);

  // Back/forward can restore this page from the bfcache with its old session (e.g. after logout).
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (loadFailed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm font-semibold text-red-600">Could not load your re-enrollment details.</p>
        <button type="button" onClick={() => retryLoading()} className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
          Try again
        </button>
      </div>
    );
  }
  // Nothing of the pages shows until the context is ready, and not at all while leaving for the dashboard.
  if (!ready || leavingForDashboard) return <FullScreenLoader />;

  return (
    <>
      <SchoolThemeStyle rootcss={rootcss} />
      <div className="mx-auto w-full max-w-[1310px]"><ReEnrollmentFlow>{children}</ReEnrollmentFlow></div>
    </>
  );
}

export function ReEnrollmentChrome({ children }) {
  return (
    <ReEnrollmentProvider>
      <Frame>{children}</Frame>
    </ReEnrollmentProvider>
  );
}
