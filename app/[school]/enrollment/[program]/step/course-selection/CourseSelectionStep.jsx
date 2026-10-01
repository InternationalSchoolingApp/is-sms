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

/**
 * Stage 3 ("Course Selection") step content, rendered inside the shared
 * EnrollmentWizardShell from the step-group layout. Course choices are
 * persisted by the backend on every add/remove, so unlike steps 1 and 2
 * there's nothing of Stage 3's OWN fields to keep in sessionStorage here —
 * but the initial course-details-by-standard-id read still needs Stage 1's
 * saved grade (see Stage3CourseSelection.jsx's doc comment and
 * useCourseSelection.js), so that one field is loaded the same way step 2
 * loads it for its own "same as student" default.
 */
export function CourseSelectionStep() {
  const router = useRouter();
  const { school, program } = useParams();
  const { session, context, ready } = useEnrollmentContext();
  useWizardResume({ currentStep: 3, context, uniqueId: session?.uniqueId, ready });
  const [standardId, setStandardId] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setStandardId(loadWizardStudentFields(context.schoolUUID, session.userId)?.standardId || null);
    setHydrated(true);
  }, [ready, context?.schoolUUID, session?.userId]);

  if (!ready || context.customPaymentEnabled || !hydrated) {
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
