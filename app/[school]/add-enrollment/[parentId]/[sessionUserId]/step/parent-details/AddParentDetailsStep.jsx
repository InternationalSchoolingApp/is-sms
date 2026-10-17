"use client";

import { FullScreenLoader } from "@/components/common/Loader";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AddParentDetails } from "@/components/add-enrollment/AddParentDetails";
import { useAddEnrollmentContext } from "@/hooks/add-enrollment/useAddEnrollmentContext";
import { useParentDetailsPrefill } from "@/hooks/useParentDetailsSignup";
import { loadWizardParentFields, saveWizardParentFields } from "@/utils/wizardStorage";
import { addEnrollmentStepPath } from "@/utils/addEnrollmentSteps";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";

/**
 * "Academic & Communication Details" step of the Add Another Student wizard — only for the One-to-One Flex
 * program (other programs go straight from student-details to course-selection). Mirrors
 * app/[school]/enrollment/[program]/step/parent-details/ParentDetailsStep.jsx, but prefill/save use the
 * CHILD's userId. A non-Flex child opening this URL is sent back to course-selection.
 */
export function AddParentDetailsStep() {
  const router = useRouter();
  const { school, parentId, sessionUserId } = useParams();
  const { context, ready, childUserId } = useAddEnrollmentContext();
  const parentPrefill = useParentDetailsPrefill({ context, userId: childUserId });
  const [parentFields, setParentFields] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const isFlex = ready && getLearningProgramBackendValue(context.learningProgram) === "ONE_TO_ONE_FLEX";

  useEffect(() => {
    if (ready && !isFlex) router.replace(addEnrollmentStepPath(school, parentId, sessionUserId, 2));
  }, [ready, isFlex, router, school, parentId, sessionUserId]);

  useEffect(() => {
    if (!ready || parentPrefill.isPending) return;
    setParentFields(parentPrefill.data || loadWizardParentFields(context.schoolUUID, childUserId));
    setHydrated(true);
  }, [ready, parentPrefill.isPending, parentPrefill.data, context?.schoolUUID, childUserId]);

  if (!ready || !isFlex || context.customPaymentEnabled || !hydrated) {
    return <FullScreenLoader />;
  }

  return (
    <AddParentDetails
      context={context}
      userId={childUserId}
      studentAddress={{}}
      initialFields={parentFields}
      onNext={(fields) => {
        saveWizardParentFields(context.schoolUUID, childUserId, fields);
        router.push(addEnrollmentStepPath(school, parentId, sessionUserId, 2));
      }}
      onBack={() => router.push(addEnrollmentStepPath(school, parentId, sessionUserId, 1))}
    />
  );
}
