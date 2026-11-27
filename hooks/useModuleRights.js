"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getModuleRights } from "@/services/dashboardApi";

// The sidebar menu carries each module's id (key) next to its pageLink (module).
function findModuleId(menu, pageLink) {
  for (const item of menu) {
    if (item.module === pageLink) return item.key;
    const child = item.children?.find((c) => c.module === pageLink);
    if (child) return child.key;
  }
  return null;
}

/**
 * A dashboard module's rights for this user — legacy adminController.getContent() loads them
 * (getUserRights -> /api/v1/module) before rendering any module, and pages gate actions on
 * them (e.g. roleAndModule.viewed). The module id comes from the sidebar menu by pageLink.
 *
 * waiting: menu or rights still loading. canView: rights.viewed === "Y" (false when the module
 * isn't in this user's menu at all).
 */
export function useModuleRights(pageLink) {
  const { context, menu } = useDashboardContext();
  const { schoolUUID, schoolNumericId, roleId, userId } = context ?? {};
  const moduleId = findModuleId(menu, pageLink);

  const query = useQuery({
    queryKey: ["module-rights", schoolUUID, roleId, userId, moduleId],
    queryFn: () => getModuleRights({ schoolUUID, schoolId: schoolNumericId, roleId, userId, moduleId }),
    enabled: Boolean(schoolUUID && schoolNumericId && roleId && moduleId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const waiting = !menu.length || Boolean(moduleId && query.isLoading);
  return { waiting, moduleId, rights: query.data, canView: Boolean(moduleId) && query.data?.viewed === "Y" };
}
