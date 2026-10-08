"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { addEnrollmentStepPath } from "@/utils/addEnrollmentSteps";

/**
 * 3-step counterpart of hooks/useWizardResume.js for the "Add Another
 * Student" wizard. Same resolveResumeStep behavior, just clamped to steps
 * 1-3 (no review-only step 4 here — review-and-payment IS step 3, and does
 * have its own details, so there's no "no details of its own" special case
 * to carry over).
 */
function resolveResumeStep(currentStep, marker) {
  if (!(marker >= 1 && marker <= 3) || marker === currentStep) return currentStep;
  return marker;
}

export function useAddWizardResume({ currentStep, context, childUniqueId, ready }) {
  const router = useRouter();
  const { school, parentId, sessionUserId } = useParams();

  const redirecting = useRef(null);
  if (redirecting.current === null && ready && childUniqueId && typeof window !== "undefined") {
    let block = false;
    if (!window.__addWizardResumeChecked) {
      const signupPage = Number(context?.signupPage);
      block = signupPage >= 1 && signupPage <= 3 && resolveResumeStep(currentStep, signupPage) !== currentStep;
    }
    redirecting.current = block;
  }

  useEffect(() => {
    if (!ready || !childUniqueId || typeof window === "undefined") return;
    if (window.__addWizardResumeChecked) return;
    window.__addWizardResumeChecked = true;

    const signupPage = Number(context?.signupPage);
    if (signupPage >= 1 && signupPage <= 3) {
      const target = resolveResumeStep(currentStep, signupPage);
      if (target !== currentStep) router.replace(addEnrollmentStepPath(school, parentId, sessionUserId, target));
    }
  }, [ready, childUniqueId, currentStep, context?.signupPage, router, school, parentId, sessionUserId]);

  return { redirecting: redirecting.current === true };
}
