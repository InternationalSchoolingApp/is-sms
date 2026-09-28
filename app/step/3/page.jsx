"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Stage3CourseSelection } from "@/components/student-enroll/Stage3CourseSelection";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";

/**
 * Stage 3 ("Course Selection") as its own flat route. Course choices are
 * persisted by the backend on every add/remove, so unlike /step/1 and
 * /step/2 there's nothing to keep in sessionStorage here.
 */
export default function Step3Page() {
  const router = useRouter();
  const { status, session, context, logoUrl, ready } = useEnrollmentContext();

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
      <Stage3CourseSelection
        context={context}
        userId={session.userId}
        onNext={() => router.push("/step/4")}
        onBack={() => router.push("/step/2")}
        onSessionExpired={() => signOut({ callbackUrl: "/" })}
      />
    </EnrollmentWizardShell>
  );
}
