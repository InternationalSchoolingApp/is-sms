"use client";

import { useQuery } from "@tanstack/react-query";
import { getAcademicYearExtension } from "@/services/dashboardApi";

/**
 * Course Extension list — legacy studentAcademicYearExtentionFetch() +
 * studentAcademicYearExtentionBuildPageData(). The backend leaves status "0" on success and on
 * every blocked case, so the courses are read whenever the status is "0" and the message comes
 * from details, else from the response ("No details found." when nothing came back).
 */
export function useStudentAcademicYearExtension({ schoolUUID, userId }) {
  const query = useQuery({
    queryKey: ["academic-year-extension", schoolUUID, userId],
    queryFn: () => getAcademicYearExtension({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const response = query.data;
  const ok = String(response?.status) === "0";
  const details = response?.details;
  return {
    isLoading: query.isLoading,
    message: ok ? details?.message || response?.message || "" : response?.message || "No details found.",
    courses: ok && Array.isArray(details?.courses) ? details.courses : [],
    refetch: query.refetch,
  };
}
