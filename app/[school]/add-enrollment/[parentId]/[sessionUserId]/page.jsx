"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import {
  AddEnrollmentProvider,
  useAddEnrollmentContext,
} from "@/hooks/add-enrollment/useAddEnrollmentContext";
import { addEnrollmentStepPath } from "@/utils/addEnrollmentSteps";
import { expireSession } from "@/utils/logout";

/**
 * Entry URL for the Add Another Student wizard
 * (/{school}/add-enrollment/{parentId}/{sessionUserId}).
 *
 * There are no step children directly under this segment — the wizard steps
 * live under /step/{slug}. Landing here resolves enrollAnotherChild() once,
 * reads the backend's signupPage (1/2/3), and router.replace()s to the
 * matching step slug via addEnrollmentStepPath. router.replace (not push)
 * keeps Back from bouncing the user to this blank entry URL again.
 */
function AddEnrollmentEntryRedirect() {
  const router = useRouter();
  const { school, parentId, sessionUserId } = useParams();
  const { status, context, ready, isError } = useAddEnrollmentContext();

  useEffect(() => {
    if (status === "unauthenticated") expireSession(school);
  }, [status, school]);

  useEffect(() => {
    if (!ready) return;
    const signupPage = Number(context?.signupPage);
    const step = signupPage >= 1 && signupPage <= 3 ? signupPage : 1;
    router.replace(addEnrollmentStepPath(school, parentId, sessionUserId, step));
  }, [ready, context?.signupPage, router, school, parentId, sessionUserId]);

  if (isError) {
    return <FullScreenLoader message="Something went wrong. Please refresh the page." />;
  }
  return <FullScreenLoader />;
}

export default function AddEnrollmentEntryPage() {
  return (
    <AddEnrollmentProvider>
      <AddEnrollmentEntryRedirect />
    </AddEnrollmentProvider>
  );
}
