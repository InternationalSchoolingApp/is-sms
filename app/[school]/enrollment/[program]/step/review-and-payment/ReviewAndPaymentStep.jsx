"use client";

import { FullScreenLoader } from "@/components/common/Loader";
import { useParams, useRouter } from "next/navigation";
import { expireSession } from "@/utils/logout";
import { Stage4ReviewPayment } from "@/components/student-enroll/Stage4ReviewPayment";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { useWizardResume } from "@/hooks/useWizardResume";
import { stepPath } from "@/utils/wizardSteps";

/**
 * Stage 4 ("Review and Payment") step content, rendered inside the shared
 * EnrollmentWizardShell from the step-group layout (which applies the
 * review step's full-width "plain" layout and hides the stepper for
 * custom-payment students). get-student-review-details on load,
 * choose-payment-plan if the student switches plans, then either
 * submit-application/proceed-to-dashboard (no payment) or the payment
 * gateway (Confirm & Pay). See Stage4ReviewPayment.jsx for the full port
 * of getReviewAndPayContent()/showPaymentModal() from the legacy JS.
 */
export function ReviewAndPaymentStep() {
  const router = useRouter();
  const { school, program } = useParams();
  const { session, context, ready } = useEnrollmentContext();
  const { redirecting } = useWizardResume({ currentStep: 4, context, uniqueId: session?.uniqueId, ready });

  if (!ready || redirecting) {
    return <FullScreenLoader />;
  }

  return (
    <Stage4ReviewPayment
      context={context}
      userId={session.userId}
      uniqueId={session.uniqueId}
      onBack={(step) => router.push(stepPath(school, program, step || 3))}
      onSessionExpired={() => expireSession(school)}
    />
  );
}
