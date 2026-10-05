"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { stepPath } from "@/utils/wizardSteps";

/**
 * `marker` is the backend's nextSessionStage (1-4). Step 4 (review) has no
 * details of its own to save, so a load of a step BEHIND the marker resumes at
 * the last step that holds saved details (3 when the marker is 4) rather than
 * dropping the student on the review page. Loading the marker's own step
 * (e.g. refreshing the review page itself) stays put; loading a step AHEAD of
 * the marker is pulled back to it.
 */
function resolveResumeStep(currentStep, marker) {
  if (!(marker >= 1 && marker <= 4) || marker === currentStep) return currentStep;
  return currentStep < marker ? Math.min(marker, 3) : marker;
}

/**
 * Stage resume for the flat /step/N routes, driven by the backend exactly
 * like the legacy resume page ({schoolId}/student/enrollment/process/{UUID}),
 * which reads StudentStandard.nextSessionStage on every load and renders that
 * step (`signupPage`). Here, a full page load (refresh, typed URL, reopened
 * tab) reads `signupPage` from student/enrollment/process (already loaded into
 * the context) and moves to that step if it differs. enrollment-stage-status is
 * NOT called here; only the review step's 3-minute poll uses it.
 *
 * Moving Back/Continue inside the app never reloads the document, so only
 * the first hook run per document load asks. Without a signupPage the page just
 * stays where it is.
 */
export function useWizardResume({ currentStep, context, uniqueId, ready }) {
  const router = useRouter();
  const { school, program } = useParams();

  // Decided synchronously on the first ready render (before any effect), so the step can show
  // a loader instead of flashing its own content and then moving. Latched until this step
  // unmounts after the redirect.
  const redirecting = useRef(null);
  if (redirecting.current === null && ready && uniqueId && typeof window !== "undefined") {
    let block = false;
    if (context?.customPaymentEnabled) {
      block = currentStep !== 4;
    } else if (!window.__wizardResumeChecked) {
      const signupPage = Number(context?.signupPage);
      block = signupPage >= 1 && signupPage <= 4 && resolveResumeStep(currentStep, signupPage) !== currentStep;
    }
    redirecting.current = block;
  }

  useEffect(() => {
    if (!ready || !uniqueId || typeof window === "undefined") return;
    if (context?.customPaymentEnabled) {
      window.__wizardResumeChecked = true;
      if (currentStep !== 4) router.replace(stepPath(school, program, 4));
      return;
    }
    if (window.__wizardResumeChecked) return;
    window.__wizardResumeChecked = true;

    const signupPage = Number(context?.signupPage);
    if (signupPage >= 1 && signupPage <= 4) {
      const target = resolveResumeStep(currentStep, signupPage);
      if (target !== currentStep) router.replace(stepPath(school, program, target));
      return;
    }

    // No signupPage (enrollment/process failed or returned none): stay on this step.
  }, [ready, uniqueId, currentStep, context?.customPaymentEnabled, context?.signupPage, router, school, program]);

  return { redirecting: redirecting.current === true };
}
