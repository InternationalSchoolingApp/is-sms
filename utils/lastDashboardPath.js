/**
 * Where a logged-in user last was inside the dashboard, so the bare /{school} URL can take them
 * back there instead of out to the school's public website. Written by the dashboard on every
 * route change (plain cookie: the /{school} page is a Server Component and reads it there).
 */
export const LAST_DASHBOARD_PATH_COOKIE = "last_dashboard_path";

const DASHBOARD_ROLES = ["student"];

/**
 * The stored path, only if it is a dashboard route of this school — a same-origin relative path
 * like /{school}/student/student-handbook with plain segments (no "//", "..", query or scheme),
 * so the cookie can never turn the redirect into an open redirect. Falls back to the role home.
 */
export function safeDashboardPath(path, school) {
  let value = "";
  try {
    value = typeof path === "string" ? decodeURIComponent(path) : "";
  } catch {
    // malformed cookie value: fall through to the role home
  }
  const prefix = DASHBOARD_ROLES.map((role) => `/${school}/${role}`).find((p) => value === p || value.startsWith(`${p}/`));
  if (prefix && /^(\/[A-Za-z0-9_-]+)+$/.test(value)) return value;
  return `/${school}/student`;
}

/** Client-only write, called by the dashboard shell with the current pathname. */
export function rememberDashboardPath(pathname) {
  if (typeof document === "undefined" || !pathname) return;
  document.cookie = `${LAST_DASHBOARD_PATH_COOKIE}=${encodeURIComponent(pathname)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}
