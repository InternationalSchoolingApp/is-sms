import { AddEnrollmentChrome } from "./AddEnrollmentChrome";

// Server Component layout — mounts AddEnrollmentChrome once around every
// step route, same pattern as the main enrollment wizard's step/layout.jsx.
export default function AddEnrollmentWizardLayout({ children }) {
  return <AddEnrollmentChrome>{children}</AddEnrollmentChrome>;
}
