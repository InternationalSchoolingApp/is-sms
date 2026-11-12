"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudentDashboardOrMigration } from "@/services/dashboardApi";
import { studentDashboardDetailsQuery } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";

/**
 * The two dashboard-orchestrator calls the legacy rendereDashboardContent()
 * fires on every load, combined into the fields Phase B's home widgets need:
 * the graduation-ceremony-popup trigger (+ its deadline/standardId/email) and
 * the onboarding video URL ("N" sentinel means no video to show).
 * `studentGraduate` drives the re-enrollment entry (hooks/useReEnrollmentEntry.js).
 * Batch-announcement / course-selection flags are read by the backend response
 * but intentionally not surfaced here — out of scope.
 */
export function useStudentDashboardData({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["student-dashboard-data", schoolUUID, userId, dummy.key],
    queryFn: async () => {
      // Dummy (demo) student mode: legacy getDummyGradeKDashboardOrMigrationSection / Details (no popups).
      if (dummy.enabled) return { migration: dummy.student.dashboardOrMigration(), details: dummy.student.dashboardDetails() };
      const [migration, details] = await Promise.all([
        getStudentDashboardOrMigration({ schoolUUID, userId }),
        // Same cached call the DashboardProvider's grade-band gate already made.
        queryClient.ensureQueryData(studentDashboardDetailsQuery({ schoolUUID, userId })),
      ]);
      return { migration, details };
    },
    enabled: Boolean(schoolUUID && userId && dummy.settled),
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
    studentGraduate: migration?.studentGraduate === "Y",
    // StudentDetailsDTO.userTimezone (the student's configured zone; may be missing or invalid).
    userTimezone: details?.userTimezone || null,
  };
}
