"use client";

import { useDashboardContext } from "@/hooks/useDashboardContext";

/**
 * Gates children by the current user's module rights — the React counterpart of
 * the legacy JSP <c:if test="${roleAndModule.added}"> button/menu guards.
 *
 * Rights come from the dynamic menu item (mapBackendMenu carries
 * rights.{view,add,update,delete}). When no matching menu item is found (menu
 * not loaded yet, or the module isn't in it), `fallback` (default: allow)
 * decides.
 *
 * IMPORTANT: this is UI-only convenience. The backend must remain the
 * authoritative authorization boundary (see the migration plan §18).
 *
 * Usage: <PermissionGate module="student-task" right="add"> ...button... </PermissionGate>
 */
export function PermissionGate({ module, right = "view", fallback = true, children }) {
  const { menu } = useDashboardContext();
  const item = menu?.find((m) => m.module === module || m.segment === module);

  // No rights info available (static fallback menu / unknown module) -> use `fallback`.
  if (!item?.rights) return fallback ? <>{children}</> : null;

  return item.rights[right] ? <>{children}</> : null;
}

/** Imperative check for logic (not rendering). Same semantics as the component. */
export function useHasPermission(module, right = "view", fallback = true) {
  const { menu } = useDashboardContext();
  const item = menu?.find((m) => m.module === module || m.segment === module);
  if (!item?.rights) return fallback;
  return Boolean(item.rights[right]);
}
