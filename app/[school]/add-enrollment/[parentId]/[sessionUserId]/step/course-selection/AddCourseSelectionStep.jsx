"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { AddStage2CourseSelection } from "@/components/add-enrollment/AddStage2CourseSelection";
import { useAddEnrollmentContext } from "@/hooks/add-enrollment/useAddEnrollmentContext";
import { useAddWizardResume } from "@/hooks/add-enrollment/useAddWizardResume";
import { loadAddEnrollmentStudentFields } from "@/utils/addEnrollmentStorage";
import { addEnrollmentStepPath } from "@/utils/addEnrollmentSteps";
import { expireSession } from "@/utils/logout";

/**
 * Step 2 ("Course selection") of the Add Another Student wizard. Mirrors
 * app/[school]/enrollment/[program]/step/course-selection/CourseSelectionStep.jsx,
 * but prefill/save use the CHILD's identity (childUserId from
 * enrollAnotherChild's response) and the Add-wizard's own context/resume
 * hooks instead of the main-flow equivalents.
 */
export function AddCourseSelectionStep() {
  const router = useRouter();
  const { school, parentId, sessionUserId } = useParams();
  const { context, ready, childUserId, childUniqueId } = useAddEnrollmentContext();
  const { redirecting } = useAddWizardResume({ currentStep: 2, context, childUniqueId, ready });
  const [standardId, setStandardId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setStandardId(loadAddEnrollmentStudentFields(context.schoolUUID, childUserId)?.standardId || null);
    setHydrated(true);
  }, [ready, context?.schoolUUID, childUserId]);

  if (!ready || redirecting || context.customPaymentEnabled || !hydrated) {
    return <FullScreenLoader />;
  }

  return (
    <AddStage2CourseSelection
      context={context}
      userId={childUserId}
      uniqueId={childUniqueId}
      standardId={standardId}
      onNext={() => router.push(addEnrollmentStepPath(school, parentId, sessionUserId, 3))}
      onBack={() => router.push(addEnrollmentStepPath(school, parentId, sessionUserId, 1))}
      onSessionExpired={() => expireSession(school)}
    />
  );
}
