"use client";

import { useQuery } from "@tanstack/react-query";
import { getNeedHelpContact } from "@/services/dashboardApi";
import { useDashboardContext } from "@/hooks/useDashboardContext";

/** The header's "Need help?" WhatsApp link ({ href } or null). Student role only, like legacy. */
export function useNeedHelp() {
  const { context } = useDashboardContext();
  const { schoolUUID, userId, schoolNumericId, role } = context ?? {};
  const query = useQuery({
    queryKey: ["need-help-contact", schoolUUID, userId],
    queryFn: () => getNeedHelpContact({ schoolUUID, userId, schoolNumericId }),
    enabled: Boolean(schoolUUID && userId && schoolNumericId && String(role).toLowerCase() === "student"),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
  return query.data ?? null;
}
