"use client";

import { useParams, useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { AddStage3ReviewPayment } from "@/components/add-enrollment/AddStage3ReviewPayment";
import { useAddEnrollmentContext } from "@/hooks/add-enrollment/useAddEnrollmentContext";
import { useAddWizardResume } from "@/hooks/add-enrollment/useAddWizardResume";
import { addEnrollmentStepPath } from "@/utils/addEnrollmentSteps";
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
  const { context, ready, childUserId, childUniqueId } = useAddEnrollmentContext();
  const { redirecting } = useAddWizardResume({ currentStep: 3, context, childUniqueId, ready });

  if (!ready || redirecting) {
    return <FullScreenLoader />;
  }

  return (
    <AddStage3ReviewPayment
      context={context}
      userId={childUserId}
      uniqueId={childUniqueId}
      onBack={(step) => {
        // AddStage3ReviewPayment is a hard copy of the main 4-step Stage 4,
        // so its onBack arg uses the main-flow numbering (1=student-details,
        // 2=parent-details [N/A here], 3=course-selection, 4=review). Map
        // it onto this wizard's 3-step scheme (1=student-details,
        // 2=course-selection, 3=review).
        const map = { 1: 1, 2: 1, 3: 2, 4: 3 };
        const target = map[step] ?? 2;
        router.push(addEnrollmentStepPath(school, parentId, sessionUserId, target));
      }}
      onSessionExpired={() => expireSession(school)}
    />
  );
}
