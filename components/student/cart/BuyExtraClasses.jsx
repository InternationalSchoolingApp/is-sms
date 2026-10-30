"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ShoppingBag } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useAddPlanToCart, useBuyExtraClass, useSchoolCurrency } from "@/hooks/useStudentCart";
import { studentNavHref } from "@/utils/dashboardNav";
import { formatAmount, isoAfterDays, todayIso, weeksUntil } from "@/utils/cartPlan";
import { CustomisePlanModal } from "@/components/student/cart/CustomisePlanModal";
import { PurchasedPlans } from "@/components/student/cart/PurchasedPlans";

export const CUSTOM_PLAN_NAME = "plan-custom";

function PageTitle() {
  return (
    <div className="flex items-center gap-2 px-1 pb-4">
      <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
      <h1 className="text-lg font-extrabold text-black sm:text-xl">Buy Extra Classes</h1>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="mx-auto w-full">
      <PageTitle />
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-lg font-bold text-primary">{children}</div>
    </div>
  );
}

function PlanCard({ plan, weeks, symbol, busy, onAdd }) {
  // The plan's validity is capped by the weeks left in the course's enrollment.
  const validWeeks = Math.min(plan.validity, weeks);
  const expired = validWeeks < 1;
  return (
    <div className="relative flex flex-col rounded-xl border border-slate-200 bg-white pt-6 hover:border-primary">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-3 py-1 text-sm font-semibold text-white">
        {plan.classCount} Classes
      </span>
      {Number(plan.saving) > 0 && (
        <span className="absolute -right-2 -top-3 rotate-12 rounded-full bg-green-600 px-2 py-1 text-center text-[11px] font-bold leading-tight text-white">
          Saving
          <br />
          {symbol}
          {plan.saving}!
        </span>
      )}
      <div className="bg-primary/10 py-2 text-center text-xl font-bold text-primary">{formatAmount(symbol, plan.amount)}</div>
      <ul className="flex-1 list-disc space-y-1 px-8 py-3 text-sm text-black">
        <li>You will receive {plan.classCount} classes.</li>
        <li>
          {plan.classCount} classes should be completed with {validWeeks} weeks.
        </li>
        <li>After {validWeeks} weeks all unused classes will expire.</li>
      </ul>
      <div className="flex flex-wrap gap-2 px-3 pb-3">
        <button
          type="button"
          disabled={busy || expired}
          onClick={() => onAdd(plan, validWeeks, false)}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Add to cart
        </button>
        <button
          type="button"
          disabled={busy || expired}
          onClick={() => onAdd(plan, validWeeks, true)}
          className="flex-1 rounded-lg border border-primary px-3 py-2 text-sm font-bold text-primary disabled:opacity-50"
        >
          Buy
        </button>
      </div>
      {expired && <p className="px-3 pb-3 text-center text-xs text-red-600">Enrollment for this course ends too soon for this plan.</p>}
    </div>
  );
}

/**
 * Buy Extra Classes (sidebar pageLink `student-addon`) — legacy
 * renderBuyExtraClasses() in buyExtraClassContent.js: one tab per course, the
 * fixed plan cards for the selected course, "Customise your plan", and the
 * course's purchased plans. Add to cart stays here; Buy adds and opens the cart.
 * `initialSubjectId` (the page's `?subject=<id>`) preselects a course (the cart's edit button).
 */
export function BuyExtraClasses({ initialSubjectId = null }) {
  const { context } = useDashboardContext();
  const { school } = useParams();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialSubjectId);
  const [customising, setCustomising] = useState(false);

  const plansQuery = useBuyExtraClass(context?.userId);
  const currencyQuery = useSchoolCurrency(context?.schoolNumericId);
  const addToCart = useAddPlanToCart(context?.userId);
  const symbol = currencyQuery.data?.symbol ?? "";

  if (!context || plansQuery.isLoading) return <Notice>Loading…</Notice>;
  const response = plansQuery.data;
  if (!response || response.status !== "1") {
    return <Notice>{response?.message || "Unable to load plans right now. Please try again."}</Notice>;
  }
  if (response.statusCode === "AY_NOT_STARTED") return <Notice>{response.message}</Notice>;

  const details = response.details ?? {};
  const subjects = details.subjects ?? [];
  const plans = details.customPlans ?? [];
  const fixedPlans = plans.filter((p) => p.planName !== CUSTOM_PLAN_NAME);
  const customPlan = plans.find((p) => p.planName === CUSTOM_PLAN_NAME);
  const subject = subjects.find((s) => String(s.subjectId) === String(selectedId)) ?? subjects[0];
  const singleCourse = subjects.length === 1;
  const weeks = weeksUntil(subject?.enrollmentEndDate);

  async function add(plan, validWeeks, buyNow) {
    try {
      const result = await addToCart.mutateAsync({
        subjectId: subject?.subjectId ?? "",
        planId: plan.planId,
        planName: plan.planName,
        singleClassFee: plan.singleClassFee,
        planAmount: plan.amount,
        sessionCount: plan.classCount,
        planStartDate: todayIso(),
        planEndDate: isoAfterDays(validWeeks * 7),
      });
      if (result?.status !== "1") {
        toast.error(result?.message || "Unable to add into cart");
        return false;
      }
      toast.success("Item added to your cart");
      if (buyNow) router.push(studentNavHref(school, "cart"));
      return true;
    } catch (err) {
      console.error("add-to-cart failed:", err);
      toast.error("Unable to add into cart");
      return false;
    }
  }

  return (
    <div className="mx-auto w-full">
      <PageTitle />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          {singleCourse ? (
            <p className="flex-1 text-center text-lg font-semibold text-primary">Please Select a Plan</p>
          ) : (
            <p className="flex-1 text-base font-semibold text-black">
              <span className="border-b-2 border-primary text-primary">Step 1:</span> Please select a course
              <span className="ml-4 border-b-2 border-primary text-primary">Step 2:</span> Select Plan
            </p>
          )}
          {customPlan && subject && (
            <button type="button" onClick={() => setCustomising(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
              Customise your plan
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-4">
          <ul className="space-y-2">
            {subjects.map((s) => {
              const active = s.subjectId === subject?.subjectId;
              return (
                <li key={s.subjectId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.subjectId)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${active ? "border-primary bg-primary text-white" : "border-primary/40 text-primary hover:border-primary"}`}
                  >
                    {s.subjectName}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="grid gap-x-4 gap-y-8 pt-3 sm:grid-cols-2 lg:col-span-3 xl:grid-cols-3">
            {fixedPlans.map((plan) => (
              <PlanCard key={plan.planId} plan={plan} weeks={weeks} symbol={symbol} busy={addToCart.isPending} onAdd={add} />
            ))}
            {fixedPlans.length === 0 && <p className="text-sm text-black/60">No plans are available for this course.</p>}
          </div>
        </div>

        <PurchasedPlans
          items={details.purchasedItems ?? []}
          subjectId={singleCourse ? null : subject?.subjectId}
          symbol={symbol}
          isoCode={currencyQuery.data?.isoCode ?? ""}
        />
      </div>

      {customising && customPlan && subject && (
        <CustomisePlanModal
          subject={subject}
          plan={customPlan}
          symbol={symbol}
          busy={addToCart.isPending}
          onClose={() => setCustomising(false)}
          onAdd={async (custom, buyNow) => {
            if (await add(custom, custom.weeks, buyNow)) setCustomising(false);
          }}
        />
      )}
    </div>
  );
}
