"use client";

import { useContext, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardContext } from "@/hooks/useDashboardContext";
import { HAND_HINT_KEY } from "@/components/appearance/AppearanceProvider";

/**
 * Shown while the dashboard context (student, grade band, look) is still loading, in place of the old grey
 * "Almost there" overlay. Neutral colours on purpose: the grade look and the student's theme are not known yet.
 * Same skeleton rule as every module: shadcn/ui Skeleton shaped like the shell (header, left menu, cards, right rail).
 * On the dashboard home page the middle is shaped like that page (hero, Today's Goal, My Performance, My Assignments) - the
 * same blocks as DashboardSkeleton in components/k5/home/K5Dashboard.jsx - so a refresh or a login shows the page it will become;
 * every other page keeps the planner-shaped middle.
 * Left hand ("Menu goes on the right"): the skeleton is mirrored like the page will be (header, menu / rail, dashboard rows) - from
 * the `hand` prop (the shell knows it) or, before that, the student's saved look on this device.
 */
const SK = "bg-slate-200/80";
// Same variant the real shell uses: the root carries data-hand, and rows flip with it (K5Header, K5Dashboard ROW, .k5-layout).
const FLIP = "in-data-[hand=left]:flex-row-reverse";

const noSubscribe = () => () => {};
// The saved look is stored per student ("is-k5-look:{userId}", components/appearance/AppearanceProvider.jsx); before the student is
// known (the very first loader) the device-level hand hint it also writes is used. Only "left" is trusted.
function readSavedHand(userId) {
  try {
    if (userId) {
      const saved = JSON.parse(window.localStorage.getItem(`is-k5-look:${userId}`) || "null");
      if (saved) return saved.hand === "left" ? "left" : "right";
    }
    return window.localStorage.getItem(HAND_HINT_KEY) === "left" ? "left" : "right";
  } catch {
    return "right";
  }
}
const CARD = "box-border flex flex-col rounded-3xl bg-white";

function HomeBody() {
  return (
    <div className="@container flex min-w-0 flex-1 flex-col gap-6">
      <div className={`flex flex-wrap gap-6 ${FLIP}`}>
        <Skeleton className={`box-border flex min-h-[262px] min-w-[520px] flex-[2_1_0] flex-col justify-center gap-[18px] rounded-3xl p-[18px] max-[760px]:min-w-0 max-[760px]:basis-full ${SK}`}>
          <span className="block h-[72px] w-full rounded-[20px] bg-white/45" />
          <span className="flex flex-wrap items-center gap-4">
            <span className="flex min-w-[200px] flex-[1_1_240px] items-center gap-3">
              <span className="block h-14 w-14 flex-none rounded-full bg-white/45" />
              <span className="flex flex-col gap-2">
                <span className="block h-6 w-44 rounded-lg bg-white/45" />
                <span className="block h-6 w-28 rounded-lg bg-white/45" />
              </span>
            </span>
            <span className="block h-[118px] min-w-[210px] flex-[0_2_340px] rounded-3xl bg-white/60 max-[760px]:min-w-0 max-[760px]:flex-[1_1_100%]" />
          </span>
        </Skeleton>
        <div className={`${CARD} min-h-[262px] min-w-[300px] flex-[1_1_0] gap-4 py-[18px] pl-[22px] pr-4 max-[760px]:min-w-0 max-[760px]:basis-full`}>
          <div className="flex items-center gap-2">
            <Skeleton className={`h-8 w-8 rounded-full ${SK}`} />
            <Skeleton className={`h-6 w-32 rounded-lg ${SK}`} />
          </div>
          <div className="flex flex-1 items-center gap-4">
            <Skeleton className={`h-[100px] w-[100px] flex-none rounded-full ${SK}`} />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className={`h-4 w-full rounded-md ${SK}`} />
              <Skeleton className={`h-4 w-4/5 rounded-md ${SK}`} />
              <Skeleton className={`h-4 w-3/5 rounded-md ${SK}`} />
            </div>
          </div>
          <Skeleton className={`mt-auto h-11 w-full rounded-[22px] ${SK}`} />
        </div>
      </div>
      <div className={`flex flex-wrap gap-6 ${FLIP}`}>
        <div className={`${CARD} min-w-[520px] flex-[2_1_0] gap-3.5 px-[22px] pb-[22px] pt-5 max-[760px]:min-w-0 max-[760px]:basis-full`}>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className={`h-8 w-8 rounded-full ${SK}`} />
              <Skeleton className={`h-6 w-40 rounded-lg ${SK}`} />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className={`h-10 w-32 rounded-full ${SK}`} />
              <Skeleton className={`h-5 w-14 rounded-md ${SK}`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <Skeleton className={`h-[68px] min-w-[190px] flex-[1_1_190px] rounded-[20px] ${SK}`} />
            <Skeleton className={`h-[68px] min-w-[190px] flex-[1_1_190px] rounded-[20px] ${SK}`} />
          </div>
          <Skeleton className={`h-[128px] w-full rounded-[20px] ${SK}`} />
        </div>
        <div className={`${CARD} min-w-[300px] flex-[1_1_0] gap-[11px] px-[18px] py-5 max-[760px]:min-w-0 max-[760px]:basis-full`}>
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className={`h-8 w-8 rounded-full ${SK}`} />
              <Skeleton className={`h-6 w-36 rounded-lg ${SK}`} />
            </div>
            <Skeleton className={`h-5 w-14 rounded-md ${SK}`} />
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className={`h-[62px] rounded-[20px] ${SK}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlannerBody() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <Skeleton className={`h-24 w-full rounded-3xl ${SK}`} />
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <Skeleton className={`h-[320px] w-full rounded-3xl ${SK}`} />
          <Skeleton className={`h-40 w-full rounded-3xl ${SK}`} />
        </div>
        <Skeleton className={`h-[520px] min-w-0 flex-[999_1_460px] rounded-3xl max-[760px]:order-first ${SK}`} />
      </div>
    </div>
  );
}

export function DashboardLoadingSkeleton({ hand }) {
  const pathname = usePathname() || "";
  // Rendered inside the dashboard provider; the signed-in student is known once the session has loaded.
  const dashboard = useContext(DashboardContext);
  const userId = dashboard?.session?.userId ?? dashboard?.context?.userId;
  const saved = useSyncExternalStore(noSubscribe, () => readSavedHand(userId), () => "right");
  const side = hand === "left" || hand === "right" ? hand : saved;
  // /{school}/student is the dashboard home page; My Classes and every module are one segment deeper.
  const isHome = /\/student\/?$/.test(pathname);
  return (
    <div role="status" aria-live="polite" aria-busy="true" data-hand={side} className="flex min-h-screen flex-col bg-slate-50">
      <span className="sr-only">Loading your dashboard…</span>

      <div aria-hidden="true" className={`flex h-[72px] flex-none items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 max-[760px]:h-14 max-[760px]:px-3 ${FLIP}`}>
        <div className="flex items-center gap-3">
          <Skeleton className={`h-11 w-11 rounded-xl ${SK}`} />
          <Skeleton className={`h-8 w-44 rounded-lg max-[760px]:w-28 ${SK}`} />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className={`h-11 w-11 rounded-full max-[760px]:hidden ${SK}`} />
          <Skeleton className={`h-11 w-32 rounded-full max-[760px]:hidden ${SK}`} />
          <Skeleton className={`h-12 w-52 rounded-full max-[760px]:h-10 max-[760px]:w-32 ${SK}`} />
        </div>
      </div>

      <div aria-hidden="true" className="mx-auto flex w-full flex-1 items-start gap-3 px-5 pb-5 pt-5 max-[760px]:px-3 in-data-[hand=left]:min-[761px]:flex-row-reverse">
        <div className="flex w-[76px] flex-none flex-col items-center gap-4 rounded-3xl bg-white p-3 max-[760px]:hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className={`h-11 w-11 rounded-2xl ${SK}`} />
          ))}
        </div>

        {isHome ? <HomeBody /> : <PlannerBody />}

        <div className="flex w-20 flex-none flex-col items-center gap-5 max-[760px]:hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className={`h-[62px] w-[62px] rounded-full ${SK}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
