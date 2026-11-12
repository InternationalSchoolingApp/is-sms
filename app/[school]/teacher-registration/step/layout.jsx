import { TeacherWizardChrome } from "./TeacherWizardChrome";

// Server Component layout for the teacher registration wizard. It mounts the shared wizard shell exactly once (via
// the client TeacherWizardChrome) around every step route, so the shell persists across step navigation instead of
// remounting per step. Step pages render only their own content as children.
export default function TeacherWizardLayout({ children }) {
  return <TeacherWizardChrome>{children}</TeacherWizardChrome>;
}
