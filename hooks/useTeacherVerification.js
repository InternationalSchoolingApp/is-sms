"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { getTeacherVerificationDetails, saveTeacherVerification } from "@/services/teacherSignupApi";
import { buildSaveVerificationRequest, mapVerificationDetails } from "@/utils/teacherVerification";

const STATUS_SUCCESS = "1";
const STATUS_SESSION_OUT = "3";
const GENERIC_ERROR = "Something went wrong. Please try again.";

export const TEACHER_VERIFICATION_QUERY_KEY = "teacher-verification";

/**
 * Everything Step 5 shows, resolved BEFORE the form mounts (the form and its phone fields read their initial values at
 * mount only): { fields, documents } (utils/teacherVerification.js mapVerificationDetails). Always fresh: the documents
 * change outside this query (upload / delete).
 */
export function useTeacherVerificationPrefill({ context, userId }) {
  return useQuery({
    queryKey: [TEACHER_VERIFICATION_QUERY_KEY, userId],
    queryFn: async () => {
      const mapped = mapVerificationDetails(await getTeacherVerificationDetails(context.schoolUUID, userId));
      if (!mapped) throw new Error("Could not load the verification details");
      return mapped;
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Submit the verification: { ok: true } | { ok: false, sessionOut: true } | { ok: false, message }. The server checks the
 * whole request and that the four documents are stored before it writes anything, and moves the teacher on only from the
 * stage right after the contract.
 */
export function useSubmitTeacherVerification({ context, userId }) {
  return useMutation({
    mutationFn: async (fields) => {
      const answer = await saveTeacherVerification(context.schoolUUID, buildSaveVerificationRequest({ fields, userId }));
      if (!answer) return { ok: false, message: GENERIC_ERROR };
      if (String(answer.status) === STATUS_SESSION_OUT) return { ok: false, sessionOut: true };
      if (String(answer.status) !== STATUS_SUCCESS) return { ok: false, message: answer.message || GENERIC_ERROR };
      return { ok: true };
    },
  });
}
