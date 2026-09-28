"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";

/**
 * Stage 3 ("Course Selection") route — reserved so /step/1 -> /step/2 -> /step/3
 * navigation is already wired and testable, but the actual course/payment-plan
 * component isn't built yet (see the migration plan's Step 5). Replace this
 * body with Stage3CourseAndPayment.jsx once it exists; the shell/guard/session
 * wiring here won't need to change.
 */
export default function Step3Page() {
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
      currentStepKey="course_selection"
      onLogout={() => signOut({ callbackUrl: "/" })}
    >
      <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Course selection</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        Step 3 of 4. Grade/course selection and payment plan — coming soon.
      </p>
      <div className="mt-10 border-t border-slate-200 pt-6">
        <Button type="button" variant="outline" onClick={() => router.push("/step/2")}>
          Back
        </Button>
      </div>
    </EnrollmentWizardShell>
  );
}
