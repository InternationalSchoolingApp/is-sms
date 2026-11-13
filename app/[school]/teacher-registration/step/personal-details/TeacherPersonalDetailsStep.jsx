"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FullScreenLoader } from "@/components/common/Loader";
import { TeacherPersonalDetails } from "@/components/teacher-registration/TeacherPersonalDetails";
import { useTeacherRegistrationContext } from "@/hooks/useTeacherRegistrationContext";
import { useTeacherWizardResume } from "@/hooks/useTeacherWizardResume";
import { useTeacherBasicDetailsPrefill } from "@/hooks/useTeacherSignup";
import { teacherStepPath } from "@/utils/teacherRegistrationSteps";

/**
 * Step 1 ("Personal details") content, rendered inside the shared wizard shell mounted by the step layout. Owns this
 * step's own data (the saved record, resolved BEFORE the form mounts: the form and its phone widget only read their
 * initial values at mount) and the move on to step 2.
 *
 * Prefill priority: the backend's saved record (get-teacher-basic-details), then just the signed-up e-mail so that
 * one field is not blank.
 */
export function TeacherPersonalDetailsStep() {
  const router = useRouter();
  const { school } = useParams();
  const queryClient = useQueryClient();
  const { session, context, ready } = useTeacherRegistrationContext();
  const { redirecting } = useTeacherWizardResume({ currentStep: 1, context, ready });
  const prefill = useTeacherBasicDetailsPrefill({ context, userId: session?.userId });
  // Fixed the first time the saved record has resolved: the form reads it at mount only, so a later refetch must
  // not replace it. (Set while rendering, guarded by the null check, not in an effect.)
  const [initialFields, setInitialFields] = useState(null);
  if (ready && !redirecting && !prefill.isPending && initialFields === null) {
    const saved = prefill.data;
    setInitialFields({
      ...(saved || {}),
      // The account's e-mail is the read-only one; the saved record carries it too, but a fresh teacher's may be blank.
      communicationEmail: saved?.communicationEmail || session?.email || "",
    });
  }

  if (!ready || redirecting || initialFields === null) {
    return <FullScreenLoader />;
  }

  return (
    <TeacherPersonalDetails
      context={context}
      userId={session.userId}
      initialFields={initialFields}
      onNext={(fields) => {
        // Saved server-side: keep the prefill cache in step so Back from step 2 shows what was just saved, and
        // re-read where the teacher belongs now (the backend has moved them on to the next step).
        queryClient.setQueryData(["teacher-basic-details", session.userId], (old) => ({ ...(old || {}), ...fields }));
        queryClient.invalidateQueries({ queryKey: ["teacher-registration-process"] });
        router.push(teacherStepPath(school, 2));
      }}
    />
  );
}
