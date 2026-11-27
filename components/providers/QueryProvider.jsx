"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { isSessionExpiredError, subscribeSessionExpired } from "@/utils/sessionState";

export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stage-save/status calls are user-driven, not cache-heavy —
            // keep defaults conservative rather than aggressive background refetching.
            refetchOnWindowFocus: false,
            // A dead session is never retried (the global dialog is already open).
            retry: (failureCount, error) => !isSessionExpiredError(error) && failureCount < 1,
          },
        },
      })
  );

  // Once the session is marked expired, every query and mutation pauses instead of sending a request that
  // can only fail (they continue only after the page is reloaded by signing in again).
  useEffect(() => subscribeSessionExpired(() => onlineManager.setOnline(false)), []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
