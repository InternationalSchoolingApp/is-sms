"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, PlusCircle, ShoppingCart } from "lucide-react";
import { K5_CARD, SubjectIcon } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { useCartCount, useCartDetails } from "@/hooks/useStudentCart";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { useK5CourseColors } from "@/hooks/useK5CourseColors";
import { GRADE_CONFIG } from "@/utils/gradeBand";
import { formatAmount } from "@/utils/cartPlan";
import { studentNavHref } from "@/utils/dashboardNav";
import { courseTint, subjectStyle } from "@/utils/k5Calendar";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";

// "Grade 3" from the student's standard (the mockup's grade chip); nothing when it is not known.
function gradeLabel(standardId) {
  if (standardId == null) return "";
  if (Number(standardId) === 17) return "PreK";
  return Object.values(GRADE_CONFIG).find((g) => g.standardId === Number(standardId))?.label ?? "";
}

/** Centered message card (loading, errors) in the K–5 look. */
export function K5BuyExtraNotice({ loading = false, children }) {
  if (loading) return <BuyExtraSkeleton />;
  return (
    <div className="flex flex-col gap-4">
      <BuyHeader />
      <div className={`${K5_CARD} p-8 text-center font-k5-display text-2xl font-semibold`}>{children}</div>
    </div>
  );
}

/** A plan card while the plans load: title, price, the two buttons and the notes. */
function PlanCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 rounded-[26px] border-[3px] border-k5-line bg-k5-card p-[22px] shadow-k5-chunky">
      <K5Sk className="h-7 w-32" />
      <div className="mb-2 flex items-center gap-2.5">
        <K5Sk className="h-11 w-28" />
        <K5Sk className="h-8 w-24 rounded-full" />
      </div>
      <div className="flex gap-2.5">
        <K5Sk className="h-[52px] flex-1 rounded-[18px]" />
        <K5Sk className="h-[52px] flex-1 rounded-[18px]" />
      </div>
      <K5Sk className="mt-2 h-4 w-full" />
      <K5Sk className="h-4 w-4/5" />
    </div>
  );
}

/**
 * Buy Extra Classes while the plans load, laid out like the page: the header with the cart button, then the plans card —
 * K–5: the centred title, grade + "Customise", the course pills and three plans; Grade 6–8: the two steps, grade +
 * "Customise", the course list on the left and the plans on the right.
 */
function BuyExtraSkeleton() {
  const { isMiddle, isHigh } = useDashboardContext();
  return (
    <K5Loading label="Loading the plans" className="flex flex-col gap-4">
      <BuyHeader cartLoading />
      <div className={`${K5_CARD} flex flex-col gap-[22px] px-[22px] pb-7 pt-6`}>
        {isHigh ? (
          <>
            <div className="flex justify-end">
              <K5Sk className="h-9 w-24 rounded-full" />
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2.5 rounded-[12px] border border-k5-line bg-k5-card p-4">
                  <K5Sk className="h-12 w-12 rounded-[12px]" />
                  <K5Sk className="h-5 w-3/4" />
                  <K5Sk className="h-3.5 w-1/2" />
                  <div className="flex items-end justify-between gap-2 pt-1.5">
                    <span className="flex flex-col gap-1.5">
                      <K5Sk className="h-3 w-10" />
                      <K5Sk className="h-5 w-14" />
                    </span>
                    <K5Sk className="h-[46px] w-28 rounded-[10px]" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : isMiddle ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
              <div className="flex flex-wrap items-center gap-x-[26px] gap-y-2">
                <K5Sk className="h-7 w-72 max-w-full" />
                <K5Sk className="h-7 w-48" />
              </div>
              <div className="flex items-center gap-2.5">
                <K5Sk className="h-10 w-24 rounded-full" />
                <K5Sk className="h-12 w-52 rounded-xl" />
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-[22px]">
              <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <K5Sk key={i} className="h-[54px] w-full rounded-xl" />
                ))}
              </div>
              <div className="grid min-w-0 flex-[999_1_520px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[22px]">
                {Array.from({ length: 3 }, (_, i) => (
                  <PlanCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <K5Sk className="mx-auto h-8 w-64 max-w-full" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <K5Sk className="h-11 w-28 rounded-full" />
              <K5Sk className="h-12 w-56 rounded-2xl" />
            </div>
            <div className="flex flex-wrap gap-2.5">
              {Array.from({ length: 4 }, (_, i) => (
                <K5Sk key={i} className="h-12 w-44 rounded-full" />
              ))}
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[22px]">
              {Array.from({ length: 3 }, (_, i) => (
                <PlanCardSkeleton key={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </K5Loading>
  );
}

function BuyHeader({ showCart = false, cartLoading = false }) {
  const { context, isMiddle, isHigh } = useDashboardContext();
  const { school } = useParams();
  const { data: count = 0 } = useCartCount(showCart && context?.role === "student" ? context?.userId : null);
  return (
    <div className={isMiddle ? "flex flex-wrap items-center gap-4" : `${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      {isMiddle ? (
        // Grade 6–8 (Middle.dc.html): no card around the title — a 62px accent tile, a 30px heading.
        <span className={`flex h-[62px] w-[62px] flex-none items-center justify-center bg-k5-act ${isHigh ? "rounded-[10px]" : "rounded-[0.875rem]"}`}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" className="stroke-k5-ac">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        </span>
      ) : (
        <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-bt">
          <PlusCircle className="h-12 w-12 text-k5-bi" strokeWidth={2} aria-hidden="true" />
        </span>
      )}
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h1 className={`m-0 font-k5-display font-semibold leading-[1.05] ${isMiddle ? "text-[30px]" : "text-4xl"}`}>Buy Extra Classes</h1>
        <p className={`m-0 font-extrabold text-k5-mut ${isMiddle ? "text-base" : "text-lg"}`}>Want more classes? Pick a plan with your grown-up.</p>
      </div>
      {cartLoading && <K5Sk className="h-[52px] w-32 rounded-full" />}
      {showCart && (
        <Link
          href={studentNavHref(school, "cart")}
          aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
          className={`flex min-h-[52px] items-center gap-2.5 rounded-full px-[18px] font-k5-display text-lg font-semibold text-white no-underline ${isMiddle ? "bg-[#027FFE] shadow-[0_2px_0_#0057B8]" : "bg-[#1D6BF0] shadow-[0_4px_0_#1C47B8]"}`}
        >
          <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
          Cart
          <span className={`flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-[15px] font-black ${isMiddle ? "text-[#027FFE]" : "text-[#1D6BF0]"}`}>{count}</span>
        </Link>
      )}
    </div>
  );
}

function PlanCard({ plan, weeks, symbol, busy, onAdd, middle = false }) {
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
          <span
            className={`-rotate-3 rounded-full border-[#E0A800] bg-[#FFC531] px-3.5 py-1.5 text-[15px] font-black text-[#3A2A00] ${middle ? "border-[1.5px] shadow-[0_2px_0_#E0A800,0_0_0_4px_rgba(255,197,49,0.28)]" : "border-2 shadow-[0_3px_0_#E0A800,0_0_0_4px_rgba(255,197,49,0.28)]"}`}
          >
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
  const { context, isMiddle, isHigh } = useDashboardContext();
  usePicoContentReady(true);
  const { standardId } = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const grade = gradeLabel(standardId);
  return (
    <div className="flex flex-col gap-4">
      <BuyHeader showCart />
      {isHigh ? (
        <HighPlans
          subjects={subjects}
          subject={subject}
          onSelect={onSelect}
          fixedPlans={fixedPlans}
          customPlan={customPlan}
          weeks={weeks}
          symbol={symbol}
          onAdd={onAdd}
          onCustomise={onCustomise}
          grade={grade}
          purchased={purchased}
        />
      ) : isMiddle ? (
        <MiddlePlans
          subjects={subjects}
          subject={subject}
          singleCourse={singleCourse}
          onSelect={onSelect}
          fixedPlans={fixedPlans}
          customPlan={customPlan}
          weeks={weeks}
          symbol={symbol}
          busy={busy}
          onAdd={onAdd}
          onCustomise={onCustomise}
          grade={grade}
          purchased={purchased}
        />
      ) : (
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
                  className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-line bg-k5-card py-1 pl-1.5 pr-4 font-k5-display text-[17px] font-semibold text-k5-ink"
                  style={active ? { borderColor: color, background: courseTint(color), boxShadow: "0 4px 0 " + color } : undefined}
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
      )}
    </div>
  );
}

/**
 * Grade 6–8 plans card (Middle.dc.html): "Step 1: Please select a course" / "Step 2: Select Plan" with the grade and
 * "Customise your plan" on the right; the courses as a list on the left (a colour dot, a tick on the picked one) and
 * the plans on the right. One course only: just the plans, under "Select Plan".
 */
function MiddlePlans({ subjects, subject, singleCourse, onSelect, fixedPlans, customPlan, weeks, symbol, busy, onAdd, onCustomise, grade, purchased }) {
  const step = (n, text) => (
    <h2 className="m-0 border-b-[3px] border-k5-ac pb-1 font-k5-display text-[22px] font-semibold text-k5-ink">
      {n && <span className="text-k5-ac">{n} </span>}
      {text}
    </h2>
  );
  const plans = (
    <div className={`grid min-w-0 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[22px] ${singleCourse ? "" : "flex-[999_1_520px]"}`}>
      {fixedPlans.map((plan) => (
        <PlanCard key={plan.planId} plan={plan} weeks={weeks} symbol={symbol} busy={busy} onAdd={onAdd} middle />
      ))}
      {fixedPlans.length === 0 && <p className="m-0 font-extrabold text-k5-mut">No plans are available for this course.</p>}
    </div>
  );
  return (
    <div className={`${K5_CARD} flex flex-col gap-[22px] px-[22px] pb-7 pt-6`}>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex flex-wrap items-baseline gap-x-[26px] gap-y-1.5">
          {singleCourse ? step("", "Please Select a Plan") : (
            <>
              {step("Step 1:", "Please select a course")}
              {step("Step 2:", "Select Plan")}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {grade && <span className="rounded-full bg-k5-act px-[18px] py-2 font-k5-display text-lg font-semibold text-k5-acx">{grade}</span>}
          {customPlan && subject && (
            <button
              type="button"
              onClick={onCustomise}
              className="min-h-12 cursor-pointer rounded-xl border-[3px] border-k5-ac bg-k5-card px-5 font-k5-display text-lg font-semibold text-k5-acx shadow-[0_2px_0_var(--k5-acl)]"
            >
              Customise your plan
            </button>
          )}
        </div>
      </div>

      {singleCourse ? (
        plans
      ) : (
        <div className="flex flex-wrap items-start gap-[22px]">
          <div role="radiogroup" aria-label="Please select a course" className="flex min-w-0 flex-[1_1_240px] flex-col gap-2.5">
            {subjects.map((s) => {
              const on = s.subjectId === subject?.subjectId;
              const color = subjectStyle(s.subjectName).color;
              return (
                <button
                  key={s.subjectId}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onSelect(s.subjectId)}
                  className={`flex min-h-[54px] cursor-pointer items-center gap-2.5 rounded-[12px] border-solid px-4 py-2 text-start font-k5-display text-[17px] font-semibold text-k5-ink ${on ? "border-2" : "border-[1.5px] border-k5-line bg-k5-card"}`}
                  style={on ? { borderColor: color, background: courseTint(color) } : undefined}
                >
                  <span aria-hidden="true" className="h-3 w-3 flex-none rounded-full" style={{ background: color }} />
                  <span className="min-w-0 flex-1">{s.subjectName}</span>
                  {on && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none" style={{ stroke: color }}>
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          {plans}
        </div>
      )}

      {purchased}
    </div>
  );
}

/**
 * Grade 9–12 (High.dc.html): the page lists the courses as cards (icon, name, "From" price, "View plans"); a course's plans
 * open in a dialog — each plan a row with its class count, saving, price and Add to cart — with a "Customise your plan" row
 * and "Go to cart (n)". The values are the mockup's own (the dialog is not part of the scaled page).
 */
function HighPlans({ subjects, subject, onSelect, fixedPlans, customPlan, weeks, symbol, onAdd, onCustomise, grade, purchased }) {
  const { context } = useDashboardContext();
  const { school } = useParams();
  const router = useRouter();
  const colorFor = useK5CourseColors();
  const cart = useCartDetails(context?.role === "student" ? context?.userId : null);
  const { data: cartCount = 0 } = useCartCount(context?.role === "student" ? context?.userId : null);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");
  // The plan being added: from the click until the answer comes, every button of the dialog is off and this one shows it works.
  const [adding, setAdding] = useState("");
  const working = adding !== "";
  const cartItems = cart.data?.details?.cart?.cartItems ?? [];
  const inCart = (subjectId) => cartItems.filter((it) => String(it.subjectId) === String(subjectId)).length;
  const cheapest = fixedPlans.length ? Math.min(...fixedPlans.map((plan) => Number(plan.amount) || 0)) : null;
  const colorOf = (s) => colorFor({ id: s.subjectId, name: s.subjectName }) || subjectStyle(s.subjectName).color;
  const themeProps = useK5ThemeProps(
    "flex max-h-[min(100%,calc(100vh-32px))] flex-col gap-0 overflow-y-auto rounded-[16px] border border-k5-line bg-k5-soft p-0 text-k5-ink shadow-[0_18px_44px_rgba(23,27,46,0.18)] ring-0 sm:max-w-[620px]",
  );

  async function add(plan) {
    const validWeeks = Math.min(plan.validity, weeks);
    if (validWeeks < 1) return;
    if (working) return;
    setAdding(String(plan.planId));
    let ok = false;
    try {
      ok = await onAdd(plan, validWeeks, false);
    } finally {
      // The answer is in: the buttons are on again, the tick stays a moment on the plan that was added.
      setAdding("");
    }
    if (ok) {
      setFlash(String(plan.planId));
      window.setTimeout(() => setFlash(""), 1200);
    }
  }

  return (
    <div className={`${K5_CARD} flex flex-col gap-[22px] px-[22px] pb-7 pt-6`}>
      <div className="flex items-center justify-end gap-x-5 gap-y-3">
        {grade && (
          <span className="rounded-full bg-k5-act px-3.5 py-[7px] font-k5-display text-[0.875rem] font-[500] text-k5-ink">
            {grade}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {subjects.map((s) => {
          const color = colorOf(s);
          const n = inCart(s.subjectId);
          return (
            <article key={s.subjectId} className="flex flex-col gap-2.5 rounded-[12px] border border-k5-line bg-k5-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-[12px] bg-k5-act" style={{ color }}>
                  <SubjectIcon name={s.subjectName} className="h-7 w-7" />
                </span>
                {n > 0 && (
                  <span className="rounded-full bg-k5-gt px-2.5 py-[3px] text-[0.75rem] font-[600] text-k5-ink">
                    {n} in cart
                  </span>
                )}
              </div>
              <h3 className="m-0 font-k5-display text-[1.0625rem] font-[500] leading-[1.25] text-k5-ink">
                {s.subjectName}
              </h3>
              {s.teacherName && <span className="text-[0.8125rem] text-k5-mut">{s.teacherName}</span>}
              <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
                <span className="flex flex-col">
                  <span className="text-[0.75rem] text-k5-mut">From</span>
                  <span className="font-k5-display text-[1.25rem] font-[600] text-k5-ink">{cheapest == null ? "–" : formatAmount(symbol, cheapest)}</span>
                </span>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={"View plans: " + s.subjectName}
                  onClick={() => {
                    onSelect(s.subjectId);
                    setOpen(true);
                  }}
                  className="flex min-h-[2.875rem] cursor-pointer flex-col items-center justify-center rounded-[10px] border border-k5-ac bg-k5-card px-4 py-1 font-k5-display text-[0.875rem] font-[600] leading-[1.15] text-k5-ac"
                >
                  View plans
                  <span className="text-[0.6875rem] font-[500] text-k5-mut">{fixedPlans.length} plans + customise</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {purchased}

      <Dialog className="bhagat" open={open && Boolean(subject)} onOpenChange={(next) => !working && setOpen(next)}>
        <DialogContent showCloseButton={false} {...themeProps}>
          <div className="flex items-center gap-3 rounded-t-[16px] bg-k5-ac px-[18px] py-4 text-white">
            <span className="flex min-w-0 flex-1 flex-col">
              <DialogTitle className="m-0 font-k5-display text-[1.25rem] font-[500] leading-[1.2]">
                {subject?.subjectName}
              </DialogTitle>
              <DialogDescription className="m-0 text-[0.8125rem] text-white">
                Choose a plan for this course
              </DialogDescription>
            </span>
            <button type="button" onClick={() => setOpen(false)} disabled={working} aria-label="Close" className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full border border-white bg-k5-red disabled:cursor-default disabled:opacity-60">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" aria-hidden="true" className="stroke-white">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-2.5 px-[18px] py-4">
            {fixedPlans.map((plan) => {
              const validWeeks = Math.min(plan.validity, weeks);
              const expired = validWeeks < 1;
              const done = flash === String(plan.planId);
              const mine = adding === String(plan.planId);
              return (
                <div key={plan.planId} className="flex flex-wrap items-center gap-3.5 rounded-[12px] border border-k5-line bg-k5-card px-3.5 py-3 sm:flex-nowrap">
                  <span className="relative mt-1.5 flex h-[68px] w-[72px] flex-none flex-col items-center justify-center rounded-[10px] bg-k5-act font-k5-display text-[1.375rem] font-[600] leading-none text-k5-ink">
                    {plan.classCount}
                    <span className="text-[0.6875rem] font-[500] text-k5-mut">classes</span>
                    {Number(plan.saving) > 0 && (
                      <span className="absolute -top-[11px] -start-2 whitespace-nowrap rounded-full border border-[#E0A800] bg-[#FFC531] px-[9px] py-[3px] font-k5-body text-[0.75rem] font-[700] text-[#3A2A00]">
                        Saving {symbol}
                        {plan.saving}!
                      </span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-[1_1_140px] flex-col gap-0.5">
                    <span className="font-k5-display text-[1rem] font-[500] text-k5-ink">{plan.classCount} Classes</span>
                    <span className="text-[0.75rem] text-k5-mut">
                      {expired ? "Enrollment for this course ends too soon for this plan." : "Couldn't finish in time? No worries, your unused classes carry forward."}
                    </span>
                  </span>
                  <span className="whitespace-nowrap font-k5-display text-[1.125rem] font-[600] text-k5-ink">
                    {formatAmount(symbol, plan.amount)}
                  </span>
                  <button
                    type="button"
                    disabled={expired || working}
                    aria-busy={mine}
                    onClick={() => add(plan)}
                    className={`flex min-h-[2.625rem] min-w-24 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border px-3.5 font-k5-display text-[0.875rem] font-[600] disabled:cursor-default disabled:opacity-50 ${done ? "border-k5-gx bg-k5-gt text-k5-gx" : "border-k5-ac bg-k5-card text-k5-acx"}`}
                  >
                    {mine ? (
                      <>
                        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-k5-ac/30 border-t-k5-ac" />
                        Adding…
                      </>
                    ) : done ? (
                      "✓ In cart"
                    ) : (
                      "Add to cart"
                    )}
                  </button>
                </div>
              );
            })}
            {fixedPlans.length === 0 && <p className="m-0 text-[0.8125rem] text-k5-mut">No plans are available for this course.</p>}
            {customPlan && (
              <div className="flex flex-wrap items-center gap-3.5 rounded-[12px] border border-dashed border-k5-ac bg-k5-card px-3.5 py-3 sm:flex-nowrap">
                <span className="flex min-w-0 flex-[1_1_180px] flex-col gap-0.5">
                  <span className="font-k5-display text-[1rem] font-[500] text-k5-ink">Customise your plan</span>
                  <span className="text-[0.75rem] text-k5-mut">Choose your own number of classes and weeks.</span>
                </span>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => {
                    setOpen(false);
                    onCustomise();
                  }}
                  className="min-h-[2.5625rem] cursor-pointer rounded-[12px] border-[1.5px] border-k5-ac bg-k5-card px-5 font-k5-display text-[0.9375rem] font-[500] text-k5-acx disabled:cursor-default disabled:opacity-50"
                >
                  Customise your plan
                </button>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2.5 border-t border-k5-line px-[18px] pb-4 pt-3">
            <button
              type="button"
              disabled={working}
              onClick={() => router.push(studentNavHref(school, "cart"))}
              className="min-h-[2.75rem] cursor-pointer rounded-full border-none bg-k5-ac px-5 font-k5-display text-[0.9375rem] font-[600] text-white disabled:cursor-default disabled:opacity-50"
            >
              Go to cart ({cartCount})
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
