"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FullScreenLoader } from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { TeacherContract } from "@/components/teacher-registration/TeacherContract";
import { TeacherContractExpired, TeacherContractNotReady } from "@/components/teacher-registration/TeacherLockScreens";
import {
  TEACHER_PROCESS_QUERY_KEY,
  TEACHER_STATE_FORM,
  useTeacherRegistrationContext,
} from "@/hooks/useTeacherRegistrationContext";
import { useTeacherWizardResume } from "@/hooks/useTeacherWizardResume";
import { useTeacherBasicDetailsPrefill } from "@/hooks/useTeacherSignup";
import { useAcceptTeacherContract, useTeacherContractDetails } from "@/hooks/useTeacherContract";
import { CONTRACT_STATE } from "@/utils/teacherContract";
import { teacherStepPath } from "@/utils/teacherRegistrationSteps";
import { teacherFullName } from "@/utils/teacherReview";
import { expireSession, logoutEverywhere } from "@/utils/logout";

const STEP = 4;

/**
 * Step 4 ("Contract") content, rendered inside the shared wizard shell. What the teacher sees is the backend's call:
 * the contract to read and sign (READY), "being prepared" while the school has not published one (NOT_READY), or
 * "expired" (EXPIRED, which the school can reissue). The two waiting screens look again every 30 s and have a Check
 * status. Accepting moves the teacher on to Verification.
 */
export function TeacherContractStep() {
  const router = useRouter();
  const { school } = useParams();
  const queryClient = useQueryClient();
  const { session, context, ready, logoUrl } = useTeacherRegistrationContext();
  const { redirecting } = useTeacherWizardResume({ currentStep: STEP, context, ready });
  const userId = session?.userId;
  const details = useTeacherContractDetails({ context: ready ? context : null, userId });
  const personal = useTeacherBasicDetailsPrefill({ context: ready ? context : null, userId });
  const accept = useAcceptTeacherContract({ context });

  // The backend now places the teacher somewhere else (accepted, so on to Verification; or put back by the school): go there.
  const elsewhere = ready && context.state === TEACHER_STATE_FORM && context.wizardStep && context.wizardStep !== STEP ? context.wizardStep : null;
  useEffect(() => {
    if (elsewhere !== null) router.replace(teacherStepPath(school, elsewhere));
  }, [elsewhere, router, school]);

  if (!ready || redirecting || elsewhere !== null) return <FullScreenLoader />;

  if (details.isError) {
    return (
      <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-600">We couldn&apos;t load your contract.</p>
        <Button type="button" className="mt-4 cursor-pointer" onClick={() => details.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!details.data) return <FullScreenLoader />;

  const { state, contract } = details.data;
  const waitingProps = {
    fullName: contract?.fullName || teacherFullName(personal.data),
    schoolName: context.schoolName,
    onCheck: () => details.refetch(),
    checking: details.isFetching,
    onLogout: () => logoutEverywhere(session),
  };

  if (state === CONTRACT_STATE.EXPIRED) return <TeacherContractExpired {...waitingProps} />;
  if (state !== CONTRACT_STATE.READY || !contract) return <TeacherContractNotReady {...waitingProps} />;

  async function handleAccept({ agreementLogId, signatureImage }) {
    const result = await accept.mutateAsync({ agreementLogId, signatureImage });
    if (result.ok) {
      toast.success("Contract accepted successfully");
      // Ask where the teacher belongs now (Verification): the effect above moves them on once it answers.
      await queryClient.invalidateQueries({ queryKey: [TEACHER_PROCESS_QUERY_KEY] });
      return true;
    }
    if (result.sessionOut) {
      expireSession(context.schoolUUID);
      return false;
    }
    toast.error(result.message);
    // It may have been accepted elsewhere, expired or reissued meanwhile: look again.
    details.refetch();
    return false;
  }

  return <TeacherContract contract={contract} logoUrl={logoUrl} onAccept={handleAccept} />;
}
