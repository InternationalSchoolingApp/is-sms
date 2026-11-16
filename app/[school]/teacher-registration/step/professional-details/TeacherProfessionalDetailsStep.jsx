"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
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
 * A save completes the step only when the teacher also has a demo; until the live recorder exists that is the "link
 * mode" teacher (a demo link already saved). Anyone else is told the details are saved and stays here.
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
      onNext={({ linkMode }) => {
        // The backend may have moved the teacher on (stage 12): re-read where they belong.
        queryClient.invalidateQueries({ queryKey: ["teacher-registration-process"] });
        if (linkMode) {
          router.push(teacherStepPath(school, 3));
        } else {
          toast.success("Your professional details are saved.");
        }
      }}
    />
  );
}
