"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentExaminationDetails } from "@/services/dashboardApi";

/**
 * Exam Details ("Examination Schedule") — legacy studentExaminationSheetContent.js.
 * `fileUrl` is null when the admin hasn't uploaded an exam sheet yet (backend
 * returns details: "" in that case).
 */
export function useStudentExaminationDetails({ schoolUUID, userId }) {
  const query = useQuery({
    queryKey: ["student-examination-details", schoolUUID, userId],
    queryFn: () => getStudentExaminationDetails({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    isLoading: query.isLoading,
    fileUrl: query.data?.details || null,
  };
}
