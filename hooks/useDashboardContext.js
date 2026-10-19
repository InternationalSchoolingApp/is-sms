"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { getDashboardMenu, getDashboardUserDetails } from "@/services/dashboardApi";
import { applyStudentNavRules, mapBackendMenu } from "@/utils/dashboardNav";
import { expireSession } from "@/utils/logout";

/**
 * Shared dashboard context, mounted ONCE by the (dashboard) route-group layout
 * (DashboardChrome) and consumed by the shell + every module page — the same
 * pattern as useEnrollmentContext for the wizard. Resolves the current user and
 * school straight from the Auth.js session (no {schoolId} URL param), fetches
 * the branding logo, and resolves the sidebar menu.
 *
 * Sidebar menu: always the dynamic DB-driven menu (getDashboardMenu →
 * mapBackendMenu, the faithful copy of the Java USER_RIGHTS sidebar). Resolves
 * to an empty array until the query settles, so `ready` never blocks on it.
 *
 * NOTE (Phase A): the STUDENT_DASHBOARD_VIA_NEXTJS coexistence toggle and the
 * "redirect to legacy JSP dashboard when off" behavior are intentionally NOT
 * wired here yet — the SETTINGS row does not exist during Phase A, so acting on
 * its empty value would wrongly bounce every student to the legacy dashboard.
 * It is added together with the backend toggle + redirect branch.
 */
const DashboardContext = createContext(null);

function useResolveDashboardContext({ role = "student" } = {}) {
  const { data: session, status } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);
  const authenticated = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);

  // Session-expiry guard: a session dropping while the dashboard is open hands
  // the user back to the school's Java login page (proxy.js already blocks
  // unauthenticated navigations server-side; this covers the in-app drop).
  useEffect(() => {
    if (status === "unauthenticated") expireSession(session?.schoolUUID);
  }, [status, session?.schoolUUID]);

  // Dynamic menu (faithful Java sidebar) — the only source for the sidebar now.
  // For students, item-level visibility/labels are then adjusted to match
  // DashboardLeftSideContentSchool.jsp's per-pageLink rules (see
  // applyStudentNavRules), using the student-profile flags from
  // getDashboardUserDetails (fee-details needs an Online signup, Academic
  // Year Extension is hidden for certain providers/standards, etc).
  const menuQuery = useQuery({
    queryKey: ["dashboard-menu", role, session?.schoolNumericId, session?.roleId, session?.userId],
    queryFn: async () => {
      const [dto, details] = await Promise.all([
        getDashboardMenu({
          schoolUUID: session.schoolUUID,
          schoolId: session.schoolNumericId,
          roleId: session.roleId,
          userId: session.userId,
        }),
        role === "student" ? getDashboardUserDetails({ schoolUUID: session.schoolUUID, userId: session.userId }) : null,
      ]);
      const mapped = mapBackendMenu(dto) ?? [];
      return role === "student" ? applyStudentNavRules(mapped, details ?? {}, { schoolNumericId: session.schoolNumericId }) : mapped;
    },
    enabled: authenticated,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  // Empty until the query settles, so the sidebar renders (empty) without
  // waiting on the (possibly missing) endpoint.
  const menu = menuQuery.data ?? [];

  // Branding logo (not carried in the session) — same source as the wizard/login.
  useEffect(() => {
    if (!session?.schoolNumericId) return;
    let cancelled = false;
    getSchoolSettingsLinks(session.schoolNumericId)
      .then((links) => {
        if (!cancelled && links?.logoUrl) setLogoUrl(links.logoUrl);
      })
      .catch((err) => console.error("School links fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.schoolNumericId]);

  const ready = authenticated;

  const context = ready
    ? {
        role,
        schoolUUID: session.schoolUUID,
        schoolNumericId: session.schoolNumericId,
        schoolName: session.schoolName,
        userId: session.userId,
        uniqueId: session.uniqueId,
        userRole: session.userRole ?? null,
        roleId: session.roleId ?? null,
      }
    : null;

  return { status, session, context, menu, logoUrl, ready };
}

export function DashboardProvider({ role = "student", children }) {
  const value = useResolveDashboardContext({ role });
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  const value = useContext(DashboardContext);
  if (value === null) {
    throw new Error("useDashboardContext must be used within a DashboardProvider");
  }
  return value;
}
