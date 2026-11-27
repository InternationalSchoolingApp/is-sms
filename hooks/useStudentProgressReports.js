"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentWeeklyProgressReports } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

/**
 * Progress Reports ("My Progress Reports") — legacy studentProgressDetail.js's
 * list call (weekly / biweekly / monthly auto-generated gradebook reports), or
 * getDummyStudentProgressReportsResponse in dummy mode.
 */
export function useStudentProgressReports({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const query = useQuery({
    queryKey: ["student-weekly-progress-reports", schoolUUID, userId, dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.progressReports() : getStudentWeeklyProgressReports({ schoolUUID, userId })),
    enabled: Boolean(schoolUUID && userId && dummy.settled),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    isLoading: !dummy.settled || query.isLoading,
    reports: query.data?.details?.studentWeeklyProgressReports ?? [],
  };
}
