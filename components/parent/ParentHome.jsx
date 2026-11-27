"use client";

import { Loader } from "@/components/common/Loader";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { HomeTopRow } from "@/components/parent/home/HomeTopRow";
import { ChildBlueTile, ChildKpiTrio } from "@/components/parent/home/ChildOverviewCard";
import { PerformanceOverview } from "@/components/parent/home/PerformanceOverview";
import { UpcomingSchedule } from "@/components/parent/home/UpcomingSchedule";
import { PaymentsDueCard } from "@/components/parent/home/PaymentsDueCard";
import { LiveClassPopup } from "@/components/parent/home/LiveClassPopup";
import { ParentAppInstallPrompt } from "@/components/parent/profile/ParentAppInstallPrompt";
import { firstName } from "@/components/parent/childLabels";
import { useParentChildOverview } from "@/hooks/parent/useParentHome";

/**
 * Parent dashboard home: the selected child's home in the parent theme (design board bento; legacy
 * parentDashboardContent.js for the data). Left: the child tile, today's classes and the due payments. Right: the
 * Attendance / Courses / Performance tiles and the performance chart. Announcements, diary and chat are the shell's
 * right rail, which follows the selected child.
 */
export function ParentHome() {
  return (
    <ParentChildRequired>
      <SelectedChildHome />
    </ParentChildRequired>
  );
}

function SelectedChildHome() {
  const { selectedChild } = useSelectedChild();
  const overview = useParentChildOverview();
  const withClass = overview.details?.activitiesWithClass !== false;
  const childName = firstName(overview.details?.student?.studentName || selectedChild?.studentName);

  return (
    <>
      <HomeTopRow />
      <div className="bento">
        <div className="col cl">
          <ChildBlueTile details={overview.details} />
          <UpcomingSchedule withClass={withClass} childName={childName} />
          <PaymentsDueCard />
        </div>
        <div className="col cr">
          {overview.isLoading ? (
            <div className="tile flex min-h-[420px] items-center justify-center" role="status" aria-busy="true">
              <Loader />
            </div>
          ) : overview.failed ? (
            <div className="tile text-center">
              <p className="m-0 text-sm">We could not load this child&apos;s overview.</p>
              <button type="button" onClick={overview.retry} className="btn mt-3">
                Try again
              </button>
            </div>
          ) : (
            <>
              <ChildKpiTrio details={overview.details} />
              <PerformanceOverview details={overview.details} />
            </>
          )}
        </div>
      </div>
      <LiveClassPopup />
      {/* Legacy opens the app-install prompt from the parent home (school 1, not an installed app, not closed in the last 7 days, app not in use). */}
      <ParentAppInstallPrompt />
    </>
  );
}
