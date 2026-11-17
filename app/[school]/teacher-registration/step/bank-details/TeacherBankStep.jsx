"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FullScreenLoader } from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { TeacherBank } from "@/components/teacher-registration/TeacherBank";
import { TeacherRegistrationComplete } from "@/components/teacher-registration/TeacherLockScreens";
import { useTeacherRegistrationContext } from "@/hooks/useTeacherRegistrationContext";
import { useTeacherWizardResume } from "@/hooks/useTeacherWizardResume";
import { useSaveTeacherBank, useTeacherBankPrefill, useTeacherDashboardLink } from "@/hooks/useTeacherBank";
import { teacherStepPath } from "@/utils/teacherRegistrationSteps";
import { expireSession, logoutEverywhere } from "@/utils/logout";

const STEP = 6;

// The registration is complete: fetch the one-time dashboard link and follow it (the legacy "Redirecting to Dashboard").
// The Java dashboard needs the browser's Java login, which the link gives. No link: log in to continue.
function BankFinish({ context, session }) {
  const link = useTeacherDashboardLink({ context });
  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);
  const requestLink = link.mutateAsync;

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    requestLink()
      .then((result) => {
        if (result.ok) window.location.assign(result.url);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, [requestLink]);

  return <TeacherRegistrationComplete failed={failed} onGoToLogin={() => logoutEverywhere(session)} />;
}

// The form, resolved first (it reads its initial values at mount only).
function BankContent({ context, session, onCompleted }) {
  const prefill = useTeacherBankPrefill({ context });
  const save = useSaveTeacherBank({ context, userId: session?.userId });
  // Fixed the first time the saved record has resolved (set while rendering, guarded by the null check, not in an effect).
  const [initial, setInitial] = useState(null);
  if (prefill.isSuccess && initial === null) setInitial(prefill.data);

  if (prefill.isError) {
    return (
      <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-600">We couldn&apos;t load your bank details.</p>
        <Button type="button" className="mt-4 cursor-pointer" onClick={() => prefill.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (initial === null) return <FullScreenLoader />;

  async function handleSubmit(fields) {
    const result = await save.mutateAsync(fields);
    if (result.ok) {
      onCompleted();
      return true;
    }
    if (result.sessionOut) {
      expireSession(context.schoolUUID);
      return false;
    }
    toast.error(result.message);
    return false;
  }

  return <TeacherBank context={context} initial={initial} onSubmit={handleSubmit} />;
}

/**
 * Step 6 ("Bank details") content, rendered inside the shared wizard shell: the bank form and, once it is saved (which
 * completes the registration), the hand-off to the Java teacher dashboard. The wizard's stage is deliberately NOT read
 * again after the save: a registered teacher's stage answers "go to the login page", which would pre-empt the hand-off.
 */
export function TeacherBankStep() {
  const router = useRouter();
  const { school } = useParams();
  const { session, context, ready } = useTeacherRegistrationContext();
  const { redirecting } = useTeacherWizardResume({ currentStep: STEP, context, ready });
  const [completed, setCompleted] = useState(false);

  // The backend places the teacher somewhere else (not sent to the bank step yet, or put back): go there.
  const elsewhere = ready && !completed && context.wizardStep && context.wizardStep !== STEP ? context.wizardStep : null;
  useEffect(() => {
    if (elsewhere !== null) router.replace(teacherStepPath(school, elsewhere));
  }, [elsewhere, router, school]);

  if (!ready || redirecting || elsewhere !== null) return <FullScreenLoader />;
  if (completed) return <BankFinish context={context} session={session} />;
  return <BankContent context={context} session={session} onCompleted={() => setCompleted(true)} />;
}
