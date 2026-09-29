"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Stage1StudentDetails } from "@/components/student-enroll/Stage1StudentDetails";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { useWizardResume } from "@/hooks/useWizardResume";
import { useStudentDetailsPrefill } from "@/hooks/useStudentDetailsSignup";
import { saveWizardStudentFields, loadWizardStudentFields } from "@/utils/wizardStorage";

/**
 * Stage 1 ("Student profile") as its own flat route — replaces the old
 * /[schoolId]/student/enrollment page's "student" branch. schoolUUID comes
 * from the Auth.js session (see hooks/useEnrollmentContext.js / auth.js),
 * not a URL param — this route intentionally carries no {schoolId} segment.
 *
 * Prefill priority, resolved before the form ever mounts (see the
 * !hydrated gate below — Stage1StudentDetails only reads initialFields at
 * mount, not on later prop changes):
 *   1. Backend (get-student-details) — the real saved record, so a student
 *      resuming from a fresh SSO handoff sees what they already entered.
 *   2. This tab's sessionStorage — covers the backend call failing, or a
 *      first-ever visit where nothing's saved server-side yet either.
 *   3. Just the signed-up email (session.email, from auth.js), as a last
 *      resort so that one field isn't blank.
 */
export default function Step1Page() {
  const router = useRouter();
  const { status, session, context, logoUrl, ready } = useEnrollmentContext();
  useWizardResume({ currentStep: 1, context, uniqueId: session?.uniqueId, ready });
  const prefill = useStudentDetailsPrefill({ context, userId: session?.userId });
  const [initialFields, setInitialFields] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (!ready || prefill.isPending) return;
    const saved = loadWizardStudentFields(context.schoolUUID, session.userId);
    setInitialFields(prefill.data || saved || (session.email ? { communicationEmail: session.email } : null));
    setHydrated(true);
  }, [ready, prefill.isPending, prefill.data, context?.schoolUUID, session?.userId, session?.email]);

  if (!ready || !hydrated) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <EnrollmentWizardShell
      schoolName={context.schoolName}
      logoUrl={logoUrl}
      context={context}
      currentStepKey="student"
      onLogout={() => signOut({ callbackUrl: "/" })}
    >
      <Stage1StudentDetails
        context={context}
        userId={session.userId}
        initialFields={initialFields}
        onNext={(fields) => {
          saveWizardStudentFields(context.schoolUUID, session.userId, fields);
          router.push("/step/2");
        }}
      />
    </EnrollmentWizardShell>
  );
}
