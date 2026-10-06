"use client";

import { FullScreenLoader } from "@/components/common/Loader";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { expireSession } from "@/utils/logout";
import { Stage3CourseSelection } from "@/components/student-enroll/Stage3CourseSelection";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { useWizardResume } from "@/hooks/useWizardResume";
import { loadWizardStudentFields } from "@/utils/wizardStorage";
import { stepPath } from "@/utils/wizardSteps";

export function CourseSelectionStep() {
  const router = useRouter();
  const { school, program } = useParams();
  const { session, context, ready } = useEnrollmentContext();
  const { redirecting } = useWizardResume({ currentStep: 3, context, uniqueId: session?.uniqueId, ready });
  const [standardId, setStandardId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setStandardId(loadWizardStudentFields(context.schoolUUID, session.userId)?.standardId || null);
    setHydrated(true);
  }, [ready, context?.schoolUUID, session?.userId]);

  if (!ready || redirecting || context.customPaymentEnabled || !hydrated) {
    return <FullScreenLoader />;
  }

  return (
    <Stage3CourseSelection
      context={context}
      userId={session.userId}
      standardId={standardId}
      onNext={() => router.push(stepPath(school, program, 4))}
      onBack={() => router.push(stepPath(school, program, 2))}
      onSessionExpired={() => expireSession(school)}
    />
  );
}
