"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentAcademicPerformance } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

/**
 * Performance ("My Performance") — legacy studentAcademicPerformance.js's list
 * call (or getDummyStudentAcademicPerformanceResponse in dummy mode). Rows are
 * only populated for Agilix Buzz LMS course providers; other providers come
 * back with an empty list (not an error).
 */
// k5Performance: the new My Performance page, built by the backend from the daily cron's tables.
export function useStudentAcademicPerformance({ schoolUUID, userId, k5Performance = false }) {
  const dummy = useDummyStudent();
  const query = useQuery({
    queryKey: ["student-academic-performance", schoolUUID, userId, k5Performance, dummy.key],
    queryFn: () =>
      dummy.enabled ? dummy.student.academicPerformance() : getStudentAcademicPerformance({ schoolUUID, userId, k5Performance }),
    enabled: Boolean(schoolUUID && userId && dummy.settled),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const details = query.data?.details;
  return {
    isLoading: !dummy.settled || query.isLoading,
    courses: details?.studentAcademicPerformances ?? [],
    courseProviderId: details?.courseProviderId,
    performance: details?.performance ?? null,
  };
}
