"use client";

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/providers/AuthSessionProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { getDashboardChatLinks, getDashboardMenu, getStudentDashboardDetails, getStudentDemoData } from "@/services/dashboardApi";
import { applyStudentNavRules, mapBackendMenu } from "@/utils/dashboardNav";
import { bandFromStandardId, isK5LearningProgram, isPreKStandard, isSelfStudyProgram, normalizeGradeBand } from "@/utils/gradeBand";
import { isDummyStudentMode } from "@/utils/paymentGatewayChecks";
import { createDummyStudent } from "@/utils/dummyStudent";
import { expireSession } from "@/utils/logout";
import { useStudentName } from "@/hooks/useStudentName";

/**
 * Shared dashboard context, mounted ONCE by the (dashboard) route-group layout
 * (DashboardChrome) and consumed by the shell + every module page — the same
 * pattern as useEnrollmentContext for the wizard. Resolves the current user and
 * school straight from the Auth.js session (no {schoolId} URL param), fetches
 * the branding logo, and resolves the sidebar menu.
 *
 * Sidebar menu: always the dynamic DB-driven menu (getDashboardMenu →
 * mapBackendMenu, the faithful copy of the Java USER_RIGHTS sidebar). Resolves
 * to an empty array until the query settles, so `ready` never blocks on it.
 *
 * NOTE (Phase A): the STUDENT_DASHBOARD_VIA_NEXTJS coexistence toggle and the
 * "redirect to legacy JSP dashboard when off" behavior are intentionally NOT
 * wired here yet — the SETTINGS row does not exist during Phase A, so acting on
 * its empty value would wrongly bounce every student to the legacy dashboard.
 * It is added together with the backend toggle + redirect branch.
 */
const DashboardContext = createContext(null);

// The page's query string after hydration (null on the server) — same reader as useDummyStudent.
const subscribe = () => () => {};
const readSearch = () => window.location.search;
const readSearchOnServer = () => null;

// Last resolved grade band per user, for this tab only (sessionStorage). Read as the raw string so
// the useSyncExternalStore snapshot stays stable; only allowlisted values are trusted back.
const GRADE_CACHE_PREFIX = "is-dashboard-grade:";
function readGradeCache(key) {
  if (!key) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function parseGradeCache(raw) {
  
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    const gradeBand = normalizeGradeBand(value?.gradeBand);
    if (!gradeBand) return null;
    const isK5 = value.isK5 === true && gradeBand === "ELEMENTARY";
    return { gradeBand, isK5, isPreK: isK5 && value.isPreK === true, isSelfStudy: value.isSelfStudy === true };
  } catch {
    return null;
  }
}

/** get-student-dashboard (StudentDetailsDTO) — shared by the grade-band gate and useStudentDashboardData. */
export function studentDashboardDetailsQuery({ schoolUUID, userId }) {
  return {
    queryKey: ["student-dashboard-details", schoolUUID, userId],
    queryFn: () => getStudentDashboardDetails({ schoolUUID, userId }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  };
}

/** A demo account's demo-data row — shared by the grade-band gate and useDummyStudent. */
export function studentDemoRowQuery({ schoolUUID, userId, enabled }) {
  return {
    queryKey: ["student-demo-data", schoolUUID, userId],
    queryFn: async () => {
      const response = await getStudentDemoData({ schoolUUID, userId });
      return String(response?.status) === "1" && Array.isArray(response.details) ? response.details[0] ?? null : null;
    },
    enabled: Boolean(enabled && schoolUUID && userId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  };
}

/**
 * Grade K–5 dashboard gate (docs/migration/grade_k5_dashboard_plan.html, sections 6.1 + 7).
 * Band: backend StudentDetailsDTO.gradeBand, else the standardId mapping, else MIDDLE (never show
 * the kid UI by mistake). Dummy mode takes the dummy grade's standardId and treats the
 * K5_DASHBOARD_ENABLED flag as on. isSelfStudy is content-only, never part of the gate.
 * gradeResolved stays false until the band is known, so the shell can hold its loader — except
 * when this tab already resolved it for the same user (sessionStorage), which is shown at once
 * while get-student-dashboard refreshes it.
 */
function useResolveGradeBand({ role, session, authenticated }) {
  // Re-render on route change so the query string (dummy mode) is read again: module links
  // drop ?dummyStudent, and the shell must follow the same mode as the module pages.
  usePathname();
  
  const search = useSyncExternalStore(subscribe, readSearch, readSearchOnServer);
  const cacheKey = session?.userId ? `${GRADE_CACHE_PREFIX}${session.userId}` : null;
  const cachedRaw = useSyncExternalStore(subscribe, () => readGradeCache(cacheKey), readSearchOnServer);
  const cached = useMemo(() => parseGradeCache(cachedRaw), [cachedRaw]);
  const isStudent = role === "student";
  const demoUser = Boolean(session?.demoUser);
  const dummyEnabled = authenticated && isStudent && search !== null && isDummyStudentMode(demoUser);

  const demoRowQuery = useQuery(studentDemoRowQuery({ schoolUUID: session?.schoolUUID, userId: session?.userId, enabled: dummyEnabled && demoUser }));
  const detailsQuery = useQuery({
    ...studentDashboardDetailsQuery({ schoolUUID: session?.schoolUUID, userId: session?.userId }),
    enabled: authenticated && isStudent && search !== null && !dummyEnabled,
  });

  const demoRow = demoRowQuery.data ?? null;
  const dummyDetails = useMemo(
    () => (dummyEnabled ? createDummyStudent({ row: demoRow, params: new URLSearchParams(search || "") }).dashboardDetails() : null),
    [dummyEnabled, demoRow, search],
  );

  const details = dummyEnabled ? dummyDetails : detailsQuery.data;
  const standardId = details?.standardId ?? null;
  const registrationType = details?.registrationType ?? null;
  const gradeBand = (dummyEnabled ? null : normalizeGradeBand(details?.gradeBand)) ?? bandFromStandardId(standardId) ?? "MIDDLE";
  const k5DashboardEnabled = dummyEnabled || details?.k5DashboardEnabled === true;
  const isK5 = gradeBand === "ELEMENTARY" && k5DashboardEnabled && isK5LearningProgram(registrationType);
  const fetched = authenticated && search !== null && (dummyEnabled ? !demoRowQuery.isLoading : !detailsQuery.isPending);

  const resolved = {
    gradeBand,
    isK5,
    // Sub-flag of the K–5 UI: PreK / Nursery (standardId 17) gets the simpler variant (plan 12.8).
    isPreK: isK5 && isPreKStandard(standardId),
    isSelfStudy: typeof details?.isSelfStudy === "boolean" ? details.isSelfStudy : isSelfStudyProgram(registrationType),
    // The token sign-in carries no role id (only the role name); the dashboard details list the user's
    // role modules, each with that role id (needed by the sidebar menu and module rights).
    roleId: details?.roleAndModuleAssign?.roleAndModuleDTO?.[0]?.roleId ?? null,
    lmsProviderURL: details?.lmsProviderURL ?? "",
    isPayLmsPaymentPending: details?.isPayLmsPaymentPending ?? "",
  };

  // Remember the live (non-dummy) result for this tab, so the next load skips the loader.
  const saveCache = isStudent && fetched && !dummyEnabled && cacheKey ? JSON.stringify(resolved) : null;
  useEffect(() => {
    if (!saveCache) return;
    try {
      window.sessionStorage.setItem(cacheKey, saveCache);
    } catch {
      // storage unavailable (private mode): every load just waits for the band
    }
  }, [cacheKey, saveCache]);

  if (!isStudent) return { ...resolved, gradeResolved: true };
  if (!fetched && !dummyEnabled && authenticated && search !== null && cached) return { ...cached, gradeResolved: true };
  return { ...resolved, gradeResolved: fetched };
}

function useResolveDashboardContext({ role = "student" } = {}) {
  const { data: session, status } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);
  const authenticated = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);
  const queryClient = useQueryClient();

  // Session-expiry guard: a session dropping while the dashboard is open hands
  // the user back to the school's Java login page (proxy.js already blocks
  // unauthenticated navigations server-side; this covers the in-app drop).
  useEffect(() => {
    if (status === "unauthenticated") expireSession(session?.schoolUUID);
  }, [status, session?.schoolUUID]);

  // Before every other query: server actions run one at a time, and the shell waits for this one.
  const grade = useResolveGradeBand({ role, session, authenticated });
  const roleId = session?.roleId ?? grade.roleId ?? null;

  // Dynamic menu (faithful Java sidebar) — the only source for the sidebar now.
  // For students, item-level visibility/labels are then adjusted to match
  // DashboardLeftSideContentSchool.jsp's per-pageLink rules (see
  // applyStudentNavRules), using the student-profile flags from
  // the student's own get-student-dashboard (fee-details needs an Online signup, batch-schedule a BATCH signup).
  const menuQuery = useQuery({
    queryKey: ["dashboard-menu", role, session?.schoolNumericId, roleId, session?.userId],
    queryFn: async () => {
      const [dto, details] = await Promise.all([
        getDashboardMenu({
          schoolUUID: session.schoolUUID,
          schoolId: session.schoolNumericId,
          roleId,
          userId: session.userId,
        }),
        role === "student" ? queryClient.fetchQuery(studentDashboardDetailsQuery({ schoolUUID: session.schoolUUID, userId: session.userId })) : null,
      ]);
      const mapped = mapBackendMenu(dto) ?? [];
      const navDetails = { signupType: details?.signupType, signupMode: details?.registrationType };
      return role === "student" ? applyStudentNavRules(mapped, navDetails, { schoolNumericId: session.schoolNumericId }) : mapped;
    },
    // Waits for the role id (dashboard details) so the menu is not cached empty.
    enabled: authenticated && Boolean(roleId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  // Empty until the query settles, so the sidebar renders (empty) without
  // waiting on the (possibly missing) endpoint.
  const menu = menuQuery.data ?? [];

  // Header "Welcome back, {name}" — the same full name Login History shows (legacy USER_FULL_NAME).
  const studentName = useStudentName({ schoolUUID: session?.schoolUUID, userId: session?.userId, enabled: authenticated && role === "student" });

  // CHAT_URL / DIARY_URL — rarely-changing per-school config, fetched once.
  const chatLinksQuery = useQuery({
    queryKey: ["dashboard-chat-links", session?.schoolUUID, session?.userId],
    queryFn: () => getDashboardChatLinks({ schoolUUID: session.schoolUUID, userId: session.userId }),
    enabled: authenticated,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Branding logo (not carried in the session) — same source as the wizard/login.
  useEffect(() => {
    if (!session?.schoolNumericId) return;
    let cancelled = false;
    getSchoolSettingsLinks(session.schoolNumericId)
      .then((links) => {
        if (!cancelled && links?.logoUrl) setLogoUrl(links.logoUrl);
      })
      .catch((err) => console.error("School links fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.schoolNumericId]);

  const ready = authenticated;

  const context = ready
    ? {
        role,
        schoolUUID: session.schoolUUID,
        schoolNumericId: session.schoolNumericId,
        schoolName: session.schoolName,
        userId: session.userId,
        uniqueId: session.uniqueId,
        userRole: session.userRole ?? session.role ?? null,
        roleId,
        userName: studentName,
        // Demo account (USER.DEMO_USER) — pass to isDummyStudentMode() like legacy isDemoUser.
        demoUser: Boolean(session.demoUser),
        chatUrl: chatLinksQuery.data?.chatUrl || "",
        diaryUrl: chatLinksQuery.data?.diaryUrl || "",
      }
    : null;

  return { status, session, context, menu, logoUrl, ready, ...grade };
}

export function DashboardProvider({ role = "student", children }) {
  
  const value = useResolveDashboardContext({ role });
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardContext() {
  
  const value = useContext(DashboardContext);
  if (value === null) {
    throw new Error("useDashboardContext must be used within a DashboardProvider");
  }
  return value;
}
