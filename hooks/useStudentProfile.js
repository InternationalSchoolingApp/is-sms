"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentDashboardDetailsQuery, useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getMyProfile } from "@/services/profileApi";
import { createDummyProfileAnswer } from "@/utils/dummyProfile";
import { buildProfileModel } from "@/utils/profileModel";
import { callServer } from "@/utils/serverCall";
import { afterStartup } from "@/utils/dashboardBootstrap";

/**
 * The signed-in student's own profile, read-only (My Profile P1). The current enrolment (studentStandardId) comes
 * from the dashboard details the shell already loaded (same React Query cache), the rest from services/profileApi.js.
 * Returns { model, isLoading, error, refetch }; model = utils/profileModel.js buildProfileModel().
 *
 * Dummy (demo) student mode: a sample profile (utils/dummyProfile.js) is shown, view-only. Nothing of the signed-in
 * account is read, and there is no enrolment id or edit right, so no editor or action can save anything for real.
 */
export function useStudentProfile({ schoolUUID, userId, dummyOnly = false }) {
  const dummy = useDummyStudent();
  const { context } = useDashboardContext();
  // `dummyOnly`: a reader that only needs the dummy student's sample profile (the header avatar in demo mode) never loads the
  // real one - for a real student it reads nothing here.
  const live = dummy.settled && !dummy.enabled && !dummyOnly;
  const detailsQuery = useQuery({ ...studentDashboardDetailsQuery({ schoolUUID, userId }), enabled: Boolean(schoolUUID && userId) && live });
  const studentStandardId = live ? detailsQuery.data?.studentStandardId ?? null : null;
  const detailsSettled = !detailsQuery.isPending;

  const query = useQuery({
    queryKey: ["my-profile", userId, studentStandardId],
    // The photo / profile call is the slowest of the page and nothing draws on it: it waits until the screen and the counts are in.
    queryFn: () => callServer(() => afterStartup(userId, () => getMyProfile({ studentStandardId }))),
    enabled: Boolean(userId) && detailsSettled && live,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const dummyAnswer = useMemo(
    () => (dummy.enabled ? createDummyProfileAnswer({ name: context?.userName || "", schoolName: context?.schoolName || "", row: dummy.row }) : null),
    [dummy.enabled, context?.userName, context?.schoolName, dummy.row],
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
