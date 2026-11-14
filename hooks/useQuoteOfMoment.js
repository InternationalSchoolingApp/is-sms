"use client";

import { useQuery } from "@tanstack/react-query";
import { loadQuoteOfMoment } from "@/services/quoteApi";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";

/** One random quote for the signed-in student; null when the service is off or there is none. Never in demo mode. */
export function useQuoteOfMoment() {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const query = useQuery({
    queryKey: ["quote-of-moment", context?.userId],
    queryFn: loadQuoteOfMoment,
    enabled: Boolean(context?.userId && dummy.settled && !dummy.enabled),
    // Legacy fetched once per page load; keep the same quote while the student moves between modules.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return query.data ?? null;
}
