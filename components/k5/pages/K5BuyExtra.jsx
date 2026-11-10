"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, PlusCircle, ShoppingCart } from "lucide-react";
import { K5_CARD, SubjectIcon } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { useCartCount } from "@/hooks/useStudentCart";
import { GRADE_CONFIG } from "@/utils/gradeBand";
import { formatAmount } from "@/utils/cartPlan";
import { studentNavHref } from "@/utils/dashboardNav";
import { courseTint, subjectStyle } from "@/utils/k5Calendar";

// "Grade 3" from the student's standard (the mockup's grade chip); nothing when it is not known.
function gradeLabel(standardId) {
  if (standardId == null) return "";
  if (Number(standardId) === 17) return "PreK";
  return Object.values(GRADE_CONFIG).find((g) => g.standardId === Number(standardId))?.label ?? "";
}

/** Centered message card (loading, errors) in the K–5 look. */
export function K5BuyExtraNotice({ children }) {
  return (
    <div className="flex flex-col gap-4">
      <BuyHeader />
      <div className={`${K5_CARD} p-8 text-center font-k5-display text-2xl font-semibold`}>{children}</div>
    </div>
  );
}

function BuyHeader({ showCart = false }) {
  const { context } = useDashboardContext();
  const { school } = useParams();
  const { data: count = 0 } = useCartCount(showCart && context?.role === "student" ? context?.userId : null);
  return (
    <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-bt">
        <PlusCircle className="h-12 w-12 text-k5-bi" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">Buy Extra Classes</h1>
        <p className="m-0 text-lg font-extrabold text-k5-mut">Want more classes? Pick a plan with your grown-up.</p>
      </div>
      {showCart && (
        <Link
          href={studentNavHref(school, "cart")}
          aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
          className="flex min-h-[52px] items-center gap-2.5 rounded-full bg-[#1D6BF0] px-[18px] font-k5-display text-lg font-semibold text-white no-underline shadow-[0_4px_0_#1C47B8]"
        >
          <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
          Cart
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-[15px] font-black text-[#1D6BF0]">{count}</span>
        </Link>
      )}
    </div>
  );
}

function PlanCard({ plan, weeks, symbol, busy, onAdd }) {
  // The plan's validity is capped by the weeks left in the course's enrollment.
  const validWeeks = Math.min(plan.validity, weeks);
  const expired = validWeeks < 1;
  const note = (text) => (
    <span className="flex items-start gap-2.5 text-base font-bold leading-[1.4] text-k5-ink">
      <CheckCircle2 className="mt-0.5 h-[22px] w-[22px] flex-none text-k5-ac" strokeWidth={2.2} aria-hidden="true" />
      {text}
    </span>
  );
  return (
    <article className="flex flex-col gap-1.5 rounded-[26px] border-[3px] border-k5-line bg-k5-card p-[22px] shadow-k5-chunky">
      <span className="font-k5-display text-2xl font-semibold text-k5-ink">{plan.classCount} Classes</span>
      <div className="mb-3 mt-1 flex flex-wrap items-center gap-2.5">
        <span className="font-k5-display text-[44px] font-bold leading-none text-k5-ink">{formatAmount(symbol, plan.amount)}</span>
        {Number(plan.saving) > 0 && (
          <span className="-rotate-3 rounded-full border-2 border-[#E0A800] bg-[#FFC531] px-3.5 py-1.5 text-[15px] font-black text-[#3A2A00] shadow-[0_3px_0_#E0A800,0_0_0_4px_rgba(255,197,49,0.28)]">
            Saving {symbol}
            {plan.saving}!
          </span>
        )}
      </div>
      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={busy || expired}
          onClick={() => onAdd(plan, validWeeks, false)}
          className="min-h-[52px] min-w-0 flex-1 cursor-pointer whitespace-nowrap rounded-[18px] border-[3px] border-k5-ac bg-k5-card px-2 font-k5-display text-[17px] font-semibold text-k5-acx disabled:cursor-default disabled:opacity-50"
        >
          Add to cart
        </button>
        <button
          type="button"
          disabled={busy || expired}
          onClick={() => onAdd(plan, validWeeks, true)}
          className="min-h-[52px] min-w-0 flex-1 cursor-pointer rounded-[18px] border-none bg-k5-ac px-2 font-k5-display text-lg font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] disabled:cursor-default disabled:opacity-50"
        >
          Buy
        </button>
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        {note(`You will receive ${plan.classCount} classes. Finish them within ${validWeeks} weeks.`)}
        {note(`After ${validWeeks} weeks, all unused classes will expire.`)}
      </div>
      {expired && <p className="m-0 pt-1 text-center text-sm font-extrabold text-k5-ri">Enrollment for this course ends too soon for this plan.</p>}
    </article>
  );
}

/**
 * K–5 look of Buy Extra Classes (mockup Buy Extra Classes): the same plans, prices, add-to-cart / buy and
 * customise flow as the existing page, in the Playful layout.
 */
export function K5BuyExtraClasses({ subjects, subject, singleCourse, onSelect, fixedPlans, customPlan, weeks, symbol, busy, onAdd, onCustomise, purchased }) {
  const { context } = useDashboardContext();
  usePicoContentReady(true);
  const { standardId } = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const grade = gradeLabel(standardId);
  return (
    <div className="flex flex-col gap-4">
      <BuyHeader showCart />
      <div className={`${K5_CARD} flex flex-col gap-[22px] px-[22px] pb-7 pt-6`}>
        <h2 className="m-0 text-center font-k5-display text-[28px] font-semibold text-k5-ink">Please Select a Plan</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {grade ? <span className="rounded-full bg-k5-act px-[18px] py-2 font-k5-display text-xl font-semibold text-k5-acx">{grade}</span> : <span />}
          {customPlan && subject && (
            <button
              type="button"
              onClick={onCustomise}
              className="min-h-12 cursor-pointer rounded-2xl border-[3px] border-k5-ac bg-k5-card px-5 font-k5-display text-lg font-semibold text-k5-acx shadow-[0_4px_0_var(--k5-acl)]"
            >
              Customise your plan
            </button>
          )}
        </div>

        {!singleCourse && (
          <div role="group" aria-label="Course" className="flex flex-wrap gap-2.5">
            {subjects.map((s) => {
              const active = s.subjectId === subject?.subjectId;
              const color = subjectStyle(s.subjectName).color;
              return (
                <button
                  key={s.subjectId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(s.subjectId)}
                  className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-[3px] py-1 pl-1.5 pr-4 font-k5-display text-[17px] font-semibold text-k5-ink"
                  style={{ borderColor: active ? color : "var(--k5-line)", background: active ? courseTint(color) : "var(--k5-card)", boxShadow: active ? "0 4px 0 " + color : undefined }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-k5-card" style={{ color }}>
                    <SubjectIcon name={s.subjectName} className="h-5 w-5" />
                  </span>
                  {s.subjectName}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[22px]">
          {fixedPlans.map((plan) => (
            <PlanCard key={plan.planId} plan={plan} weeks={weeks} symbol={symbol} busy={busy} onAdd={onAdd} />
          ))}
          {fixedPlans.length === 0 && <p className="m-0 font-extrabold text-k5-mut">No plans are available for this course.</p>}
        </div>

        {purchased}
      </div>
    </div>
  );
}
