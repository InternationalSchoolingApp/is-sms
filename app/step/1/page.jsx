"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Stage1StudentDetails } from "@/components/student-enroll/Stage1StudentDetails";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { saveWizardStudentFields, loadWizardStudentFields } from "@/utils/wizardStorage";

/**
 * Stage 1 ("Student profile") as its own flat route — replaces the old
 * /[schoolId]/student/enrollment page's "student" branch. schoolUUID comes
 * from the Auth.js session (see hooks/useEnrollmentContext.js / auth.js),
 * not a URL param — this route intentionally carries no {schoolId} segment.
 */
export default function Step1Page() {
  const router = useRouter();
  const { status, session, context, logoUrl, ready } = useEnrollmentContext();
  const [initialFields, setInitialFields] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (!ready) return;
    const saved = loadWizardStudentFields(context.schoolUUID, session.userId);
    // No saved progress yet (first-ever visit, e.g. right after signup or
    // the SSO handoff from login) — default the email field to the one the
    // student just signed up / logged in with (session.email, from
    // auth.js), rather than leaving it blank for them to retype. Once
    // they've saved Stage 1 at least once, `saved` always wins.
    setInitialFields(saved || (session.email ? { communicationEmail: session.email } : null));
    setHydrated(true);
  }, [ready, context?.schoolUUID, session?.userId, session?.email]);

  if (!ready || !hydrated) {
    return <main className="flex min-h-screen items-center justify-center text-slate-500">Loading…</main>;
  }

  return (
    <EnrollmentWizardShell
      schoolName={context.schoolName}
      logoUrl={logoUrl}
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
