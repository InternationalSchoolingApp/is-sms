"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useReEnrollmentContext } from "@/hooks/useReEnrollment";
import { reEnrollmentBasePath, reEnrollmentStepPath } from "@/utils/reEnrollmentSteps";

/**
 * Guard of the step screens (payment / course selection / review): they only make sense after an option was
 * selected, and only if the backend still lists the screen in the option's steps.
 *  - no selected option            -> back to the option screen
 *  - screen no longer in the steps -> to the step the student has to do now (e.g. PAYMENT after the fee was paid)
 * Returns true when the screen may render.
 */
export function useRequireSelectedOption(step) {
  const router = useRouter();
  const { school, mode } = useParams();
  const { inProgress, steps, eligibility } = useReEnrollmentContext();
  const listed = steps.includes(step);

  useEffect(() => {
    if (!inProgress) router.replace(reEnrollmentBasePath(school, mode));
    else if (!listed) router.replace(reEnrollmentStepPath(school, eligibility.currentStep, mode));
  }, [inProgress, listed, eligibility?.currentStep, router, school, mode]);

  return inProgress && listed;
}
