"use client";

import { useEffect } from "react";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { EnrollmentWizardShell, WIZARD_STEP_META } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { AddEnrollmentProvider, useAddEnrollmentContext } from "@/hooks/add-enrollment/useAddEnrollmentContext";
import { expireSession, logoutEverywhere } from "@/utils/logout";

/**
 * Chrome for the "Add Another Student" wizard — 3-entry counterpart of
 * app/[school]/enrollment/[program]/step/WizardChrome.jsx (no parent-details
 * step: the parent is already known, see useAddEnrollmentContext).
 */
const SEGMENT_TO_STEP_KEY = {
  "student-details": "student",
  "course-selection": "course_selection",
  "review-and-payment": "review_and_payment",
};

const ADD_WIZARD_STEPS = ["student", "course_selection", "review_and_payment"].map((key) => ({
  key,
  ...WIZARD_STEP_META[key],
}));

function AddWizardFrame({ children }) {
  const { school } = useParams();
  const segment = useSelectedLayoutSegment();
  const { status, session, context, ready, isError } = useAddEnrollmentContext();

  useEffect(() => {
    if (status === "unauthenticated") expireSession(school);
  }, [status, school]);

  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (isError) {
    return <FullScreenLoader message="Something went wrong. Please refresh the page." />;
  }

  if (!ready) {
    return <FullScreenLoader />;
  }

  const currentStepKey = SEGMENT_TO_STEP_KEY[segment];

  return (
    <EnrollmentWizardShell
      schoolName={context.schoolName}
      context={context}
      currentStepKey={currentStepKey}
      steps={ADD_WIZARD_STEPS}
      onLogout={() => logoutEverywhere(session)}
    >
      {children}
    </EnrollmentWizardShell>
  );
}

export function AddEnrollmentChrome({ children }) {
  return (
    <AddEnrollmentProvider>
      <AddWizardFrame>{children}</AddWizardFrame>
    </AddEnrollmentProvider>
  );
}
