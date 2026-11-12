"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ParentChildProvider } from "@/hooks/parent/useSelectedChild";
import { DashboardProvider, useDashboardContext } from "@/hooks/useDashboardContext";
import { useDashboardSessionExpiry } from "@/hooks/useDashboardSessionExpiry";
import { useOnboardingGate } from "@/hooks/useOnboardingGate";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";
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

// Steps a student must finish before the dashboard (time zone, overdue fee, Dashboard Setup): holds the
// loader while checking and sends the student there instead of rendering the dashboard (hooks/useOnboardingGate.js).
function OnboardingGate({ role, children }) {
  const { context } = useDashboardContext();
  const { checking, redirecting } = useOnboardingGate({ context, enabled: role === "student" });
  if (checking || redirecting) return <FullScreenLoader />;
  return children;
}

// The onboarding pages (/{school}/student/welcome and /setup) are where the gate sends students, so they get
// neither the gate nor the dashboard shell: just the plain logo / Log Off frame (components/onboarding/OnboardingFrame.jsx).
const isOnboardingPath = (pathname) => /^\/[^/]+\/student\/(welcome|setup)\/?$/.test(pathname || "");

function DashboardBody({ role, children }) {
  const pathname = usePathname();
  if (role === "student" && isOnboardingPath(pathname)) return <OnboardingFrame>{children}</OnboardingFrame>;
  return (
    <OnboardingGate role={role}>
      <ShellForGrade>{children}</ShellForGrade>
    </OnboardingGate>
  );
}

// A parent's pages are each about one child: the selected child is held once, around the shell, so the child
// tabs and every parent page share it (it is not in the URL). Students have no such scope.
function ParentChildScope({ role, children }) {
  if (role !== "parent") return children;
  return <ParentChildProvider>{children}</ParentChildProvider>;
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
 * `role` ("student" | "parent") is resolved from the session by the layout.
 */
export function DashboardChrome({ role = "student", children }) {
  return (
    <DashboardProvider role={role}>
      <SessionExpiryWatcher />
      <SessionExpiredDialog />
      <LastPathRecorder />
      <ParentChildScope role={role}>
        <DashboardBody role={role}>{children}</DashboardBody>
      </ParentChildScope>
    </DashboardProvider>
  );
}
