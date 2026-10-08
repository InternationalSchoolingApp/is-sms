"use client";

import { FullScreenLoader } from "@/components/common/Loader";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Stage1StudentDetails } from "@/components/student-enroll/Stage1StudentDetails";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { useWizardResume } from "@/hooks/useWizardResume";
import { useStudentDetailsPrefill } from "@/hooks/useStudentDetailsSignup";
import { saveWizardStudentFields, loadWizardStudentFields } from "@/utils/wizardStorage";
import { stepPath } from "@/utils/wizardSteps";

/**
 * Stage 1 ("Student profile") step content. Rendered inside the shared
 * EnrollmentWizardShell mounted by the step-group layout — this component
 * only owns Stage 1's own data (prefill) and navigation.
 *
 * schoolUUID comes from the Auth.js session (see hooks/useEnrollmentContext.js
 * / auth.js), not the URL; the {school}/{program} segments are used only to
 * build the next step's path.
 *
 * Prefill priority, resolved before the form ever mounts (see the
 * !hydrated gate below — Stage1StudentDetails only reads initialFields at
 * mount, not on later prop changes):
 *   1. Backend (get-student-details) — the real saved record, so a student
 *      resuming from a fresh SSO handoff sees what they already entered.
 *   2. This tab's sessionStorage — covers the backend call failing, or a
 *      first-ever visit where nothing's saved server-side yet either.
 *   3. Just the signed-up email (session.email, from auth.js), as a last
 *      resort so that one field isn't blank.
 */
export function StudentDetailsStep() {
  const router = useRouter();
  const { school, program } = useParams();
  const { session, context, ready } = useEnrollmentContext();
  const { redirecting } = useWizardResume({ currentStep: 1, context, uniqueId: session?.uniqueId, ready });
  const prefill = useStudentDetailsPrefill({ context, userId: session?.userId });
  const queryClient = useQueryClient();
  const [initialFields, setInitialFields] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready || prefill.isPending) return;
    const saved = loadWizardStudentFields(context.schoolUUID, session.userId);
    setInitialFields(prefill.data || saved || (session.email ? { communicationEmail: session.email } : null));
    setHydrated(true);
  }, [ready, prefill.isPending, prefill.data, context?.schoolUUID, session?.userId, session?.email]);

  if (!ready || redirecting || context.customPaymentEnabled || !hydrated) {
    return <FullScreenLoader />;
  }

  return (
    <Stage1StudentDetails
      context={context}
      userId={session.userId}
      initialFields={initialFields}
      onNext={(fields) => {
        saveWizardStudentFields(context.schoolUUID, session.userId, fields);
        // Stage 1 just saved these server-side; keep the shared prefill cache in step so Back
        // from Stage 2 doesn't show the pre-save values now that the query isn't always refetched.
        queryClient.setQueryData(["student-details-prefill", session.userId], (old) => ({ ...(old || {}), ...fields }));
        router.push(stepPath(school, program, 2));
      }}
    />
  );
}
