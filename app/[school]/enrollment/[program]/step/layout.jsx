import { WizardChrome } from "./WizardChrome";

// Server Component layout for the enrollment wizard. It mounts the shared
// EnrollmentWizardShell exactly once (via the client WizardChrome) around
// every step route, so the shell persists across step navigation instead of
// remounting per step. Step pages render only their own content as children.
export default function WizardLayout({ children }) {
  return <WizardChrome>{children}</WizardChrome>;
}
