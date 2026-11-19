"use client";

import { K5_CARD } from "@/components/k5/home/k5Bits";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { K5MyGoalsCard } from "@/components/k5/pages/K5PerformanceGoals";
import { asArray } from "@/components/k5/pages/k5PerformanceData";
import { ZoomIn } from "@/components/motion/ZoomIn";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useMyGoals } from "@/hooks/useMyGoals";
import { useStudentAcademicPerformance } from "@/hooks/useStudentAcademicPerformance";

/**
 * "My goals" on the home page, right above the Today / Week / Month planner. The very same card as My Performance's
 * My Goals tab (K5MyGoalsCard), fed by the same existing call and cache (useStudentAcademicPerformance with
 * k5Performance), so a goal saved here shows there and the other way round. Students whose course provider has no
 * performance data (the page itself shows the old table for them) get nothing here.
 */
export function K5HomeGoals() {
  const { context } = useDashboardContext();
  const { isLoading, performance } = useStudentAcademicPerformance({ schoolUUID: context?.schoolUUID, userId: context?.userId, k5Performance: true });
  const { goals, saveGoals } = useMyGoals(performance);

  if (!context || isLoading) return <HomeGoalsSkeleton />;
  if (!performance) return null;

  const firstName = String(context?.userName || "").split(" ")[0] || "";
  return (
    <ZoomIn>
      <K5MyGoalsCard
        goals={goals}
        avg={performance.tiles?.avgScore ?? null}
        courses={asArray(performance.courses)}
        today={performance.today}
        initial={firstName.charAt(0).toUpperCase()}
        onSave={saveGoals}
        compareAvailable={performance.compareAvailable === true}
      />
    </ZoomIn>
  );
}

/** Shaped like the card: title and button, the aim banner, the score and completion boxes. */
function HomeGoalsSkeleton() {
  return (
    <K5Loading label="Loading your goals" className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
      <div className="flex items-center gap-3">
        <K5Sk className="h-7 w-32" />
        <K5Sk className="ms-auto h-[46px] w-40 rounded-full" />
      </div>
      <K5Sk className="h-[110px] w-full rounded-[22px]" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3.5">
        <K5Sk className="h-[140px] rounded-[22px]" />
        <K5Sk className="h-[140px] rounded-[22px]" />
      </div>
    </K5Loading>
  );
}
