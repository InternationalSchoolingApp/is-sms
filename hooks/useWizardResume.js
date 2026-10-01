"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSignupStageStatusAction } from "@/actions/studentSignupActions";
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
 * tab) asks enrollment-stage-status — its `wizardStep` is that same marker —
 * and moves to that step if it differs. A finished enrollment answers with a
 * `redirectUri` (dashboard / custom plan), which is followed the same way
 * getSignupStatusFinal() does.
 *
 * Moving Back/Continue inside the app never reloads the document, so only
 * the first hook run per document load asks. If the call fails the page just
 * stays where it is.
 */
export function useWizardResume({ currentStep, context, uniqueId, ready }) {
  const router = useRouter();
  const { school, program } = useParams();

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

    // Deliberately no cancel-on-cleanup: React Strict Mode (dev) runs this effect twice,
    // and the once-per-document flag above makes the second run a no-op — cancelling in
    // the first run's cleanup would throw away the only response we ever act on.
    getSignupStageStatusAction(context.schoolUUID, uniqueId)
      .then((response) => {
        if (!response) return;
        if (response.status === "1" && response.redirectUri) {
          // Defensive: the backend has been observed sending a redirectUri that
          // points at THIS app's own wizard step route with an extra uniqueId
          // path segment appended (e.g. ".../step/student-details/{uuid}") —
          // none of these routes accept one (schoolUUID/userId come from the
          // session, not the URL), so following it verbatim 404s. Anything
          // that isn't a same-origin, unrecognized step path (the legacy
          // app's own dashboard URL on a different port, or an /api/sso
          // handoff URL) is still followed exactly as before; only this one
          // malformed shape gets normalized via the response's own wizardStep.
          let redirectTarget = response.redirectUri;
          try {
            const url = new URL(response.redirectUri, window.location.origin);
            const knownStepRoutes = [1, 2, 3, 4].map((s) => stepPath(school, program, s));
            const sameOriginStepUrl = url.origin === window.location.origin && url.pathname.includes("/step/");
            const knownStepRoute = knownStepRoutes.includes(url.pathname);
            if (sameOriginStepUrl && !knownStepRoute) {
              const ws = response.wizardStep >= 1 && response.wizardStep <= 4 ? response.wizardStep : currentStep;
              router.replace(stepPath(school, program, ws));
              return;
            }
          } catch {
            // Relative/malformed URL string — fall through and follow it as-is.
          }
          window.location.replace(redirectTarget);
          return;
        }
        const target = resolveResumeStep(currentStep, response.wizardStep);
        if (target !== currentStep) router.replace(stepPath(school, program, target));
      })
      .catch((err) => console.error("Wizard resume check failed:", err));
  }, [ready, uniqueId, currentStep, context?.schoolUUID, context?.customPaymentEnabled, context?.signupPage, router, school, program]);
}
