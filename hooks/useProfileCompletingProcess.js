"use client";

import { useQuery } from "@tanstack/react-query";
import { callServer } from "@/utils/serverCall";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { afterStartup } from "@/utils/dashboardBootstrap";

const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * GET /api/profile-completing (app/api/profile-completing/route.js): a plain request, not a Server Action, so this slow check
 * (13-18s) no longer holds the page's action queue. `account` (context.uniqueId) goes in the X-Account header so the route
 * answers for this dashboard's student. The answer is the action's old { ok, data } shape.
 */
async function fetchProfileCompleting(account) {
  const headers = {};
  if (typeof account === "string" && ACCOUNT_ID.test(account)) headers["X-Account"] = account;
  const response = await fetch("/api/profile-completing", { headers, cache: "no-store" });
  return response.json();
}

/**
 * The profile-completing answer for the "Complete Your Profile" popup, read once and shared (the K-5 and the standard popup
 * both use it, and a remount or a second reader no longer asks the backend again). `data` is undefined while it is loading
 * and when the setting is off or the call failed - the popups show nothing in all of those cases.
 */
export function useProfileCompletingProcess() {
  const { context } = useDashboardContext();
  const userId = context?.userId;
  const account = context?.uniqueId;
  const query = useQuery({
    queryKey: ["profile-completing-process", userId],
    // The slowest check of the page (three backend reads): it waits until the start-up batches are in.
    queryFn: () => callServer(() => afterStartup(userId, () => fetchProfileCompleting(account))),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return { data: query.data ?? null, loading: query.isLoading };
}
