"use client";

import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ParentGreetingBanner } from "@/components/parent/home/ParentGreetingBanner";
import { ChildOverviewCard } from "@/components/parent/home/ChildOverviewCard";
import { PerformanceOverview } from "@/components/parent/home/PerformanceOverview";
import { UpcomingSchedule } from "@/components/parent/home/UpcomingSchedule";
import { PaymentsDueCard } from "@/components/parent/home/PaymentsDueCard";
import { ParentMobileBar } from "@/components/parent/home/ParentMobileBar";
import { ParentAppInstallPrompt } from "@/components/parent/profile/ParentAppInstallPrompt";
import { useParentChildOverview } from "@/hooks/parent/useParentHome";

/**
 * Parent dashboard home: the selected child's home (the child tabs sit above it, in parent/layout.jsx) (legacy
 * parentDashboardContent.js): the overview card with KPIs and the performance charts on the left, today's
 * classes and the due payments on the right. Announcements, diary and chat are the shell's right rail, which
 * follows the selected child. On a phone the two right-hand cards move behind the bottom bar.
 */
export function ParentHome() {
  return (
    <ParentChildRequired>
      <SelectedChildHome />
    </ParentChildRequired>
  );
}

function SelectedChildHome() {
  const overview = useParentChildOverview();
  const withClass = overview.details?.activitiesWithClass !== false;

  return (
    <div className="mx-auto max-w-7xl">
      <ParentGreetingBanner />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {overview.isLoading ? (
            <div className="space-y-4" aria-busy="true">
              <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
            </div>
          ) : overview.failed ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-black/70">We could not load this child&apos;s overview.</p>
              <button type="button" onClick={overview.retry} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Try again
              </button>
            </div>
          ) : (
            <>
              <ChildOverviewCard details={overview.details} />
              <PerformanceOverview details={overview.details} />
            </>
          )}
        </div>
        <div className="space-y-5 max-sm:hidden">
          <UpcomingSchedule withClass={withClass} />
          <PaymentsDueCard />
        </div>
      </div>
      <ParentMobileBar withClass={withClass} />
      {/* Legacy opens the app-install prompt from the parent home (school 1, not an installed app, not closed in the last 7 days, app not in use). */}
      <ParentAppInstallPrompt />
    </div>
  );
}
