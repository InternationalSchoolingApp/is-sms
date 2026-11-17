"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { acceptTeacherContract, getTeacherAgreementDetails } from "@/services/teacherSignupApi";
import { CONTRACT_STATE, mapContractDetails } from "@/utils/teacherContract";
import { TEACHER_STATUS_POLL_MS } from "@/utils/teacherReview";

const STATUS_SUCCESS = "1";
const STATUS_SESSION_OUT = "3";
const GENERIC_ERROR = "Something went wrong. Please try again.";

export const TEACHER_CONTRACT_QUERY_KEY = "teacher-contract";

/**
 * The teacher's contract: { state, contract } (utils/teacherContract.js mapContractDetails). Always fresh. While there
 * is nothing to sign yet (the school has not published one) or it has expired, it asks again every 30 s (paused while
 * the tab is hidden, and again as soon as the teacher comes back), so a contract that is published or re-issued shows up
 * by itself; the screen's "Check status" is `refetch()`.
 */
export function useTeacherContractDetails({ context, userId }) {
  return useQuery({
    queryKey: [TEACHER_CONTRACT_QUERY_KEY, userId],
    queryFn: async () => {
      const mapped = mapContractDetails(await getTeacherAgreementDetails(context.schoolUUID, userId));
      if (!mapped) throw new Error("Could not load the contract");
      return mapped;
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === CONTRACT_STATE.NOT_READY || state === CONTRACT_STATE.EXPIRED ? TEACHER_STATUS_POLL_MS : false;
    },
  });
}

/**
 * Accept the contract with the chosen signature image (a data URL):
 * { ok: true } | { ok: false, sessionOut: true } | { ok: false, message }. Success is the backend's status "1" and nothing
 * else: the legacy page treated every answer that was not an explicit failure as accepted.
 */
export function useAcceptTeacherContract({ context }) {
  return useMutation({
    mutationFn: async ({ agreementLogId, signatureImage }) => {
      const answer = await acceptTeacherContract(context.schoolUUID, { agreementLogId, signatureImage });
      if (!answer) return { ok: false, message: GENERIC_ERROR };
      if (String(answer.status) === STATUS_SESSION_OUT) return { ok: false, sessionOut: true };
      if (String(answer.status) !== STATUS_SUCCESS) return { ok: false, message: answer.message || GENERIC_ERROR };
      return { ok: true };
    },
  });
}
