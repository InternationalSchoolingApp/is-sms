"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isSessionExpiredError, isSessionOutResponse, markSessionExpired } from "@/utils/sessionState";

/**
 * Dashboard counterpart of the wizards' useBackendSessionGuard. The Java HttpSession lives in memory (session
 * store-type none), so a backend restart or timeout kills it while this app's next-auth session stays valid -
 * every dashboard query then gets a session-out body (see isSessionOutResponse) and the pages render as empty
 * instead of erroring. Watches every query result and, on the first session-out (or a SessionExpiredError from
 * callServer), opens the global "Your session has been logged out" dialog - never a redirect and never twice
 * (markSessionExpired). The dialog's own buttons sign in again or go to the login page.
 *
 * Mounted only inside the dashboard: elsewhere (e.g. /common payment-response pages) a session-out answer can be
 * expected and must not log the user out.
 */
export function useDashboardSessionExpiry(schoolUUID) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!schoolUUID) return undefined;
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const action = event.action;
      if ((action?.type === "success" && isSessionOutResponse(action.data)) || (action?.type === "error" && isSessionExpiredError(action.error))) {
        markSessionExpired();
      }
    });
  }, [queryClient, schoolUUID]);
}
