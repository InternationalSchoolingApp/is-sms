"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentFeeDetails } from "@/services/parentFeesApi";
import { expireSession } from "@/utils/logout";

/**
 * The selected child's fee rows for the parent's Fee Details page (legacy parentFeeDetails.js list call).
 * Key = [feature, school, parent, child], so switching child refetches and two parents never share rows.
 * `details` is absent when the child has no payment rows (an empty list, not an error); a null answer (backend
 * failure) is `failed`; status "3" (session out) sends the parent to the login page.
 */
export function useParentFeeDetails() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const childUserId = selectedChild ? String(selectedChild.userId) : null;
  const enabled = Boolean(schoolUUID && parentUserId && childUserId);

  const query = useQuery({
    queryKey: ["parent-fee-details", schoolUUID, parentUserId, childUserId],
    queryFn: () => getParentFeeDetails({ schoolUUID, studentUserId: childUserId }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const sessionOut = String(query.data?.status) === "3";
  useEffect(() => {
    if (sessionOut && schoolUUID) expireSession(schoolUUID);
  }, [sessionOut, schoolUUID]);

  const details = query.data?.details;
  const payments = Array.isArray(details?.userPaymentDetailsList) ? details.userPaymentDetailsList : [];
  return {
    isLoading: enabled && query.isPending,
    failed: enabled && !query.isPending && !query.data,
    sessionOut,
    payments,
    nextUserPaymentDetailsId: details?.nextUserPaymentDetailsId,
    refetch: query.refetch,
  };
}
