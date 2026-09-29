"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Stage2ParentDetails } from "@/components/student-enroll/Stage2ParentDetails";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { useWizardResume } from "@/hooks/useWizardResume";
import { loadWizardStudentFields, loadWizardParentFields, saveWizardParentFields } from "@/utils/wizardStorage";

/**
 * Stage 2 ("Parent information") as its own flat route. `studentAddress`
 * (for the "same as student" default) comes from sessionStorage — see
 * utils/wizardStorage.js — since Stage 1's live component state doesn't
 * exist anymore once you've navigated away from /step/1. Stage 2's own
 * fields are persisted/reloaded the same way, so Back from /step/3 (or a
 * refresh) re-fills the parent form instead of resetting it.
 */
export default function Step2Page() {
  const router = useRouter();
  const { status, session, context, logoUrl, ready } = useEnrollmentContext();
  useWizardResume({ currentStep: 2, context, uniqueId: session?.uniqueId, ready });
  const [studentFields, setStudentFields] = useState(null);
  const [parentFields, setParentFields] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (!ready) return;
    setStudentFields(loadWizardStudentFields(context.schoolUUID, session.userId));
    setParentFields(loadWizardParentFields(context.schoolUUID, session.userId));
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
      currentStepKey="parent"
      onLogout={() => signOut({ callbackUrl: "/" })}
    >
      <Stage2ParentDetails
        context={context}
        userId={session.userId}
        studentAddress={{
          countryId: studentFields?.countryId,
          stateId: studentFields?.stateId,
          cityId: studentFields?.cityId,
        }}
        initialFields={parentFields}
        onNext={(fields) => {
          saveWizardParentFields(context.schoolUUID, session.userId, fields);
          console.log("Stage 2 complete, TODO Stage 3:", fields);
          router.push("/step/3");
        }}
        onBack={() => router.push("/step/1")}
      />
    </EnrollmentWizardShell>
  );
}
