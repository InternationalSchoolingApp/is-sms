import { DashboardChrome } from "./DashboardChrome";
import { getAccountSession } from "@/lib/auth/session";

// Server Component layout for the role dashboard route group. Mounts the shared
// DashboardChrome (context + shell) exactly once around every module route, so
// the shell persists across navigation. Module pages render only their own
// content as children.
//
// One layout serves every dashboard role: the role comes from the signed-in
// account's token (claims.role, "STUDENT" / "PARENT" in any case). proxy.js has
// already sent anyone on the wrong role's URL (/student vs /parent) to their own,
// so by here the role matches the route. Anything that is not a parent stays on
// the student chrome, as before.
export default async function DashboardLayout({ children }) {
  const session = await getAccountSession();
  const role = String(session?.role ?? "").toLowerCase() === "parent" ? "parent" : "student";
  return <DashboardChrome role={role}>{children}</DashboardChrome>;
}
