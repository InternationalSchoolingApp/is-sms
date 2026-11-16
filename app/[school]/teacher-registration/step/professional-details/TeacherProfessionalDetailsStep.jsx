"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FullScreenLoader } from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { TeacherProfessionalDetails } from "@/components/teacher-registration/TeacherProfessionalDetails";
import { useTeacherRegistrationContext } from "@/hooks/useTeacherRegistrationContext";
import { useTeacherWizardResume } from "@/hooks/useTeacherWizardResume";
import { useTeacherProfessionalPrefill } from "@/hooks/useTeacherProfessionalDetails";
import { teacherStepPath } from "@/utils/teacherRegistrationSteps";
import { expireSession } from "@/utils/logout";

/**
 * Step 2 ("Professional details") content, rendered inside the shared wizard shell mounted by the step layout. Owns
 * this step's own data (the saved record and the course lists, resolved BEFORE the form mounts: the form reads its
 * initial values at mount only) and the moves to step 1 (Back) and step 3 (after a save that completes the step).
 *
 * The form only saves with a demo (a chosen live recording, or the saved demo link of a "link mode" teacher), so a
 * successful save always moves on to step 3.
 */
export function TeacherProfessionalDetailsStep() {
  const router = useRouter();
  const { school } = useParams();
  const queryClient = useQueryClient();
  const { session, context, ready } = useTeacherRegistrationContext();
  const { redirecting } = useTeacherWizardResume({ currentStep: 2, context, ready });
  const prefill = useTeacherProfessionalPrefill({ context, userId: session?.userId });
  // Fixed the first time the saved record has resolved (set while rendering, guarded by the null check, not in an effect).
  const [initial, setInitial] = useState(null);
  if (ready && !redirecting && prefill.isSuccess && initial === null) {
    setInitial(prefill.data);
  }

  if (ready && !redirecting && prefill.isError) {
    return (
      <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-600">We couldn&apos;t load your professional details.</p>
        <Button type="button" className="mt-4 cursor-pointer" onClick={() => prefill.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!ready || redirecting || initial === null) {
    return <FullScreenLoader />;
  }

  return (
    <TeacherProfessionalDetails
      context={context}
      school={school}
      userId={session.userId}
      initial={initial}
      onSessionOut={() => expireSession(context.schoolUUID)}
      onBack={() => router.push(teacherStepPath(school, 1))}
      onNext={() => {
        // The save moved the teacher on (stage 12): re-read where they belong, then go to the demo review.
        queryClient.invalidateQueries({ queryKey: ["teacher-registration-process"] });
        router.push(teacherStepPath(school, 3));
      }}
    />
  );
}
