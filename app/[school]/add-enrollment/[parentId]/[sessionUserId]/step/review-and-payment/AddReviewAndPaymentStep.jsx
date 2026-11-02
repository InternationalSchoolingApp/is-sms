"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { AddStage3ReviewPayment } from "@/components/add-enrollment/AddStage3ReviewPayment";
import { useAddEnrollmentContext } from "@/hooks/add-enrollment/useAddEnrollmentContext";
import { useAddWizardResume } from "@/hooks/add-enrollment/useAddWizardResume";
import { addEnrollmentStepPath, addEnrollmentParentPath } from "@/utils/addEnrollmentSteps";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
import { expireSession } from "@/utils/logout";

/**
 * Step 3 ("Review & Payment") of the Add Another Student wizard. Mirrors
 * app/[school]/enrollment/[program]/step/review-and-payment/ReviewAndPaymentStep.jsx,
 * but uses the CHILD's identity (childUserId/childUniqueId from Stage 1's
 * save response, injected into the add-enrollment-child cache) instead of
 * the logged-in session's own userId/uniqueId.
 */
export function AddReviewAndPaymentStep() {
  const router = useRouter();
  const { school, parentId, sessionUserId } = useParams();
  const { context, ready, childUserId, childUniqueId, childRollNo, markCompleted, refetchEnrollmentProcess } =
    useAddEnrollmentContext();
  const { redirecting } = useAddWizardResume({ currentStep: 3, context, childUniqueId, ready });

  // enrollment/process is fetched once when the wizard starts, before a custom plan is attached, and its
  // provider lives in the step layout — so arriving here from Step 2 without a browser reload would decide
  // the fee layout from a stale customPaymentEnabled=false and render the ordinary payment plans for a
  // custom-plan child. Re-ask once on entry, and hold the step until the answer is in.
  // Held in a ref so `ready` is the only dependency: the effect must re-run on Strict Mode's second setup
  // (which is why it carries no "already asked" guard — that would skip the re-run and never lift the
  // loader), but must not re-run just because the refetch function is a new identity.
  const [processFresh, setProcessFresh] = useState(false);
  const refetchRef = useRef(refetchEnrollmentProcess);
  useEffect(() => {
    refetchRef.current = refetchEnrollmentProcess;
  });
  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    // A failed refetch still lifts the loader — the step then renders from the value already in hand.
    Promise.resolve(refetchRef.current()).finally(() => {
      if (!cancelled) setProcessFresh(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready || redirecting || !processFresh) {
    return <FullScreenLoader />;
  }

  return (
    <AddStage3ReviewPayment
      context={context}
      userId={childUserId}
      uniqueId={childUniqueId}
      rollNo={childRollNo}
      // Backend says the enrollment is already complete (REDIRECT_TO_DASHBOOARD) -> thank-you view in place.
      onEnrollmentCompleted={markCompleted}
      onBack={(step) => {
        // AddStage3ReviewPayment is a hard copy of the main 4-step Stage 4,
        // so its onBack arg uses the main-flow numbering (1=student-details,
        // 2=parent-details [N/A here], 3=course-selection, 4=review). Map
        // it onto this wizard's 3-step scheme (1=student-details,
        // 2=course-selection, 3=review).
        if (step === 2 && getLearningProgramBackendValue(context.learningProgram) === "ONE_TO_ONE_FLEX") {
          router.push(addEnrollmentParentPath(school, parentId, sessionUserId));
          return;
        }
        const map = { 1: 1, 2: 1, 3: 2, 4: 3 };
        const target = map[step] ?? 2;
        router.push(addEnrollmentStepPath(school, parentId, sessionUserId, target));
      }}
      onSessionExpired={() => expireSession(school)}
    />
  );
}
