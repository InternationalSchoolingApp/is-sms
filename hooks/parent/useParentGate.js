"use client";

import { useQuery } from "@tanstack/react-query";
import { getParentGate } from "@/services/parentDashboardApi";
import { getUserShortProfile } from "@/services/dashboardApi";

/** The parent gate query (get-students-by-parent), shared by the dashboard context and the parent pages. */
export function parentGateQuery({ schoolUUID, userId }) {
  return {
    queryKey: ["parent-gate", schoolUUID, userId],
    queryFn: () => getParentGate({ schoolUUID }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  };
}

/**
 * The Parent dashboard's gate, the counterpart of the student grade-band gate in useDashboardContext: one call
 * that gives the sidebar's role id, the children and the LMS link. Only runs for a parent; for any other role it
 * is inert and `resolved` is true so the shell never waits on it.
 *
 * `resolved` turns true once the call has settled (even when it failed: the shell then shows an empty menu
 * instead of an endless loader).
 */
export function useParentGate({ role, session, authenticated }) {
  const isParent = role === "parent";
  const query = useQuery({
    ...parentGateQuery({ schoolUUID: session?.schoolUUID, userId: session?.userId }),
    enabled: authenticated && isParent,
  });
  // The parent's own name for the greeting and the header (legacy USER_FULL_NAME): the short profile's profileName.
  const nameQuery = useQuery({
    queryKey: ["parent-name", session?.schoolUUID, session?.userId],
    queryFn: async () => String((await getUserShortProfile({ schoolUUID: session.schoolUUID, userId: session.userId }))?.profileName ?? "").trim(),
    enabled: authenticated && isParent && Boolean(session?.schoolUUID && session?.userId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  if (!isParent) return { resolved: true, roleId: null, children: [], lmsProviderURL: "", name: "" };
  const gate = query.data;
  const ok = String(gate?.status) === "1" || Array.isArray(gate?.studentBasicDetails);
  return {
    resolved: authenticated && !query.isPending,
    roleId: ok ? gate?.roleAndModuleAssign?.roleAndModuleDTO?.[0]?.roleId ?? null : null,
    children: ok && Array.isArray(gate?.studentBasicDetails) ? gate.studentBasicDetails : [],
    lmsProviderURL: ok ? gate?.lmsProviderURL ?? "" : "",
    name: nameQuery.data || "",
  };
}
