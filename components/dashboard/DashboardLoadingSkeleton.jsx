import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the dashboard context (student, grade band, look) is still loading, in place of the old grey
 * "Almost there" overlay. Neutral colours on purpose: the grade look and the student's theme are not known yet.
 * Same skeleton rule as every module: shadcn/ui Skeleton shaped like the shell (header, left menu, cards, right rail).
 */
const SK = "bg-slate-200/80";

export function DashboardLoadingSkeleton() {
  const t = useTranslations("nav");
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex min-h-screen flex-col bg-slate-50">
      <span className="sr-only">{t("loadingDashboard")}</span>

      <div aria-hidden="true" className="flex h-[72px] flex-none items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 max-[760px]:h-14 max-[760px]:px-3">
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

      <div aria-hidden="true" className="mx-auto flex w-full flex-1 items-start gap-3 px-5 pb-5 pt-5 max-[760px]:px-3">
        <div className="flex w-[76px] flex-none flex-col items-center gap-4 rounded-3xl bg-white p-3 max-[760px]:hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className={`h-11 w-11 rounded-2xl ${SK}`} />
          ))}
        </div>

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

        <div className="flex w-20 flex-none flex-col items-center gap-5 max-[760px]:hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className={`h-[62px] w-[62px] rounded-full ${SK}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
