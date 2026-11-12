"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getParentWithdrawal, listParentWithdrawals, sendParentWithdrawalOtp, submitParentWithdrawalBank, verifyParentWithdrawalOtp } from "@/services/parentWithdrawalApi";
import { expireSession } from "@/utils/logout";

const GENERIC = "Something went wrong. Please try again.";

/**
 * The parent's Withdrawal Request section for ONE chosen child (legacy withdrawalRequestUser.js). The parent is the
 * session user; the child id only travels in the call body and the server checks it is the parent's child. Key =
 * [feature, school, parent, child]. The one-time code and the bank details are never in a key or in cached data: they
 * are only arguments of the actions below, which return { ok, message, ... } and never throw (a null answer = generic
 * failure; a session that ended signs the parent out).
 *
 *   data    { student, reasons, requests, canCreate } of withdrawal-init (bank numbers already masked by the server)
 *   sendOtp({ reasonId, description })   -> { ok, message, requestId, email }
 *   verifyOtp({ requestId, otp })         -> { ok, message, requestNo, email }   (then the list is refreshed)
 *   submitBank({ requestId, bank })       -> { ok, message }                     (then the list is refreshed)
 */
export function useParentWithdrawal(studentUserId) {
  const { context } = useDashboardContext();
  const queryClient = useQueryClient();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const enabled = Boolean(schoolUUID && parentUserId && studentUserId);
  const key = useMemo(() => ["parent-withdrawal", schoolUUID, parentUserId, studentUserId ? String(studentUserId) : null], [schoolUUID, parentUserId, studentUserId]);

  const query = useQuery({
    queryKey: key,
    queryFn: () => getParentWithdrawal({ schoolUUID, studentUserId }),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const answer = query.data;
  const settle = useCallback(
    (result) => {
      if (!result) return { ok: false, message: GENERIC };
      if (result.sessionOut) {
        expireSession(schoolUUID);
        return { ok: false, message: result.message };
      }
      return result;
    },
    [schoolUUID],
  );

  // Refresh the requests (and whether a new one can be created) after a change, keeping the rest of the page as is.
  const refreshList = useCallback(async () => {
    try {
      const list = await listParentWithdrawals({ schoolUUID, studentUserId });
      if (list?.ok) {
        queryClient.setQueryData(key, (old) => (old?.ok ? { ...old, requests: list.requests, canCreate: list.canCreate } : old));
        return;
      }
    } catch {
      // fall through to a full reload
    }
    queryClient.invalidateQueries({ queryKey: key });
  }, [queryClient, schoolUUID, studentUserId, key]);

  const sendOtp = useCallback(
    async ({ reasonId, description }) => {
      try {
        return settle(await sendParentWithdrawalOtp({ schoolUUID, studentUserId, reasonId, description }));
      } catch {
        return { ok: false, message: GENERIC };
      }
    },
    [schoolUUID, studentUserId, settle],
  );

  const verifyOtp = useCallback(
    async ({ requestId, otp }) => {
      try {
        const result = settle(await verifyParentWithdrawalOtp({ schoolUUID, requestId, otp }));
        if (result.ok) await refreshList();
        return result;
      } catch {
        return { ok: false, message: GENERIC };
      }
    },
    [schoolUUID, settle, refreshList],
  );

  const submitBank = useCallback(
    async ({ requestId, bank }) => {
      try {
        const result = settle(await submitParentWithdrawalBank({ schoolUUID, requestId, bank }));
        if (result.ok) await refreshList();
        return result;
      } catch {
        return { ok: false, message: GENERIC };
      }
    },
    [schoolUUID, settle, refreshList],
  );

  const ok = answer?.ok === true;
  return {
    isLoading: enabled && query.isPending,
    sessionOut: Boolean(answer?.sessionOut),
    // null = the call itself failed; { ok: false } = the backend refused (message shown as is).
    failed: !query.isPending && !ok && !answer?.sessionOut,
    failedMessage: answer && !answer.ok ? answer.message || "" : "",
    data: ok ? answer : null,
    retry: () => query.refetch(),
    sendOtp,
    verifyOtp,
    submitBank,
  };
}
