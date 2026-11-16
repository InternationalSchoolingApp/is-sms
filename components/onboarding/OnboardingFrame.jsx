"use client";

import { FullScreenLoader } from "@/components/common/Loader";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { logoutEverywhere } from "@/utils/logout";

/** 
 * Frame of the onboarding pages (Welcome; later Dashboard Setup): the school logo, the student's name and
 * Log Off on top, the copyright footer below - no dashboard sidebar or header, like the legacy
 * AdditionalLayerAtLogin.jsp.
 */
export function OnboardingFrame({ children }) {
  const { session, context, logoUrl, ready } = useDashboardContext();
  if (!ready || !context) return <FullScreenLoader />;
  return (
    <OnboardingShell
      schoolName={context.schoolName}
      logoUrl={logoUrl}
      studentName={context.userName}
      onLogout={() => logoutEverywhere(session)}
    >
      {children}
    </OnboardingShell>
  );
}
