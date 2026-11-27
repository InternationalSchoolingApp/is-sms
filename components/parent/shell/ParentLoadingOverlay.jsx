"use client";

import { useIsFetching } from "@tanstack/react-query";
import { FullScreenLoader } from "@/components/common/Loader";

// The parent pages' own data queries (query key prefix). Not the helpers around them: the home overview (it has its own
// loader inside its tile, because it takes ~18 s and the rest of the home is already usable), the rail counts, the
// button settings, and the data of dialogs (they show their own loading line).
const PAGE_QUERIES = new Set([
  "parent-academic-docs",
  "parent-academic-performance",
  "parent-assigned-teacher",
  "parent-attendance",
  "parent-attendance-details",
  "parent-class-schedule",
  "parent-class-schedule-summary",
  "parent-fee-details",
  "parent-fees",
  "parent-gradebook-report",
  "parent-login-history",
  "parent-profile",
  "parent-profile-master",
  "parent-progress-reports",
  "parent-schedule",
]);

// Only the first load of a query (no data yet): a refetch of data already on screen never covers the page.
const isFirstLoad = (query) => PAGE_QUERIES.has(query.queryKey[0]) && query.state.data === undefined && query.state.fetchStatus === "fetching";

/** The common loader (the one the rest of the app shows while waiting) over the parent dashboard while a page's data loads for the first time. */
export function ParentLoadingOverlay() {
  const loading = useIsFetching({ predicate: isFirstLoad }) > 0;
  return loading ? <FullScreenLoader /> : null;
}
