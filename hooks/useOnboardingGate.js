"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getOnboardingStatus } from "@/services/onboardingGateApi";
import { callServer } from "@/utils/serverCall";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { legacyDashboardUrl } from "@/utils/backendOrigin";

/**
 * Dashboard entry gate: a student with something still to do before the dashboard (Confirm Your Time
 * Zone, overdue fee, Azure user, Academic Year Start Date / School System Training) is sent there first,
 * like the legacy dashboard entry (ClientDashboardStudentController#dashboardStudent) and login do.
 * Without it, a student opening /{school}/student directly (bookmark, new tab) skipped those steps.
 *
 * target: "welcome" (an additional-layer screen) | "setup" (Dashboard Setup) | null (nothing to do).
 *
 * "welcome" opens the Next.js Welcome page (components/onboarding/OnboardingWelcome.jsx), "setup" the Next.js
 * Dashboard Setup page (components/onboarding/OnboardingSetup.jsx); the backend decides with the same rule the
 * legacy pages use (shared DashboardSetupUtil).
 *
 * Not gated here: the sibling school e-mail (Outlook) setup. It has a "Skip for now" stored in a cookie
 * only the Java app reads, so gating it here could bounce a student who skipped it; login and the legacy
 * dashboard entry still show it.
 *
 * Fails open: if the check itself fails the dashboard is shown (the error is logged), never a dead end.
 */

const QUERY_KEY = "onboarding-status";
// A student sent away and straight back still "pending" (backend and gate disagree for some reason) is
// let in instead of bouncing forever. A real loop comes back within seconds (the legacy page SSOs straight
// back), so the window is short: a student who pressed Back from the legacy page later is gated again.
const LOOP_GUARD_MS = 30_000;
const guardKey = (userId) => `onboardingGateRedirect:${userId}`;

function readGuard(userId) {
  try {
    const at = Number(window.sessionStorage.getItem(guardKey(userId)));
    return Number.isFinite(at) ? at : 0;
  } catch {
    return 0;
  }
}

function writeGuard(userId) {
  try {
    window.sessionStorage.setItem(guardKey(userId), String(Date.now()));
  } catch {
    // storage unavailable (private mode): no loop guard, the redirect still works
  }
}

export const ONBOARDING_STATUS_KEY = QUERY_KEY;

// Same order as legacy additionalLayer.js: overdue fee, Azure user, time zone, then Dashboard Setup.
// The Azure user layer is switched off on the backend (its block is commented out in getAddtionalLayer), so it
// has no Next.js screen: "legacy" sends it to the legacy page.
export function onboardingTarget(status) {
  if (!status) return null;
  if (status.paymentOverDue) return "welcome";
  if (status.azureUser) return "legacy";
  if (status.timezone) return "welcome";
  if (status.dashboardSetup) return "setup";
  return null;
}

export const welcomePath = (schoolUUID) => `/${schoolUUID}/student/welcome`;
export const setupPath = (schoolUUID) => `/${schoolUUID}/student/setup`;

/**
 * Where each target lives: { url, external }.
 *   welcome -> /{school}/student/welcome (Next.js)
 *   setup   -> /{school}/student/setup (Next.js Dashboard Setup)
 *   legacy  -> the legacy dashboard entry (Azure user layer, no Next.js screen)
 * External URLs get the loop guard; an internal page can't bounce (it only leaves once its step is done).
 */
export function onboardingDestination(target, context) {
  if (!target || !context?.schoolUUID) return null;
  if (target === "welcome") return { url: welcomePath(context.schoolUUID), external: false };
  if (target === "setup") return { url: setupPath(context.schoolUUID), external: false };
  const url = legacyDashboardUrl(context.schoolUUID, context.uniqueId);
  return url ? { url, external: true } : null;
}

export function useOnboardingGate({ context, enabled = true }) {
  const router = useRouter();
  const dummy = useDummyStudent();
  const active = Boolean(enabled && context?.schoolUUID && context?.userId && dummy.settled && !dummy.enabled);

  const query = useQuery({
    queryKey: [QUERY_KEY, context?.schoolUUID, context?.userId],
    queryFn: async () => {
      const status = await callServer(() => getOnboardingStatus());
      // Read with the answer (not during render): a recent redirect for this user means we just came back from it.
      return { ...status, recentlyRedirected: Date.now() - readGuard(context.userId) < LOOP_GUARD_MS };
    },
    enabled: active,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const target = onboardingTarget(query.data);
  const destination = useMemo(() => onboardingDestination(target, context), [target, context]);
  const recentlyRedirected = Boolean(destination?.external && query.data?.recentlyRedirected);
  const redirecting = Boolean(destination) && !recentlyRedirected;

  useEffect(() => {
    if (query.error) console.error("Onboarding check failed, showing the dashboard:", query.error);
  }, [query.error]);

  useEffect(() => {
    if (destination && recentlyRedirected) {
      console.warn(`Onboarding step "${target}" is still pending right after a redirect; showing the dashboard.`);
    }
  }, [destination, recentlyRedirected, target]);

  useEffect(() => {
    if (!redirecting) return;
    if (destination.external) {
      writeGuard(context.userId);
      window.location.replace(destination.url);
    } else {
      router.replace(destination.url);
    }
  }, [redirecting, destination, context?.userId, router]);

  return {
    // Hold the dashboard until we know (dummy mode / not a student: nothing to wait for).
    checking: !dummy.settled || (active && query.isPending),
    redirecting,
    target,
    status: query.data ?? null,
  };
}
