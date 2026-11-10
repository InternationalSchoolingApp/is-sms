"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentDashboardDetailsQuery } from "@/hooks/useDashboardContext";
import { getMyProfile } from "@/services/profileApi";
import { buildProfileModel } from "@/utils/profileModel";
import { callServer } from "@/utils/serverCall";

/**
 * The signed-in student's own profile, read-only (My Profile P1). The current enrolment (studentStandardId) comes
 * from the dashboard details the shell already loaded (same React Query cache), the rest from services/profileApi.js.
 * Returns { model, isLoading, error, refetch }; model = utils/profileModel.js buildProfileModel().
 */
export function useStudentProfile({ schoolUUID, userId }) {
  const detailsQuery = useQuery({ ...studentDashboardDetailsQuery({ schoolUUID, userId }), enabled: Boolean(schoolUUID && userId) });
  const studentStandardId = detailsQuery.data?.studentStandardId ?? null;
  const detailsSettled = !detailsQuery.isPending;

  const query = useQuery({
    queryKey: ["my-profile", userId, studentStandardId],
    queryFn: () => callServer(() => getMyProfile({ studentStandardId })),
    enabled: Boolean(userId) && detailsSettled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const model = useMemo(() => (query.data ? buildProfileModel(query.data) : null), [query.data]);
  return {
    model,
    // The raw answer and the enrolment, for the editor (hooks/useProfileEditor.js).
    profile: query.data?.profile ?? null,
    studentStandardId,
    isLoading: !model && (query.isPending || !detailsSettled) && !query.error,
    error: query.error,
    refetch: query.refetch,
  };
}
