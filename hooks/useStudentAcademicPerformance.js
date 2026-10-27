"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentAcademicPerformance } from "@/services/dashboardApi";

/**
 * Performance ("My Performance") — legacy studentAcademicPerformance.js's list
 * call. Rows are only populated for Agilix Buzz LMS course providers; other
 * providers come back with an empty list (not an error).
 */
export function useStudentAcademicPerformance({ schoolUUID, userId }) {
  const query = useQuery({
    queryKey: ["student-academic-performance", schoolUUID, userId],
    queryFn: () => getStudentAcademicPerformance({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const details = query.data?.details;
  return {
    isLoading: query.isLoading,
    courses: details?.studentAcademicPerformances ?? [],
  };
}
