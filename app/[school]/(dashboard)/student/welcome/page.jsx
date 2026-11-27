import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";

// Steps before the dashboard (Confirm Your Time Zone, overdue fee) - the legacy /show-additional-layer page.
// Overrides the student/[...module] catch-all; DashboardChrome gives it the plain onboarding frame, no gate.
export default function WelcomePage() {
  return <OnboardingWelcome />;
}
