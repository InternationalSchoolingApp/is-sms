"use client";

import { useEffect } from "react";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { BookOpen, ClipboardCheck, FileSignature, Landmark, ShieldCheck, User } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { EnrollmentWizardShell } from "@/components/student-enroll/wizard/EnrollmentWizardShell";
import { TeacherRegistrationProvider, useTeacherRegistrationContext } from "@/hooks/useTeacherRegistrationContext";
import { useBackendSessionGuard } from "@/hooks/useBackendSessionGuard";
import { expireSession, logoutEverywhere } from "@/utils/logout";
import { TEACHER_SEGMENT_TO_STEP } from "@/utils/teacherRegistrationSteps";

/**
 * Single shared chrome for the whole teacher registration wizard, mounted once by the step-group layout
 * (app/[school]/teacher-registration/step/layout.jsx): one TeacherRegistrationProvider and one wizard shell around
 * every step route, so the shell and the context's side effects are not repeated per step. It reuses the student
 * wizard's shell (header, Log Off dialog, stepper, footer) with the six teacher steps below, so a teacher sees the
 * same look as a student.
 */

// Shell step key -> label/icon, in wizard order (keys are the route slugs' step numbers).
const TEACHER_STEPS = [
  { key: "personal-details", label: "Personal details", icon: User },
  { key: "professional-details", label: "Professional details", icon: BookOpen },
  { key: "review", label: "Review", icon: ClipboardCheck },
  { key: "contract", label: "Contract", icon: FileSignature },
  { key: "verification", label: "Verification", icon: ShieldCheck },
  { key: "bank-details", label: "Bank details", icon: Landmark },
];

function TeacherWizardFrame({ children }) {
  const { school } = useParams();
  const segment = useSelectedLayoutSegment();
  const { status, session, context, logoUrl, ready, wrongRole } = useTeacherRegistrationContext();

  useEffect(() => {
    if (!ready) return;
    document.title = "Teacher Registration";
  }, [ready]);

  // Session-expiry guard: the proxy already blocks unauthenticated navigations server-side; this covers a session
  // dropping while the wizard is open.
  useEffect(() => {
    if (status === "unauthenticated") expireSession(school);
  }, [status, school]);

  // Cross-app single-logout: confirm this user is still logged in on the Java backend too.
  useBackendSessionGuard(school, session, status);

  // Back/forward can restore this page from the bfcache with its old in-memory session (e.g. after logout);
  // reload so the server re-checks the session.
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (wrongRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f2f5fa] px-4">
        <div className="max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-black">This page is for teachers</h1>
          <p className="mt-2 text-sm text-slate-600">
            You are signed in with a different account. Log off, then sign in with your teacher account to continue
            your registration.
          </p>
          <button
            type="button"
            onClick={() => logoutEverywhere(session)}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Log Off
          </button>
        </div>
      </div>
    );
  }

  // Nothing of the wizard shows until the teacher's context is ready (each step used to gate on this itself).
  if (!ready) {
    return <FullScreenLoader />;
  }

  const currentStepKey = TEACHER_STEPS[(TEACHER_SEGMENT_TO_STEP[segment] ?? 0) - 1]?.key;

  return (
    <EnrollmentWizardShell
      schoolName={context.schoolName}
      logoUrl={logoUrl}
      context={null}
      currentStepKey={currentStepKey}
      steps={TEACHER_STEPS}
      onLogout={() => logoutEverywhere(session)}
    >
      {children}
    </EnrollmentWizardShell>
  );
}

export function TeacherWizardChrome({ children }) {
  return (
    <TeacherRegistrationProvider>
      <TeacherWizardFrame>{children}</TeacherWizardFrame>
    </TeacherRegistrationProvider>
  );
}
