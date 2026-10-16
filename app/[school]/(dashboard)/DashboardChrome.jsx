"use client";

import { DashboardProvider } from "@/hooks/useDashboardContext";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

/**
 * Client wrapper that mounts the dashboard context once and wraps every module
 * page in the shared shell — the dashboard counterpart of the wizard's
 * WizardChrome. Placed in the (dashboard) route-group layout so navigating
 * between modules does not remount the shell/context.
 *
 * `role` is fixed to "student" for Phase A (the only migrated role). When more
 * roles are added, resolve it from the route segment / session here.
 */
export function DashboardChrome({ role = "student", children }) {
  return (
    <DashboardProvider role={role}>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
