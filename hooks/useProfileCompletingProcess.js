"use client";

import { useQuery } from "@tanstack/react-query";
import { loadProfileCompletingProcess } from "@/services/profileActionsApi";
import { callServer } from "@/utils/serverCall";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { afterStartup } from "@/utils/dashboardBootstrap";

/**
 * The profile-completing answer for the "Complete Your Profile" popup, read once and shared (the K-5 and the standard popup
 * both use it, and a remount or a second reader no longer asks the backend again). `data` is undefined while it is loading
 * and when the setting is off or the call failed - the popups show nothing in all of those cases.
 */
export function useProfileCompletingProcess() {
  const { context } = useDashboardContext();
  const userId = context?.userId;
  const query = useQuery({
    queryKey: ["profile-completing-process", userId],
    // The slowest check of the page (three backend reads): it waits until the start-up batches are in.
    queryFn: () => callServer(() => afterStartup(userId, () => loadProfileCompletingProcess())),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { data: query.data ?? null, loading: query.isLoading };
}
