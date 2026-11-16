"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentDashboardDetailsQuery, useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getMyProfile } from "@/services/profileApi";
import { createDummyProfileAnswer } from "@/utils/dummyProfile";
import { buildProfileModel } from "@/utils/profileModel";
import { callServer } from "@/utils/serverCall";

/**
 * The signed-in student's own profile, read-only (My Profile P1). The current enrolment (studentStandardId) comes
 * from the dashboard details the shell already loaded (same React Query cache), the rest from services/profileApi.js.
 * Returns { model, isLoading, error, refetch }; model = utils/profileModel.js buildProfileModel().
 *
 * Dummy (demo) student mode: a sample profile (utils/dummyProfile.js) is shown, view-only. Nothing of the signed-in
 * account is read, and there is no enrolment id or edit right, so no editor or action can save anything for real.
 */
export function useStudentProfile({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const { context } = useDashboardContext();
  const live = dummy.settled && !dummy.enabled;
  const detailsQuery = useQuery({ ...studentDashboardDetailsQuery({ schoolUUID, userId }), enabled: Boolean(schoolUUID && userId) && live });
  const studentStandardId = live ? detailsQuery.data?.studentStandardId ?? null : null;
  const detailsSettled = !detailsQuery.isPending;

  const query = useQuery({
    queryKey: ["my-profile", userId, studentStandardId],
    queryFn: () => callServer(() => getMyProfile({ studentStandardId })),
    enabled: Boolean(userId) && detailsSettled && live,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const dummyAnswer = useMemo(
    () => (dummy.enabled ? createDummyProfileAnswer({ name: context?.userName || "", schoolName: context?.schoolName || "" }) : null),
    [dummy.enabled, context?.userName, context?.schoolName],
  );
  const data = dummy.enabled ? dummyAnswer : query.data;
  const model = useMemo(() => (data ? { ...buildProfileModel(data), demo: dummy.enabled } : null), [data, dummy.enabled]);
  return {
    model,
    // The raw answer and the enrolment, for the editor (hooks/useProfileEditor.js).
    profile: data?.profile ?? null,
    studentStandardId,
    isLoading: !model && (!dummy.settled || (live && (query.isPending || !detailsSettled))) && !query.error,
    error: dummy.enabled ? null : query.error,
    refetch: query.refetch,
  };
}
