"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Stage3CourseSelection } from "@/components/student-enroll/Stage3CourseSelection";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { useWizardResume } from "@/hooks/useWizardResume";
import { loadWizardStudentFields } from "@/utils/wizardStorage";

/**
 * Stage 3 ("Course Selection") as its own flat route. Course choices are
 * persisted by the backend on every add/remove, so unlike /step/1 and
 * /step/2 there's nothing of Stage 3's OWN fields to keep in
 * sessionStorage here — but the initial course-details-by-standard-id read
 * still needs Stage 1's saved grade (see Stage3CourseSelection.jsx's doc
 * comment and useCourseSelection.js), so that one field is loaded the same
 * way /step/2 loads it for its own "same as student" default.
 */
export default function Step3Page() {
  const router = useRouter();
  const { status, session, context, logoUrl, ready } = useEnrollmentContext();
  useWizardResume({ currentStep: 3, context, uniqueId: session?.uniqueId, ready });
  const [standardId, setStandardId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (!ready) return;
    setStandardId(loadWizardStudentFields(context.schoolUUID, session.userId)?.standardId || null);
    setHydrated(true);
  }, [ready, context?.schoolUUID, session?.userId]);

  if (!ready || !hydrated) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <EnrollmentWizardShell
      schoolName={context.schoolName}
      logoUrl={logoUrl}
      context={context}
      currentStepKey="course_selection"
      onLogout={() => signOut({ callbackUrl: "/" })}
    >
      <Stage3CourseSelection
        context={context}
        userId={session.userId}
        standardId={standardId}
        onNext={() => router.push("/step/4")}
        onBack={() => router.push("/step/2")}
        onSessionExpired={() => signOut({ callbackUrl: "/" })}
      />
    </EnrollmentWizardShell>
  );
}
