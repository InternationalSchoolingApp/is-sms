"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Stage4ReviewPayment } from "@/components/student-enroll/Stage4ReviewPayment";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { logoutEverywhere } from "@/utils/logout";
import { useWizardResume } from "@/hooks/useWizardResume";
import { STEP_ROUTES } from "@/utils/wizardSteps";

/**
 * Stage 4 ("Review and Payment") route — get-student-review-details on
 * load, choose-payment-plan if the student switches plans, then either
 * submit-application/proceed-to-dashboard (no payment) or the payment
 * gateway (Confirm & Pay). See Stage4ReviewPayment.jsx for the full port
 * of getReviewAndPayContent()/showPaymentModal() from the legacy JS.
 */
export default function StudentEnrollmentStep4() {
  const router = useRouter();
  const { status, session, context, logoUrl, ready } = useEnrollmentContext();
  useWizardResume({ currentStep: 4, context, uniqueId: session?.uniqueId, ready });

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  if (!ready) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <EnrollmentWizardShell
      schoolName={context.schoolName}
      logoUrl={logoUrl}
      currentStepKey="review_and_payment"
      onLogout={() => logoutEverywhere(session)}
    >
      <Stage4ReviewPayment
        context={context}
        userId={session.userId}
        uniqueId={session.uniqueId}
        onBack={(step) => router.push(STEP_ROUTES[step] || STEP_ROUTES[3])}
        onSessionExpired={() => signOut({ callbackUrl: "/" })}
      />
    </EnrollmentWizardShell>
  );
}
