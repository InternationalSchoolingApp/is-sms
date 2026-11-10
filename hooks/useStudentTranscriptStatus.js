"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentTranscriptStatus } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

/**
 * My Transcript — student-transcript-status. In dummy mode with a demo row the real row is
 * rewritten like legacy applyDummyStudentTranscriptContent (demo name / grade, dummy transcript links).
 */
export function useStudentTranscriptStatus({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const query = useQuery({
    queryKey: ["student-transcript-status", schoolUUID, userId],
    queryFn: () => getStudentTranscriptStatus({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId && dummy.settled),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const details = query.data?.details;
  const student = details?.student ?? null;
  const demo = dummy.enabled ? dummy.student.transcript(student) : null;
  return {
    isLoading: !dummy.settled || query.isLoading,
    student: demo?.student ?? student,
    transcripts: demo?.transcripts ?? details?.transcripts ?? [],
  };
}
