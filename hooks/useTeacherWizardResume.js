"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { resolveTeacherStepRedirect, teacherStepPath } from "@/utils/teacherRegistrationSteps";

/**
 * Stage resume for the teacher steps, driven by the backend like the legacy resume page
 * ({schoolId}/teacher/signup/process/{uniqueId}), which renders the step the teacher's firstReset belongs to.
 * A full page load (refresh, typed URL, reopened tab) reads `wizardStep` (1-6, the next step still pending) from
 * teacher/registration/process (already in the context) and, per resolveTeacherStepRedirect, moves a teacher who
 * opened a step AHEAD of it back to it. A step behind the marker stays open while the profile can still be edited
 * (so a teacher can go back and correct a form), but not once it is with the school. Going Back/Continue inside the
 * app never reloads the document, so only the first run per document load asks (the
 * `window.__teacherWizardResumeChecked` latch).
 *
 * `redirecting` is decided on the first ready render (before any effect), so the step can show a loader instead of
 * flashing its own content and then moving, and stays latched until this step unmounts after the redirect.
 */
export function useTeacherWizardResume({ currentStep, context, ready }) {
  const router = useRouter();
  const { school } = useParams();
  const target = resolveTeacherStepRedirect({
    currentStep,
    wizardStep: context?.wizardStep,
    editable: context?.state === "FORM",
  });

  const [decided, setDecided] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  if (ready && !decided && typeof window !== "undefined") {
    setDecided(true);
    setRedirecting(!window.__teacherWizardResumeChecked && target !== null);
  }

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    if (window.__teacherWizardResumeChecked) return;
    window.__teacherWizardResumeChecked = true;
    // No wizardStep (process failed or answered none) or a step the teacher may stay on: nothing to do.
    if (target !== null) router.replace(teacherStepPath(school, target));
  }, [ready, target, router, school]);

  return { redirecting };
}
