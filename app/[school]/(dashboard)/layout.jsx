import { DashboardChrome } from "./DashboardChrome";

// Server Component layout for the role dashboard route group. Mounts the shared
// DashboardChrome (context + shell) exactly once around every module route, so
// the shell persists across navigation. Module pages render only their own
// content as children. Role is "student" for Phase A (the only migrated role).
export default function DashboardLayout({ children }) {
  return <DashboardChrome role="student">{children}</DashboardChrome>;
}
