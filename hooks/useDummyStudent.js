"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { studentDemoRowQuery, useDashboardContext } from "@/hooks/useDashboardContext";
import { isDummyStudentMode } from "@/utils/paymentGatewayChecks";
import { createDummyStudent } from "@/utils/dummyStudent";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

// The page's query string, read after hydration (null on the server, so the first client render
// matches the server one). Not subscribed: a dashboard route change remounts the module.
const subscribe = () => () => {};
const readSearch = () => window.location.search;
const readSearchOnServer = () => null;

/**
 * Dummy (demo) student mode for the dashboard modules — legacy dummyStudentDashboardData.js.
 * On for a demo account (session demoUser, the legacy isDemoUser) or ?dummyStudent=Y, off with
 * ?parentDemoPreview=Y. A demo account also loads its demo-data row first.
 *
 * settled: true once it is known whether to use dummy data (and the demo row has loaded) — module
 * queries wait for it so a demo user never hits the real API first.
 * enabled: use `student` (createDummyStudent) instead of the backend.
 * key: put in the module's query key instead of `enabled`.
 */
export function useDummyStudent() {
  const { context } = useDashboardContext();
  const search = useSyncExternalStore(subscribe, readSearch, readSearchOnServer);
  const demoUser = Boolean(context?.demoUser);
  const enabled = search !== null && isDummyStudentMode(demoUser);

  const rowQuery = useQuery(studentDemoRowQuery({ schoolUUID: context?.schoolUUID, userId: context?.userId, enabled: enabled && demoUser }));

  const row = rowQuery.data ?? null;
  // The dummy fee receipt page reads its data from this app's localStorage, so it must open on this
  // origin: same-origin through the local proxy (next.config.mjs fallback), else the backend origin.
  const receiptBaseUrl = process.env.NEXT_PUBLIC_USE_LOCAL_PROXY === "true" ? "" : resolveBackendOrigin();
  const fallbackName = context?.userName || "";
  const student = useMemo(
    () =>
      enabled
        ? createDummyStudent({
            row,
            params: new URLSearchParams(search || ""),
            fallbackName,
            receiptBaseUrl,
            imageBaseUrl: `${resolveBackendOrigin()}/static/theme2/images/`,
          })
        : null,
    [enabled, row, search, fallbackName, receiptBaseUrl],
  );

  const settled = Boolean(context) && search !== null && !(enabled && demoUser && rowQuery.isLoading);
  // Part of each module's query key, so cached dummy data is rebuilt once the name / demo row arrive.
  const key = enabled ? `dummy|${row?.id ?? ""}|${fallbackName}|${search}` : "live";
  return { settled, enabled, student, key };
}
