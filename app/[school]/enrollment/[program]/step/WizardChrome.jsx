"use client";

import { useEffect } from "react";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { EnrollmentProvider, useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { expireSession, logoutEverywhere } from "@/utils/logout";

/**
 * Single shared chrome for the whole enrollment wizard, mounted once by the
 * step-group layout (app/[school]/enrollment/[program]/step/layout.jsx). It
 * resolves the enrollment context a single time (EnrollmentProvider) and
 * wraps every step page in one EnrollmentWizardShell instance, so the shell
 * — and the context's logo/public-info/location side effects — are no longer
 * duplicated per step.
 *
 * The step currently being shown comes from the active child route segment
 * (useSelectedLayoutSegment), which drives the shell's stepper highlight and
 * the review step's own "plain" / "hide stepper" layout. Individual step
 * pages now render only their step-specific content inside this shell.
 */

// Route segment (the step folder name) -> the shell's step key.
const SEGMENT_TO_STEP_KEY = {
  "student-details": "student",
  "parent-details": "parent",
  "course-selection": "course_selection",
  "review-and-payment": "review_and_payment",
};

function WizardFrame({ children }) {
  const { school } = useParams();
  const segment = useSelectedLayoutSegment();
  const { status, session, context, logoUrl, ready } = useEnrollmentContext();

  // Session-expiry guard, hoisted here from the individual steps: since this
  // chrome gates whether steps mount at all, it must own the redirect (the
  // proxy already blocks unauthenticated navigations server-side; this covers
  // a session dropping while the wizard is open).
  useEffect(() => {
    if (status === "unauthenticated") expireSession(school);
  }, [status, school]);

  // Back/forward can restore this page from the browser's back/forward cache with its old
  // in-memory session (e.g. after logout); reload so the server re-checks the session.
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Match the pre-refactor behavior: nothing of the wizard shows until the
  // enrollment context is ready (each step used to gate on this itself).
  if (!ready) {
    return <FullScreenLoader />;
  }

  const currentStepKey = SEGMENT_TO_STEP_KEY[segment];
  // Review & payment keeps its own full-width "plain" layout, and hides the
  // stepper for custom-payment students — same as the old step-4 props.
  const isReview = segment === "review-and-payment";
  const plain = isReview;
  const hideStepper = isReview && context?.customPaymentEnabled === true;

  return (
    <EnrollmentWizardShell
      schoolName={context.schoolName}
      logoUrl={logoUrl}
      context={context}
      currentStepKey={currentStepKey}
      plain={plain}
      hideStepper={hideStepper}
      onLogout={() => logoutEverywhere(session)}
    >
      {children}
    </EnrollmentWizardShell>
  );
}

export function WizardChrome({ children }) {
  return (
    <EnrollmentProvider>
      <WizardFrame>{children}</WizardFrame>
    </EnrollmentProvider>
  );
}
