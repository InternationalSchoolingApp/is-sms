"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { DashboardProvider, useDashboardContext } from "@/hooks/useDashboardContext";
import { useDashboardSessionExpiry } from "@/hooks/useDashboardSessionExpiry";
import { useNavigationSessionGuard } from "@/hooks/useNavigationSessionGuard";
import { useOnboardingGate } from "@/hooks/useOnboardingGate";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";
import { DashboardLoadingSkeleton } from "@/components/dashboard/DashboardLoadingSkeleton";
import { SessionExpiredDialog } from "@/components/providers/SessionExpiredDialog";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { K5Shell } from "@/components/k5/K5Shell";
import { rememberDashboardPath } from "@/utils/lastDashboardPath";
import { DeviceIntro } from "@/components/device-intro/DeviceIntro";

// Needs the dashboard context (schoolUUID), so it lives inside DashboardProvider.
function SessionExpiryWatcher() {
  const { context } = useDashboardContext();
  useDashboardSessionExpiry(context?.schoolUUID);
  // Logged out in another tab: this tab shows the dialog instead of failing on the next menu click.
  useNavigationSessionGuard(context?.uniqueId);
  return null;
}

// The tab title of every dashboard page: "<student name> | Dashboard" ("Dashboard" until the name is known). The root
// layout's PageTitle only knows the enrollment titles, so the dashboard sets its own; the pathname is a dependency so
// the title is put back after every navigation inside the dashboard.
function DashboardTitle() {
  const { context } = useDashboardContext();
  const pathname = usePathname();
  const name = String(context?.userName || "").trim();
  useEffect(() => {
    if (isOnboardingPath(pathname)) return;
    document.title = name ? `${name} | Dashboard` : "Dashboard";
  }, [name, pathname]);
  return null;
}

// Same URLs for every grade: a Grade K–5 student (isK5) gets the K–5 chrome, everyone else
// the existing shell. Holds the loader until the grade band is known, so neither shell flashes.
function ShellForGrade({ children }) {
  const { ready, gradeResolved, isK5 } = useDashboardContext();
  if (!ready || !gradeResolved) return <DashboardLoadingSkeleton />;
  return isK5 ? <K5Shell>{children}</K5Shell> : <DashboardShell>{children}</DashboardShell>;
}

// Steps a student must finish before the dashboard (time zone, overdue fee, Dashboard Setup): holds the
// loader while checking and sends the student there instead of rendering the dashboard (hooks/useOnboardingGate.js).
function OnboardingGate({ role, children }) {
  const { context } = useDashboardContext();
  const { checking, redirecting } = useOnboardingGate({ context, enabled: role === "student" });
  if (checking || redirecting) return <DashboardLoadingSkeleton />;
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
      <DashboardTitle />
      {/* Once per login: the real dashboard is shown on the screen of a 3D device, which then grows to fill the viewport
          (components/device-intro/DeviceIntro.jsx). Other roles render the body as it was. */}
      {role === "student" ? (
        <DeviceIntro>
          <DashboardBody role={role}>{children}</DashboardBody>
        </DeviceIntro>
      ) : (
        <DashboardBody role={role}>{children}</DashboardBody>
      )}
    </DashboardProvider>
  );
}
