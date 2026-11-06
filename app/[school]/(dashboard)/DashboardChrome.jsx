"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { DashboardProvider, useDashboardContext } from "@/hooks/useDashboardContext";
import { useDashboardSessionExpiry } from "@/hooks/useDashboardSessionExpiry";
import { FullScreenLoader } from "@/components/common/Loader";
import { SessionExpiredDialog } from "@/components/providers/SessionExpiredDialog";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { K5Shell } from "@/components/k5/K5Shell";
import { rememberDashboardPath } from "@/utils/lastDashboardPath";

// Needs the dashboard context (schoolUUID), so it lives inside DashboardProvider.
function SessionExpiryWatcher() {
  const { context } = useDashboardContext();
  useDashboardSessionExpiry(context?.schoolUUID);
  return null;
}

// Same URLs for every grade: a Grade K–5 student (isK5) gets the K–5 chrome, everyone else
// the existing shell. Holds the loader until the grade band is known, so neither shell flashes.
function ShellForGrade({ children }) {
  const { ready, gradeResolved, isK5 } = useDashboardContext();
  if (!ready || !gradeResolved) return <FullScreenLoader />;
  return isK5 ? <K5Shell>{children}</K5Shell> : <DashboardShell>{children}</DashboardShell>;
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
      <SessionExpiredDialog />
      <LastPathRecorder />
      <ShellForGrade>{children}</ShellForGrade>
    </DashboardProvider>
  );
}
