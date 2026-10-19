/**
 * Student dashboard navigation helpers — the left-sidebar module list comes
 * ONLY from the dynamic DB-driven menu endpoint (getDashboardMenu →
 * mapBackendMenu below), the faithful copy of the Java USER_RIGHTS sidebar.
 * There is no static fallback list.
 *
 * `icon` is a string key resolved to a lucide-react component in
 * components/dashboard/Sidebar.jsx. `module` is the legacy module hint
 * (for later rights-mapping/traceability). An item with `children` renders as
 * an expandable group (accordion).
 */

export function dashboardBasePath(school, role = "student") {
  return `/${school}/${role}`;
}

// Full href for a student nav item ("" = the home/landing page).
export function studentNavHref(school, segment) {
  const base = dashboardBasePath(school, "student");
  return segment ? `${base}/${segment}` : base;
}

/**
 * Maps the backend RoleAndModuleAssignDTO (from the EXISTING endpoint
 * POST /api/v1/module-details -> ModulesUtil.getRoleAssignModuleList) onto the
 * sidebar item shape. Field names match the Java DTOs exactly:
 *   RoleAndModuleAssignDTO { roleAndModuleDTO: RoleAndModuleDTO[] }
 *   RoleAndModuleDTO { moduleId, moduleName, moduleIcon, pageLink, orderSet,
 *                      activated, added, updated, viewed, deleted,
 *                      chiledRoleModulesDTO: RoleModulesDTO[] }  (typo is in the DTO)
 * Returns null when the payload is missing/empty (callers treat that as "no menu").
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

// pageLinks that only ever belong to teacher/counselor/admin roles in the
// legacy JSP (DashboardLeftSideContentSchool.jsp child-level switch) — the
// backend normally wouldn't assign these to a STUDENT's role/module list at
// all, but this hides them defensively if it ever does. `teacher-feedback`/
// `ptm` are gated on isDemoUser in the JSP, which this app has no concept of,
// so they're always hidden here.
const STUDENT_HIDDEN_SEGMENTS = new Set([
  "teacher-tips-educator",
  "teacher-login-details",
  "COUNS1a",
  "COUNS1b",
  "manage-user-list",
  "counselor-enrollment-list",
  "add-student-enrollment",
  "teacher-feedback",
  "ptm",
]);

/**
 * Re-applies, for the STUDENT role, the item-level visibility/label rules
 * that DashboardLeftSideContentSchool.jsp encodes as pageLink-keyed JSTL
 * conditions — rules the role-assigned menu (mapBackendMenu) alone can't
 * express because they depend on student-profile data, not module rights.
 * `details` is the GET-demo-dashboard-user-details payload (see
 * services/dashboardApi.js's getDashboardUserDetails); `schoolNumericId`
 * mirrors the JSP's SCHOOL_ID.
 *
 * Field mapping (confirmed against CommonController.getDemoDashboardUserDetails):
 *   - `signupMode` (studentStandard.getRegistrationType(): "ONE_TO_ONE"/"BATCH")
 *     is the JSP's `learningProgram`. NOT `isAllSubjectofBatch`, which is a
 *     different, per-subject eligibility flag (commonUtil.eligibleForOneToOneSession).
 *   - `signupType` (user.getSignupType(): "Online"/"Offline") is the JSP's
 *     SIGNUP_TYPE. NOT `signupMode` — easy to confuse since both are
 *     enrollment-shaped strings, but they're unrelated fields.
 */
export function applyStudentNavRules(menu, details = {}, { schoolNumericId } = {}) {
  if (!Array.isArray(menu)) return menu;

  const providerId = details.providerId;
  const userStandard = details.userStandard;
  const isBatchProgram = String(details.signupMode || "").toUpperCase() === "BATCH";
  const examSheetUploaded = details.examSheetUploaded === "Y";
  const transcriptVisible = !details.showTranscriptToStudent || details.showTranscriptToStudent === "Y";
  const isOnlineSignup = String(details.signupType || "").toLowerCase() === "online";
  const reportsAllowed = providerId !== 39 && userStandard !== 8;

  const isItemVisible = (item) => {
    switch (item.segment) {
      case "teacher-feedback":
      case "ptm":
        return false;
      case "batch-schedule":
        return isBatchProgram;
      case "fee-details":
        return isOnlineSignup;
      case "batch-student-examination-sheet":
        return isBatchProgram && examSheetUploaded;
      case "student-transcript":
      case "parent-student-transcript":
        return transcriptVisible;
      case "academic-year-extention":
        return reportsAllowed;
      default:
        return true;
    }
  };

  const withLabelOverride = (item) => {
    if ((item.segment === "evaluation-test-form-details" || item.segment === "student-id-card") && schoolNumericId !== 1) {
      return { ...item, label: "Evaluation Test" };
    }
    return item;
  };

  return menu
    .filter((item) => {
      // The JSP only extra-gates the group literally named "Reports" (every
      // other expandable group — Language Club, Social Club, ... — passes
      // through ungated); it identifies that group by pageLink "#" + moduleName.
      if (item.segment === "#" && /^reports$/i.test(item.label || "")) return reportsAllowed;
      return isItemVisible(item);
    })
    .map(withLabelOverride)
    .map((item) => {
      if (!item.children?.length) return item;
      const children = item.children
        .filter((c) => !STUDENT_HIDDEN_SEGMENTS.has(c.segment) && (c.segment !== "batch-schedule" || isBatchProgram))
        .map(withLabelOverride);
      return { ...item, children };
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
