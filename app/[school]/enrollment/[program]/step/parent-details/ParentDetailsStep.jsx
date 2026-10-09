"use client";

import { FullScreenLoader } from "@/components/common/Loader";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Stage2ParentDetails } from "@/components/student-enroll/Stage2ParentDetails";
import { useEnrollmentContext } from "@/hooks/useEnrollmentContext";
import { useWizardResume } from "@/hooks/useWizardResume";
import { useParentDetailsPrefill } from "@/hooks/useParentDetailsSignup";
import { useStudentDetailsPrefill } from "@/hooks/useStudentDetailsSignup";
import { loadWizardStudentFields, loadWizardParentFields, saveWizardParentFields } from "@/utils/wizardStorage";
import { stepPath } from "@/utils/wizardSteps";

/**
 * Stage 2 ("Parent information") step content, rendered inside the shared
 * EnrollmentWizardShell from the step-group layout. The form is prefilled from
 * get-parent-details (same idea as Step 1's get-student-details), falling back to what this tab
 * last saved in sessionStorage — see utils/wizardStorage.js. `studentAddress` (for the "same as
 * student" default) comes from sessionStorage too, else the cached student prefill, since
 * Stage 1's live component state doesn't exist once you've left /step/1.
 */
export function ParentDetailsStep() {
  const router = useRouter();
  const { school, program } = useParams();
  const { session, context, ready } = useEnrollmentContext();
  const { redirecting } = useWizardResume({ currentStep: 2, context, uniqueId: session?.uniqueId, ready });
  const parentPrefill = useParentDetailsPrefill({ context, userId: session?.userId });
  // Same query the enrollment context already runs, so this is normally already cached.
  const studentPrefill = useStudentDetailsPrefill({ context: { schoolUUID: session?.schoolUUID }, userId: session?.userId });
  const [studentFields, setStudentFields] = useState(null);
  const [parentFields, setParentFields] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready || parentPrefill.isPending || studentPrefill.isPending) return;
    const student = loadWizardStudentFields(context.schoolUUID, session.userId) || studentPrefill.data;
    const saved = loadWizardParentFields(context.schoolUUID, session.userId);
    const fromServer = parentPrefill.data;
    // A parent whose saved location is the student's own keeps "same as student" on (fields locked).
    const sameAsStudent =
      Boolean(fromServer && student?.countryId) &&
      fromServer.countryId === student.countryId &&
      fromServer.stateId === student.stateId &&
      fromServer.cityId === student.cityId;
    setStudentFields(student);
    setParentFields(fromServer ? { ...fromServer, sameAsStudent } : saved);
    setHydrated(true);
  }, [ready, parentPrefill.isPending, parentPrefill.data, studentPrefill.isPending, studentPrefill.data, context?.schoolUUID, session?.userId]);

  if (!ready || redirecting || context.customPaymentEnabled || !hydrated) {
    return <FullScreenLoader />;
  }

  return (
    <Stage2ParentDetails
      context={context}
      userId={session.userId}
      studentAddress={{
        countryId: studentFields?.countryId,
        stateId: studentFields?.stateId,
        cityId: studentFields?.cityId,
      }}
      courseProviderId={studentFields?.courseProviderId}
      initialFields={parentFields}
      onNext={(fields) => {
        saveWizardParentFields(context.schoolUUID, session.userId, fields);
        // console.log("Stage 2 complete, TODO Stage 3:", fields);
        router.push(stepPath(school, program, 3));
      }}
      onBack={() => router.push(stepPath(school, program, 1))}
    />
  );
}
