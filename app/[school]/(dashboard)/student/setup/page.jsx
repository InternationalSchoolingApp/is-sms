import { OnboardingSetup } from "@/components/onboarding/OnboardingSetup";

// Dashboard Setup (Academic Year Start Date / School System Training) - the legacy /common/dashboard-setup page.
// Overrides the student/[...module] catch-all; DashboardChrome gives it the plain onboarding frame, no gate.
export default function SetupPage() {
  return <OnboardingSetup />;
}
