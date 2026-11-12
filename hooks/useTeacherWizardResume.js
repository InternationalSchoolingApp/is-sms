"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isTeacherStep, teacherStepPath } from "@/utils/teacherRegistrationSteps";

/**
 * Stage resume for the teacher steps, driven by the backend like the legacy resume page
 * ({schoolId}/teacher/signup/process/{uniqueId}), which renders the step the teacher's firstReset belongs to.
 * A full page load (refresh, typed URL, reopened tab) reads `wizardStep` (1-6) from teacher/registration/process
 * (already in the context) and moves to it when it differs. Going Back/Continue inside the app never reloads the
 * document, so only the first run per document load asks (the `window.__teacherWizardResumeChecked` latch).
 *
 * Unlike the student wizard, a teacher is not pulled to the step *behind* a marker and then forward again: the
 * backend's step is the single place the teacher belongs (after submitting the profile they cannot reopen the
 * forms), so any other step is replaced by it.
 *
 * `redirecting` is decided on the first ready render (before any effect), so the step can show a loader instead of
 * flashing its own content and then moving, and stays latched until this step unmounts after the redirect.
 */
export function useTeacherWizardResume({ currentStep, context, ready }) {
  const router = useRouter();
  const { school } = useParams();
  const target = isTeacherStep(context?.wizardStep) ? Number(context.wizardStep) : null;

  const [decided, setDecided] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  if (ready && !decided && typeof window !== "undefined") {
    setDecided(true);
    setRedirecting(!window.__teacherWizardResumeChecked && target !== null && target !== currentStep);
  }

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    if (window.__teacherWizardResumeChecked) return;
    window.__teacherWizardResumeChecked = true;
    // No wizardStep (process failed or answered none): stay on this step.
    if (target !== null && target !== currentStep) router.replace(teacherStepPath(school, target));
  }, [ready, target, currentStep, router, school]);

  return { redirecting };
}
