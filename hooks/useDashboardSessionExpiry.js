"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { expireSession } from "@/utils/logout";

// SeriConstant.STATUS_CODE_SESSION_OUT: the Java side answers {status: "3", statusCode: "E002",
// message: "Your session has been timed out..."} when its HttpSession is gone.
const isSessionOut = (data) => data != null && typeof data === "object" && String(data.status) === "3";

/**
 * Dashboard counterpart of the wizards' useBackendSessionGuard. The Java HttpSession lives in
 * memory (session store-type none), so a backend restart or timeout kills it while this app's
 * next-auth session stays valid — every dashboard query then gets a session-out body and the
 * pages render as empty instead of erroring. Watches every query result and, on the first
 * session-out, drops the local session and sends the user to the login page (expireSession).
 *
 * Mounted only inside the dashboard: elsewhere (e.g. /common payment-response pages) a
 * session-out answer can be expected and must not log the user out.
 */
export function useDashboardSessionExpiry(schoolUUID) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!schoolUUID) return undefined;
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action?.type === "success" && isSessionOut(event.action.data)) {
        expireSession(schoolUUID);
      }
    });
  }, [queryClient, schoolUUID]);
}
