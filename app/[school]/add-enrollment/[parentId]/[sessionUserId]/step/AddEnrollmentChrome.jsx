"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { SuccessCard, isFirstPayment } from "@/components/common/PaymentResponseView";
import { getAddEnrollmentThankYou } from "@/services/addEnrollmentBackendApi";
import { loadAddEnrollmentRollNo } from "@/utils/addEnrollmentStorage";
import { AddEnrollmentWizardShell, WIZARD_STEP_META } from "@/components/add-enrollment/AddEnrollmentWizardShell";
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

// The child is already enrolled (paid here or from the payment link in another browser): same success view the
// payment-response page shows, filled from the thank-you details API, in place of the wizard steps.
function AddEnrollmentCompleted() {
  const { parentId } = useParams();
  const { session, childRollNo } = useAddEnrollmentContext();
  const rollNo = childRollNo || loadAddEnrollmentRollNo(session?.schoolUUID, parentId);
  const details = useQuery({
    queryKey: ["add-enrollment-completed", session?.schoolUUID, parentId, rollNo],
    queryFn: () =>
      getAddEnrollmentThankYou(session.schoolUUID, {
        parentId,
        sessionUserId: session.userId,
        sessionUniqueId: session.uniqueId,
        studentRollNumber: rollNo,
      }),
    enabled: Boolean(session?.userId && session?.uniqueId && session?.schoolUUID),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (!session?.userId || details.isPending) return <FullScreenLoader />;
  const info = details.data?.status === "1" ? details.data.data : null;
  return (
    <SuccessCard
      data={{
        contentFor: "FIRST-PAYMENT",
        advanceFeePaid: "N",
        userName: info?.studentName,
        payAmount: info?.payAmount,
        grade: info?.grade,
        learningProgram: info?.learningProgram,
        displaySchoolName: session.schoolName,
        accountSetup: isFirstPayment(info) ? info : null,
      }}
    />
  );
}

function AddWizardFrame({ children }) {
  const { school } = useParams();
  const segment = useSelectedLayoutSegment();
  const { status, session, context, logoUrl, ready, isError, completed } = useAddEnrollmentContext();

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

  if (completed) {
    return <AddEnrollmentCompleted />;
  }

  if (!ready) {
    return <FullScreenLoader />;
  }

  const currentStepKey = SEGMENT_TO_STEP_KEY[segment];
  // Review & payment keeps its own full-width "plain" layout, and hides the
  // stepper for custom-payment students — same as the main WizardChrome.
  const isReview = segment === "review-and-payment";
  const plain = isReview;
  const hideStepper = isReview && context?.customPaymentEnabled === true;

  return (
    <AddEnrollmentWizardShell
      schoolName={context.schoolName}
      logoUrl={logoUrl}
      context={context}
      currentStepKey={currentStepKey}
      steps={ADD_WIZARD_STEPS}
      plain={plain}
      hideStepper={hideStepper}
      onLogout={() => logoutEverywhere(session)}
    >
      {children}
    </AddEnrollmentWizardShell>
  );
}

export function AddEnrollmentChrome({ children }) {
  return (
    <AddEnrollmentProvider>
      <AddWizardFrame>{children}</AddWizardFrame>
    </AddEnrollmentProvider>
  );
}
