"use client";

import { FullScreenLoader } from "@/components/common/Loader";
import { useTeacherRegistrationContext } from "@/hooks/useTeacherRegistrationContext";
import { useTeacherWizardResume } from "@/hooks/useTeacherWizardResume";

/**
 * Stand-in body of a teacher registration step while the real screens are built (P3-P6). It already runs the
 * wizard's stage resume, so landing on, refreshing or typing the URL of any step moves the teacher to the step the
 * backend says they belong on; only the form itself is missing.
 */
export function TeacherStepPlaceholder({ step, title }) {
  const { context, ready } = useTeacherRegistrationContext();
  const { redirecting } = useTeacherWizardResume({ currentStep: step, context, ready });

  if (redirecting) return <FullScreenLoader />;

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-xl bg-white p-6 shadow-sm md:mt-8" data-testid="teacher-step-placeholder">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {step} of 6</p>
      <h2 className="mt-1 text-xl font-extrabold text-black">{title}</h2>
      <p className="mt-3 text-sm text-slate-600">This step is being built. You are signed in and in the right place.</p>
      {context?.state === "LOCKED" && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your registration is locked while the school reviews it.
        </p>
      )}
    </div>
  );
}
