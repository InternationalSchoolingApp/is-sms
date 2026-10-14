"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { addEnrollmentStepPath } from "@/utils/addEnrollmentSteps";

/**
 * 3-step counterpart of hooks/useWizardResume.js for the "Add Another
 * Student" wizard (1 = student-details, 2 = course-selection, 3 = review).
 * Same behaviour: a load of a step BEHIND the marker resumes at the last
 * step that holds saved details (2 when the marker is the review step)
 * rather than dropping the user on the review page; loading the marker's
 * own step stays put; loading a step AHEAD of the marker is pulled back to it.
 * Custom-payment students skip straight to the review step.
 */
function resolveResumeStep(currentStep, marker) {
  if (!(marker >= 1 && marker <= 3) || marker === currentStep) return currentStep;
  return currentStep < marker ? Math.min(marker, 2) : marker;
}

export function useAddWizardResume({ currentStep, context, childUniqueId, ready }) {
  const router = useRouter();
  const { school, parentId, sessionUserId } = useParams();

  const redirecting = useRef(null);
  if (redirecting.current === null && ready && childUniqueId && typeof window !== "undefined") {
    let block = false;
    if (context?.customPaymentEnabled) {
      block = currentStep !== 3;
    } else if (!window.__addWizardResumeChecked) {
      const signupPage = Number(context?.signupPage);
      block = signupPage >= 1 && signupPage <= 3 && resolveResumeStep(currentStep, signupPage) !== currentStep;
    }
    redirecting.current = block;
  }

  useEffect(() => {
    if (!ready || !childUniqueId || typeof window === "undefined") return;
    if (context?.customPaymentEnabled) {
      window.__addWizardResumeChecked = true;
      if (currentStep !== 3) router.replace(addEnrollmentStepPath(school, parentId, sessionUserId, 3));
      return;
    }
    if (window.__addWizardResumeChecked) return;
    window.__addWizardResumeChecked = true;

    const signupPage = Number(context?.signupPage);
    if (signupPage >= 1 && signupPage <= 3) {
      const target = resolveResumeStep(currentStep, signupPage);
      if (target !== currentStep) router.replace(addEnrollmentStepPath(school, parentId, sessionUserId, target));
    }
  }, [ready, childUniqueId, currentStep, context?.customPaymentEnabled, context?.signupPage, router, school, parentId, sessionUserId]);

  return { redirecting: redirecting.current === true };
}
