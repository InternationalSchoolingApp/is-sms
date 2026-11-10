"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentFeeDetails } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

/**
 * Fee Details ("My Fee Details") — legacy studentFeeDetails.js's list call
 * (or getDummyStudentFeeDetailsResponse in dummy mode).
 */
export function useStudentFeeDetails({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const query = useQuery({
    queryKey: ["student-fee-details", schoolUUID, userId, dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.feeDetails() : getStudentFeeDetails({ schoolUUID, userId })),
    enabled: Boolean(schoolUUID && userId && dummy.settled),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const details = query.data?.details;
  return {
    isLoading: !dummy.settled || query.isLoading,
    payments: details?.userPaymentDetailsList ?? [],
    nextUserPaymentDetailsId: details?.nextUserPaymentDetailsId,
    refetch: query.refetch,
  };
}
