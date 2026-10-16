/**
 * Student dashboard navigation — the left-sidebar module list.
 *
 * Labels/order/grouping mirror the LEGACY Java student dashboard exactly
 * (DashboardLeftSideContentSchool.jsp / the student MODULES). This is the
 * STATIC fallback used until the dynamic DB-driven menu endpoint
 * (getDashboardMenu → mapBackendMenu) exists; once it does, the sidebar
 * switches to it with no component change.
 *
 * RE-ENROLLMENT IS DELIBERATELY EXCLUDED (separate branch). Do not add it.
 *
 * `icon` is a string key resolved to a lucide-react component in
 * components/dashboard/Sidebar.jsx. `module` is the legacy module hint
 * (for later rights-mapping/traceability). An item with `children` renders as
 * an expandable group (accordion). An item with `expandable: true` but no
 * children yet (the Clubs) is a plain link for now — its real children come
 * from the dynamic menu once that endpoint is added.
 */

export function dashboardBasePath(school, role = "student") {
  return `/${school}/${role}`;
}

// Full href for a student nav item ("" = the home/landing page).
export function studentNavHref(school, segment) {
  const base = dashboardBasePath(school, "student");
  return segment ? `${base}/${segment}` : base;
}

export const STUDENT_NAV = [
  { key: "home", label: "My Dashboard", segment: "", icon: "dashboard", module: "student-dashboard" },
  { key: "school-calendar", label: "My School Calendar", segment: "school-calendar", icon: "calendar", module: "my-school-calendar" },
  { key: "assigned-teacher", label: "My Assigned Teacher", segment: "assigned-teacher", icon: "teacher", module: "my-assigned-teacher" },
  { key: "book-classes", label: "Book Classes", segment: "book-classes", icon: "book-class", module: "book-classes" },
  { key: "buy-extra-classes", label: "Buy Extra Classes", segment: "buy-extra-classes", icon: "cart", module: "buy-extra-classes" },
  { key: "attendance", label: "My Attendance", segment: "attendance", icon: "attendance", module: "my-attendance" },
  {
    key: "academic-reports",
    label: "Academic Reports",
    icon: "chart",
    module: "academic-reports",
    children: [
      { key: "performance", label: "My Performance", segment: "performance", icon: "chart", module: "my-performance" },
      { key: "progress-reports", label: "My Progress Reports", segment: "progress-reports", icon: "file", module: "my-progress-reports" },
    ],
  },
  {
    key: "language-club",
    label: "Language Club",
    icon: "globe",
    module: "language-club",
    children: [
      { key: "lc-spanish", label: "Spanish", segment: "language-club/spanish", module: "language-club-spanish" },
      { key: "lc-french", label: "French", segment: "language-club/french", module: "language-club-french" },
      { key: "lc-german", label: "German", segment: "language-club/german", module: "language-club-german" },
      { key: "lc-english", label: "English", segment: "language-club/english", module: "language-club-english" },
      { key: "lc-chinese", label: "Chinese", segment: "language-club/chinese", module: "language-club-chinese" },
    ],
  },
  {
    key: "social-club",
    label: "Social Club",
    icon: "social",
    module: "social-club",
    children: [
      { key: "sc-student-council", label: "Student Council", segment: "social-club/student-council", module: "social-club-student-council" },
      { key: "sc-debate", label: "The Debate Club", segment: "social-club/debate-club", module: "social-club-debate-club" },
      { key: "sc-book", label: "The Book Club", segment: "social-club/book-club", module: "social-club-book-club" },
      { key: "sc-art", label: "The Art Club", segment: "social-club/art-club", module: "social-club-art-club" },
      { key: "sc-stem", label: "The STEM Club", segment: "social-club/stem-club", module: "social-club-stem-club" },
      { key: "sc-gaming", label: "The Gaming Club", segment: "social-club/gaming-club", module: "social-club-gaming-club" },
      { key: "sc-law", label: "The Law Club", segment: "social-club/law-club", module: "social-club-law-club" },
      { key: "sc-global-exchange", label: "The Global Exchange Club", segment: "social-club/global-exchange-club", module: "social-club-global-exchange-club" },
      { key: "sc-wellness", label: "The Wellness Club", segment: "social-club/wellness-club", module: "social-club-wellness-club" },
      { key: "sc-newsletter", label: "The Newsletter", segment: "social-club/newsletter", module: "social-club-newsletter" },
      { key: "sc-entrepreneurship", label: "The Entrepreneurship Club", segment: "social-club/entrepreneurship-club", module: "social-club-entrepreneurship-club" },
    ],
  },
  {
    key: "esports-club",
    label: "E-Sports Club",
    icon: "game",
    module: "esports-club",
    children: [
      { key: "es-global-competitions", label: "Global Competitions", segment: "esports-club/global-competitions", module: "esports-club-global-competitions" },
      { key: "es-game-strategy", label: "Game Strategy & Analysis", segment: "esports-club/game-strategy-analysis", module: "esports-club-game-strategy-analysis" },
      { key: "es-focus-reaction", label: "Focus & Reaction Training", segment: "esports-club/focus-reaction-training", module: "esports-club-focus-reaction-training" },
      { key: "es-skill-development", label: "Skill Development", segment: "esports-club/skill-development", module: "esports-club-skill-development" },
      { key: "es-team-communication", label: "Team Communication", segment: "esports-club/team-communication", module: "esports-club-team-communication" },
      { key: "es-online-tournaments", label: "Online Tournaments", segment: "esports-club/online-tournaments", module: "esports-club-online-tournaments" },
      { key: "es-strategy-games", label: "Strategy Games", segment: "esports-club/strategy-games", module: "esports-club-strategy-games" },
      { key: "es-competitive-gaming", label: "Competitive Gaming", segment: "esports-club/competitive-gaming", module: "esports-club-competitive-gaming" },
    ],
  },
  { key: "fee-details", label: "My Fee Details", segment: "fee-details", icon: "fee", module: "my-fee-details" },
  { key: "handbook", label: "Student Handbook", segment: "handbook", icon: "handbook", module: "student-handbook" },
  { key: "login-history", label: "My Log in History", segment: "login-history", icon: "history", module: "my-login-history" },
];

/**
 * Maps the backend RoleAndModuleAssignDTO (from the EXISTING endpoint
 * POST /api/v1/module-details -> ModulesUtil.getRoleAssignModuleList) onto the
 * sidebar item shape. Field names match the Java DTOs exactly:
 *   RoleAndModuleAssignDTO { roleAndModuleDTO: RoleAndModuleDTO[] }
 *   RoleAndModuleDTO { moduleId, moduleName, moduleIcon, pageLink, orderSet,
 *                      activated, added, updated, viewed, deleted,
 *                      chiledRoleModulesDTO: RoleModulesDTO[] }  (typo is in the DTO)
 * Returns null when the payload is missing/empty so callers fall back to STUDENT_NAV.
 */
export function mapBackendMenu(dto) {
  const list = dto?.roleAndModuleDTO;
  if (!Array.isArray(list) || list.length === 0) return null;

  const mapChild = (c) => {
    const pageLink = String(c.pageLink || "").replace(/^\/+/, "");
    return {
      key: String(c.moduleId ?? pageLink),
      label: c.moduleName || pageLink,
      segment: pageLink || deriveSegment(c.moduleName),
      module: pageLink || c.moduleName,
      rights: mapRights(c),
    };
  };

  return list.filter(isActiveModule).map((m) => {
    const pageLink = String(m.pageLink || "").replace(/^\/+/, "");
    const kids = Array.isArray(m.chiledRoleModulesDTO) ? m.chiledRoleModulesDTO.filter(isActiveModule).map(mapChild) : [];
    return {
      key: String(m.moduleId ?? pageLink),
      label: m.moduleName || pageLink,
      segment: pageLink || deriveSegment(m.moduleName),
      icon: iconForLabel(m.moduleName, pageLink),
      module: pageLink || m.moduleName,
      children: kids.length ? kids : undefined,
      rights: mapRights(m),
    };
  });
}

function isActiveModule(m) {
  return m && (m.activated == null || m.activated === "Y" || m.activated === true);
}

function mapRights(m) {
  return { view: truthy(m.viewed), add: truthy(m.added), update: truthy(m.updated), delete: truthy(m.deleted) };
}

// Best-effort icon for a dynamic (DB) module, keyed off its name/pageLink, using
// the same lucide keys as the static nav. Falls back to a neutral dot.
function iconForLabel(name, pageLink) {
  const s = `${name || ""} ${pageLink || ""}`.toLowerCase();
  if (s.includes("dashboard")) return "dashboard";
  if (s.includes("calendar")) return "calendar";
  if (s.includes("assigned") || s.includes("teacher")) return "teacher";
  if (s.includes("book") && s.includes("class")) return "book-class";
  if (s.includes("buy") || s.includes("extra")) return "cart";
  if (s.includes("attendance")) return "attendance";
  if (s.includes("progress")) return "file";
  if (s.includes("academic") || s.includes("performance") || s.includes("report")) return "chart";
  if (s.includes("language")) return "globe";
  if (s.includes("social")) return "social";
  if (s.includes("sport") || s.includes("game")) return "game";
  if (s.includes("fee")) return "fee";
  if (s.includes("handbook")) return "handbook";
  if (s.includes("history") || s.includes("log in") || s.includes("login")) return "history";
  return "dot";
}

function deriveSegment(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function truthy(v) {
  return v === "Y" || v === true || v === 1 || v === "1";
}
