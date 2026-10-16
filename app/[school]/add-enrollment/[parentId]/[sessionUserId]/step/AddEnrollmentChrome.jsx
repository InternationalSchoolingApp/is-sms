"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSelectedLayoutSegment } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { loadAddEnrollmentChildUniqueId, loadAddEnrollmentRollNo } from "@/utils/addEnrollmentStorage";
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

function AddWizardFrame({ children }) {
  const router = useRouter();
  const { school, parentId, sessionUserId } = useParams();
  const segment = useSelectedLayoutSegment();
  const { status, session, context, logoUrl, ready, isError, completed, childUniqueId, childRollNo } =
    useAddEnrollmentContext();

  useEffect(() => {
    if (status === "unauthenticated") expireSession(school);
  }, [status, school]);

  // The child is already enrolled (paid here, or via the payment link in another browser): send the user to the
  // payment-response thank-you page (ae=Y = add-enrollment, replay=Y = no gateway params to verify) so the URL
  // is the thank-you one and a refresh stays there instead of re-entering the wizard.
  useEffect(() => {
    if (!completed) return;
    // Name the finished child explicitly: the thank-you API finds it by roll number / unique id.
    // The child the backend resolved for this load (S003 = the paid one) first, the remembered one as fallback.
    const rollNo = childRollNo || loadAddEnrollmentRollNo(session?.schoolUUID, parentId);
    const uniqueId = childUniqueId || loadAddEnrollmentChildUniqueId(session?.schoolUUID, parentId);
    const query = new URLSearchParams({ ae: "Y", replay: "Y", parentId, sessionUserId });
    if (rollNo) query.set("rollNo", rollNo);
    if (uniqueId) query.set("childUniqueId", uniqueId);
    router.replace(`/${school}/common/payment-response-success?${query.toString()}`);
  }, [completed, router, school, parentId, sessionUserId, childRollNo, childUniqueId, session?.schoolUUID]);

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
    return <FullScreenLoader />;
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
