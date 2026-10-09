"use client";

import { FullScreenLoader } from "@/components/common/Loader";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AddStage1StudentDetails } from "@/components/add-enrollment/AddStage1StudentDetails";
import { useAddEnrollmentContext } from "@/hooks/add-enrollment/useAddEnrollmentContext";
import { useAddWizardResume } from "@/hooks/add-enrollment/useAddWizardResume";
import { useAddStudentDetailsPrefill } from "@/hooks/add-enrollment/useAddStage1";
import { saveAddEnrollmentStudentFields, loadAddEnrollmentStudentFields } from "@/utils/addEnrollmentStorage";
import { addEnrollmentStepPath } from "@/utils/addEnrollmentSteps";

/**
 * Step 1 ("Student profile") of the Add Another Student wizard. Mirrors
 * app/[school]/enrollment/[program]/step/student-details/StudentDetailsStep.jsx,
 * but prefill/save use the CHILD's identity (childUserId/childUniqueId from
 * enrollAnotherChild's response) instead of the logged-in session's own
 * userId/uniqueId — the caller (parent or sibling student) is never the
 * student being enrolled here.
 */
export function AddStudentDetailsStep() {
  const router = useRouter();
  const { school, parentId, sessionUserId } = useParams();
  const { context, ready, childUserId, childUniqueId } = useAddEnrollmentContext();
  const { redirecting } = useAddWizardResume({ currentStep: 1, context, childUniqueId, ready });
  const prefill = useAddStudentDetailsPrefill({ context, userId: childUserId });
  const queryClient = useQueryClient();
  const [initialFields, setInitialFields] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready || prefill.isPending) return;
    const saved = loadAddEnrollmentStudentFields(context.schoolUUID, childUserId);
    setInitialFields(prefill.data || saved || null);
    setHydrated(true);
  }, [ready, prefill.isPending, prefill.data, context?.schoolUUID, childUserId]);

  if (!ready || redirecting || !hydrated) {
    return <FullScreenLoader />;
  }

  return (
    <AddStage1StudentDetails
      context={context}
      userId={childUserId}
      uniqueId={childUniqueId}
      initialFields={initialFields}
      onNext={(fields) => {
        saveAddEnrollmentStudentFields(context.schoolUUID, childUserId, fields);
        queryClient.setQueryData(["add-enrollment-student-details-prefill", childUserId], (old) => ({ ...(old || {}), ...fields }));
        router.push(addEnrollmentStepPath(school, parentId, sessionUserId, 2));
      }}
    />
  );
}
