"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a student sees while they are on their way to an onboarding page (Confirm Your Time Zone, overdue fee, Dashboard Setup) -
 * shaped like THOSE pages, not like the dashboard: the plain header (logo on the left, name + Log Off on the right), the
 * centred card (blue title bar, a line of text, a field, a divider and the Confirm button), then the footer line. The dashboard
 * skeleton used to stay on screen until the page was there, so the student saw a dashboard that was never going to open.
 * Same shadcn/ui Skeleton as every other loader; neutral colours (the onboarding pages are light).
 */
export function OnboardingCardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto mt-[88px] w-full max-w-[812px] overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(15,23,42,0.08)] max-[640px]:mt-8">
      <Skeleton className="h-[50px] w-full rounded-none bg-[#cfe3ff]" />
      <div className="flex flex-col items-center gap-6 px-10 pb-7 pt-9 max-[640px]:px-4">
        <Skeleton className="h-6 w-[70%] max-w-[560px]" />
        <Skeleton className="h-[58px] w-full max-w-[560px] rounded-xl" />
        <div className="h-px w-full bg-slate-200" />
        <div className="flex w-full justify-end">
          <Skeleton className="h-[45px] w-[118px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function OnboardingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f1f4f6]">
      <header className="border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-[1310px] items-center justify-between gap-3">
          <Skeleton className="h-9 w-[160px] sm:w-[220px]" />
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-5 w-40 sm:block" />
            <Skeleton className="h-8 w-[88px] rounded-lg" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1310px] flex-1 px-4 pb-4 pt-2 sm:px-6">
        <OnboardingCardSkeleton />
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-3">
        <Skeleton className="mx-auto h-4 w-[360px] max-w-full" />
      </footer>
    </div>
  );
}
