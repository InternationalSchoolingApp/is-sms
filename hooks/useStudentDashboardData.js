"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentDashboardDetails, getStudentDashboardOrMigration } from "@/services/dashboardApi";

/**
 * The two dashboard-orchestrator calls the legacy rendereDashboardContent()
 * fires on every load, combined into the fields Phase B's home widgets need:
 * the graduation-ceremony-popup trigger (+ its deadline/standardId/email) and
 * the onboarding video URL ("N" sentinel means no video to show).
 * Re-enrollment / batch-announcement / course-selection flags are read by the
 * backend response but intentionally not surfaced here — out of scope.
 */
export function useStudentDashboardData({ schoolUUID, userId }) {
  const query = useQuery({
    queryKey: ["student-dashboard-data", schoolUUID, userId],
    queryFn: async () => {
      const [migration, details] = await Promise.all([
        getStudentDashboardOrMigration({ schoolUUID, userId }),
        getStudentDashboardDetails({ schoolUUID, userId }),
      ]);
      return { migration, details };
    },
    enabled: Boolean(schoolUUID && userId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const migration = query.data?.migration;
  const details = query.data?.details;

  return {
    isLoading: query.isLoading,
    videoUrl: details?.videoUrl && details.videoUrl !== "N" ? details.videoUrl : null,
    studentEmail: migration?.email || details?.email || null,
    showGraduationCeremonyPopup: migration?.showGraduationCeremonyPopup === "Y",
    graduationCeremonyRegistrationDeadline: migration?.graduationCeremonyRegistrationDeadline || null,
    standardId: migration?.standardId ?? null,
  };
}
