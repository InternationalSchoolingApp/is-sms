"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentTranscriptStatus } from "@/services/dashboardApi";

export function useStudentTranscriptStatus({ schoolUUID, userId }) {
  const query = useQuery({
    queryKey: ["student-transcript-status", schoolUUID, userId],
    queryFn: () => getStudentTranscriptStatus({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const details = query.data?.details;
  return {
    isLoading: query.isLoading,
    student: details?.student ?? null,
    transcripts: details?.transcripts ?? [],
  };
}
