"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FullScreenLoader } from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { TeacherVerification } from "@/components/teacher-registration/TeacherVerification";
import { TeacherVerificationUnderReview } from "@/components/teacher-registration/TeacherLockScreens";
import {
  TEACHER_PROCESS_QUERY_KEY,
  TEACHER_STATE_LOCKED,
  useTeacherRegistrationContext,
} from "@/hooks/useTeacherRegistrationContext";
import { useTeacherWizardResume } from "@/hooks/useTeacherWizardResume";
import { useTeacherBasicDetailsPrefill } from "@/hooks/useTeacherSignup";
import { useSubmitTeacherVerification, useTeacherVerificationPrefill } from "@/hooks/useTeacherVerification";
import { useTeacherStatusPoll } from "@/hooks/useTeacherReview";
import { teacherStepPath } from "@/utils/teacherRegistrationSteps";
import { teacherFullName } from "@/utils/teacherReview";
import { expireSession, logoutEverywhere } from "@/utils/logout";

const STEP = 5;
const LOCK_VERIFICATION = "VERIFICATION";

// Submitted: the legacy "Documents Under Verification" screen. It asks again every 30 s and the teacher moves on by
// themselves when the school sends them to the bank details (the step below sees the new stage).
function VerificationLock({ context, session }) {
  const personal = useTeacherBasicDetailsPrefill({ context, userId: session?.userId });
  const { check, checking } = useTeacherStatusPoll({ enabled: true });
  return (
    <TeacherVerificationUnderReview
      fullName={teacherFullName(personal.data)}
      schoolName={context.schoolName}
      onCheck={check}
      checking={checking}
      onLogout={() => logoutEverywhere(session)}
    />
  );
}

// The form. Resolved first (the form and its phone fields read their initial values at mount only).
function VerificationContent({ context, session, school, onSubmitted }) {
  const queryClient = useQueryClient();
  const userId = session?.userId;
  const prefill = useTeacherVerificationPrefill({ context, userId });
  const personal = useTeacherBasicDetailsPrefill({ context, userId });
  const submit = useSubmitTeacherVerification({ context, userId });
  // Fixed the first time the saved record has resolved (set while rendering, guarded by the null check, not in an effect).
  const [initial, setInitial] = useState(null);
  if (prefill.isSuccess && !personal.isPending && initial === null) {
    setInitial(prefill.data);
  }

  if (prefill.isError) {
    return (
      <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-600">We couldn&apos;t load your verification details.</p>
        <Button type="button" className="mt-4 cursor-pointer" onClick={() => prefill.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (initial === null) return <FullScreenLoader />;

  async function handleSubmit(fields) {
    const result = await submit.mutateAsync(fields);
    if (result.ok) {
      toast.success("Verification submitted successfully");
      queryClient.invalidateQueries({ queryKey: [TEACHER_PROCESS_QUERY_KEY] });
      onSubmitted();
      return true;
    }
    if (result.sessionOut) {
      expireSession(context.schoolUUID);
      return false;
    }
    toast.error(result.message);
    // It may already have been submitted (another tab) or reopened: ask where the teacher belongs now.
    queryClient.invalidateQueries({ queryKey: [TEACHER_PROCESS_QUERY_KEY] });
    return false;
  }

  return (
    <TeacherVerification
      context={context}
      school={school}
      initial={initial}
      fullName={teacherFullName(personal.data)}
      teacherEmail={personal.data?.communicationEmail || session?.email || ""}
      onSubmit={handleSubmit}
      onSessionOut={() => expireSession(context.schoolUUID)}
    />
  );
}

/**
 * Step 5 ("Verification") content, rendered inside the shared wizard shell: the verification form and, once it is
 * submitted (stage 21), the "Documents Under Verification" screen, which stays until the school moves the teacher on.
 */
export function TeacherVerificationStep() {
  const router = useRouter();
  const { school } = useParams();
  const { session, context, ready } = useTeacherRegistrationContext();
  const { redirecting } = useTeacherWizardResume({ currentStep: STEP, context, ready });
  // Set the moment the submit succeeds, so the lock screen shows without waiting for the stage to be read again.
  const [submitted, setSubmitted] = useState(false);

  // The backend places the teacher somewhere else (sent on to the bank details by the school, or put back): go there.
  const elsewhere = ready && context.wizardStep && context.wizardStep !== STEP ? context.wizardStep : null;
  useEffect(() => {
    if (elsewhere !== null) router.replace(teacherStepPath(school, elsewhere));
  }, [elsewhere, router, school]);

  if (!ready || redirecting || elsewhere !== null) return <FullScreenLoader />;

  if ((context.state === TEACHER_STATE_LOCKED && context.lockReason === LOCK_VERIFICATION) || submitted) {
    return <VerificationLock context={context} session={session} />;
  }
  return <VerificationContent context={context} session={session} school={school} onSubmitted={() => setSubmitted(true)} />;
}
