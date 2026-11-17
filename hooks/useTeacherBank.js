"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { getTeacherBankDetails, getTeacherDashboardLink, saveTeacherBankDetails } from "@/services/teacherSignupApi";
import { buildSaveBankRequest, isSafeDashboardLink, mapBankDetails } from "@/utils/teacherBank";

const STATUS_SUCCESS = "1";
const STATUS_SESSION_OUT = "3";
const GENERIC_ERROR = "Something went wrong. Please try again.";

export const TEACHER_BANK_QUERY_KEY = "teacher-bank-details";

/**
 * What Step 6 starts from, resolved BEFORE the form mounts: { fields, masked } (utils/teacherBank.js mapBankDetails). The
 * legacy page was always blank; a teacher who saved before gets their details back, without the account number and the
 * IBAN (the backend only has them masked: they are typed again).
 */
export function useTeacherBankPrefill({ context }) {
  return useQuery({
    queryKey: [TEACHER_BANK_QUERY_KEY, context?.schoolUUID],
    queryFn: async () => {
      const mapped = mapBankDetails(await getTeacherBankDetails(context.schoolUUID));
      if (!mapped) throw new Error("Could not load the bank details");
      return mapped;
    },
    enabled: Boolean(context?.schoolUUID),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Submit the bank details, which completes the registration: { ok: true } | { ok: false, sessionOut: true } |
 * { ok: false, message }. The server checks the whole request before it writes anything, and accepts it only from the
 * teacher themself on the bank step.
 */
export function useSaveTeacherBank({ context, userId }) {
  return useMutation({
    mutationFn: async (fields) => {
      const answer = await saveTeacherBankDetails(context.schoolUUID, buildSaveBankRequest({ fields, userId }));
      if (!answer) return { ok: false, message: GENERIC_ERROR };
      if (String(answer.status) === STATUS_SESSION_OUT) return { ok: false, sessionOut: true };
      if (String(answer.status) !== STATUS_SUCCESS) return { ok: false, message: answer.message || GENERIC_ERROR };
      return { ok: true };
    },
  });
}

/** The one-time address of the Java teacher dashboard: { ok: true, url } | { ok: false }. */
export function useTeacherDashboardLink({ context }) {
  return useMutation({
    mutationFn: async () => {
      const answer = await getTeacherDashboardLink(context.schoolUUID);
      if (String(answer?.status) !== STATUS_SUCCESS || !isSafeDashboardLink(answer?.url)) return { ok: false };
      return { ok: true, url: String(answer.url) };
    },
  });
}
