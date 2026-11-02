"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { DashboardProvider, useDashboardContext } from "@/hooks/useDashboardContext";
import { useDashboardSessionExpiry } from "@/hooks/useDashboardSessionExpiry";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { rememberDashboardPath } from "@/utils/lastDashboardPath";

// Needs the dashboard context (schoolUUID), so it lives inside DashboardProvider.
function SessionExpiryWatcher() {
  const { context } = useDashboardContext();
  useDashboardSessionExpiry(context?.schoolUUID);
  return null;
}

// Keeps the current dashboard route so a bare /{school} visit comes back here (app/[school]/page.jsx).
function LastPathRecorder() {
  const pathname = usePathname();
  useEffect(() => {
    rememberDashboardPath(pathname);
  }, [pathname]);
  return null;
}

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
      <SessionExpiryWatcher />
      <LastPathRecorder />
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
