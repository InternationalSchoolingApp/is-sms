"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";

/**
 * Stage 4 ("Review and Payment") route. Reserved so the /step/3 -> /step/4
 * navigation and the SSO resume (nextSessionStage 4) already land
 * somewhere; the review page (get-student-review-details, plan cards,
 * payment-method modal) isn't built yet.
 */
export default function Step4Page() {
  const router = useRouter();
  const { status, context, logoUrl, ready } = useEnrollmentContext();

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
      onLogout={() => signOut({ callbackUrl: "/" })}
    >
      <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Review and payment</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">Step 4 of 4. Review your details and choose a payment plan — coming soon.</p>
      <div className="mt-10 border-t border-slate-200 pt-6">
        <Button type="button" variant="outline" onClick={() => router.push("/step/3")}>
          Back
        </Button>
      </div>
    </EnrollmentWizardShell>
  );
}
