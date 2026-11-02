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
export function useStudentAcademicPerformance({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const query = useQuery({
    queryKey: ["student-academic-performance", schoolUUID, userId, dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.academicPerformance() : getStudentAcademicPerformance({ schoolUUID, userId })),
    enabled: Boolean(schoolUUID && userId && dummy.settled),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const details = query.data?.details;
  return {
    isLoading: !dummy.settled || query.isLoading,
    courses: details?.studentAcademicPerformances ?? [],
    courseProviderId: details?.courseProviderId,
  };
}
