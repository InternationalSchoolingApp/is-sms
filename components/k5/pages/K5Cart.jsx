"use client";

import Link from "next/link";
import { ChevronLeft, Info, Lock, Pencil, PlusCircle, ScrollText, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { formatAmount, weeksBetween, weeksLabel } from "@/utils/cartPlan";
import { studentNavHref } from "@/utils/dashboardNav";
import { subjectStyle } from "@/utils/k5Calendar";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { useDashboardContext } from "@/hooks/useDashboardContext";

const CART_BLUE = "#1D6BF0";
const CART_BLUE_DEEP = "#1C47B8";
// Grade 6–8 (Middle.dc.html): the cart blue is #027FFE with a #0057B8 edge, the class box ends in #0068D6.
function useCartLook() {
  const { isMiddle } = useDashboardContext();
  return isMiddle
    ? { middle: true, blue: "#027FFE", deep: "#0057B8", grad: "linear-gradient(150deg, #5A9BFF 0%, #0068D6 100%)", edge: "0 2px 0" }
    : { middle: false, blue: CART_BLUE, deep: CART_BLUE_DEEP, grad: "linear-gradient(150deg, #5A9BFF 0%, #1D5BF0 100%)", edge: "0 4px 0" };
}

function CartHeader({ count, school, backHref, countLoading = false }) {
  const { middle } = useCartLook();
  return (
    <div className={middle ? "flex flex-wrap items-center gap-4" : `${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      {middle ? (
        // Grade 6–8: no card around the title — a 62px accent tile, a 30px heading.
        <span className="flex h-[62px] w-[62px] flex-none items-center justify-center bg-k5-act" style={{ borderRadius: 14 }}>
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
        <h1 className={`m-0 font-k5-display font-semibold leading-[1.05] ${middle ? "text-[30px]" : "text-4xl"}`}>
          {countLoading ? "Your Cart" : `Your Cart (${count} ${count === 1 ? "item" : "items"})`}
        </h1>
        <p className={`m-0 font-extrabold text-k5-mut ${middle ? "text-base" : "text-lg"}`}>Check your classes, then pay.</p>
      </div>
      <Link
        href={backHref ?? studentNavHref(school, "student-addon")}
        className="flex min-h-[52px] items-center gap-2 rounded-full border-[3px] border-k5-line bg-k5-card px-[18px] font-k5-display text-lg font-semibold text-k5-ink no-underline shadow-[0_4px_0_var(--k5-line)]"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        Back to plans
      </Link>
    </div>
  );
}

/** Loading / error card in the K–5 look. */
export function K5CartNotice({ school, loading = false, children }) {
  if (loading) return <CartSkeleton school={school} />;
  return (
    <div className="flex flex-col gap-4">
      <CartHeader count={0} school={school} />
      <div className={`${K5_CARD} p-8 text-center font-k5-display text-2xl font-semibold`}>{children}</div>
    </div>
  );
}

/** The cart while it loads, laid out like the cart: items on the left (class box, details, edit / remove), Fee Details on the right. */
function CartSkeleton({ school }) {
  return (
    <K5Loading label="Loading your cart" className="flex flex-col gap-4">
      <CartHeader count={0} school={school} countLoading />
      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className={`${K5_CARD} flex flex-wrap items-center gap-4 p-4`}>
              <K5Sk className="h-28 w-28 flex-none rounded-[22px]" />
              <div className="grid min-w-0 flex-[1_1_240px] grid-cols-[110px_1fr] items-center gap-x-3.5 gap-y-2.5">
                {Array.from({ length: 4 }, (_, r) => (
                  <span key={r} className="contents">
                    <K5Sk className="h-3.5 w-24" />
                    <K5Sk className={`h-5 ${r === 2 ? "w-4/5" : "w-1/2"}`} />
                  </span>
                ))}
              </div>
              <div className="ms-auto flex gap-2">
                <K5Sk className="h-12 w-12 rounded-[14px]" />
                <K5Sk className="h-12 w-12 rounded-[14px]" />
              </div>
            </div>
          ))}
        </div>
        <div className={`${K5_CARD} flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 p-5`}>
          <K5Sk className="h-8 w-40" />
          <div className="flex justify-between">
            <K5Sk className="h-5 w-24" />
            <K5Sk className="h-5 w-16" />
          </div>
          <K5Sk className="h-4 w-28" />
          <K5Sk className="h-[54px] w-full rounded-2xl" />
          <div className="flex justify-between border-t-[3px] border-dashed border-k5-line pt-3.5">
            <K5Sk className="h-7 w-20" />
            <K5Sk className="h-8 w-24" />
          </div>
          <K5Sk className="h-[60px] w-full rounded-[18px]" />
          <K5Sk className="mx-auto h-3.5 w-44" />
        </div>
      </div>
    </K5Loading>
  );
}

function CartItem({ item, symbol, school, busy, onRemove }) {
  const look = useCartLook();
  const weeks = weeksBetween(item.planStartDate, item.planEndDate);
  const label = "text-[15px] font-extrabold text-k5-mut";
  return (
    <article className={`${K5_CARD} flex flex-wrap items-center gap-4 p-4`}>
      <div
        aria-hidden="true"
        className="flex h-28 w-28 flex-none flex-col items-center justify-center rounded-[22px] text-white shadow-[0_5px_0_#1C47B8]"
        style={look.middle ? { background: look.grad, boxShadow: "0 2px 0 #0057B8" } : { background: look.grad }}
      >
        <span className="font-k5-display text-[44px] font-bold leading-none">{item.classCount}</span>
        <span className="mt-1 text-sm font-black uppercase tracking-[0.06em]">classes</span>
      </div>
      <dl className="m-0 grid min-w-0 flex-[1_1_240px] grid-cols-[auto_1fr] items-baseline gap-x-3.5 gap-y-2">
        {item.subjectName && (
          <>
            <dt className={label}>Course</dt>
            <dd className="m-0 flex items-center gap-2 font-k5-display text-[19px] font-semibold">
              {look.middle && <span aria-hidden="true" className="h-3 w-3 flex-none rounded-full" style={{ background: subjectStyle(item.subjectName).color }} />}
              {item.subjectName}
            </dd>
          </>
        )}
        <dt className={label}>No. of classes</dt>
        <dd className="m-0 font-k5-display text-[19px] font-semibold">
          {item.classCount} extra {item.classCount === 1 ? "class" : "classes"}
        </dd>
        <dt className={label}>Plan duration</dt>
        <dd className="m-0 text-base font-black">
          {item.planStartDate} – {item.planEndDate} ({weeksLabel(weeks)})
        </dd>
        <dt className={label}>Plan fee</dt>
        <dd className="m-0 font-k5-display text-[22px] font-bold" style={{ color: look.blue }}>
          {formatAmount(symbol, item.planAmount)}
        </dd>
      </dl>
      <div className="ms-auto flex gap-2">
        <Link
          href={`${studentNavHref(school, "student-addon")}?subject=${item.subjectId}`}
          aria-label="Change plan"
          title="Change plan"
          className="flex h-12 w-12 items-center justify-center rounded-[14px] text-white shadow-[0_4px_0_#1C47B8]"
          style={look.middle ? { background: look.blue, boxShadow: `0 2px 0 ${look.deep}` } : { background: look.blue }}
        >
          <Pencil className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
        </Link>
        <button
          type="button"
          aria-label="Remove from cart"
          title="Remove"
          disabled={busy}
          onClick={() => onRemove(item.cartId)}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-[14px] border-none bg-[#E5243B] text-white shadow-[0_4px_0_#A3172A] disabled:cursor-default disabled:opacity-50"
          style={look.middle ? { boxShadow: "0 2px 0 #A3172A" } : undefined}
        >
          <Trash2 className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

/**
 * K–5 look of the cart (mockup Buy Extra Classes, cart view): the same items, totals and
 * CONFIRM AND PAY as the existing cart, in the Playful layout.
 */
export function K5CartView({ school, count, items, symbol, cart, busy, canPay, onRemove, onPay }) {
  const empty = items.length === 0;
  const look = useCartLook();
  usePicoContentReady(true);
  return (
    <div className="flex flex-col gap-4">
      <CartHeader count={count} school={school} />
      <div className="flex flex-wrap items-start gap-[18px]">
        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
          {empty ? (
            <div className={`${K5_CARD} flex flex-col items-center gap-3.5 px-[22px] py-[30px] text-center`}>
              <span aria-hidden="true" className="text-[56px] leading-none">🛒</span>
              <p className="m-0 font-k5-display text-[22px] font-semibold">Your cart is empty.</p>
              <Link
                href={studentNavHref(school, "student-addon")}
                className="flex min-h-[50px] items-center rounded-2xl px-[22px] font-k5-display text-lg font-semibold text-white no-underline shadow-[0_4px_0_#1C47B8]"
                style={look.middle ? { background: look.blue, borderRadius: 12, boxShadow: `0 2px 0 ${look.deep}` } : { background: look.blue }}
              >
                See plans
              </Link>
            </div>
          ) : (
            items.map((item) => <CartItem key={item.cartId} item={item} symbol={symbol} school={school} busy={busy} onRemove={onRemove} />)
          )}
        </div>

        <aside aria-labelledby="k5-fee" className={`${K5_CARD} flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 p-5`}>
          <h2 id="k5-fee" className="m-0 font-k5-display text-[26px] font-semibold">Fee Details</h2>
          <div className="flex justify-between gap-2.5 text-lg font-extrabold">
            <span>Cart Total</span>
            <span>{formatAmount(symbol, cart.cartTotal)}</span>
          </div>
          {cart.errorMsg && <p className="-mt-1 m-0 text-sm font-extrabold text-[#E5243B]">{cart.errorMsg}</p>}
          <div className="flex items-baseline justify-between gap-2.5 border-t-[3px] border-dashed border-k5-line pt-3.5">
            <span className="font-k5-display text-[22px] font-semibold">Total</span>
            <span className="font-k5-display text-[30px] font-bold" style={{ color: look.blue }}>{formatAmount(symbol, cart.totalPayAmount)}</span>
          </div>
          <button
            type="button"
            disabled={!canPay}
            onClick={onPay}
            className="min-h-[60px] cursor-pointer rounded-[18px] border-none font-k5-display text-[22px] font-semibold tracking-[0.03em] text-white shadow-[0_5px_0_#1C47B8] disabled:cursor-default disabled:opacity-45"
            style={look.middle ? { background: look.blue, boxShadow: `0 2px 0 ${look.deep}` } : { background: look.blue }}
          >
            Confirm and Pay
          </button>
          <span className="flex items-center justify-center gap-1.5 text-[13px] font-extrabold text-k5-mut">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Safe and secure payment
          </span>
        </aside>
      </div>
    </div>
  );
}

/** "Terms and Conditions" before Pay Now (mockup terms dialog): the same terms, tick-box and Pay Now as the existing one. */
export function K5TermsDialog({ open, intro, terms, extra, agreed, onAgree, busy, amountText, onClose, onPay }) {
  const themeProps = useK5ThemeProps(
    "flex max-h-[min(780px,calc(100vh-32px))] w-full flex-col gap-3.5 overflow-hidden rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-[26px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[920px] max-[480px]:p-4",
  );
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} {...themeProps}>
        <div className="flex items-center gap-3.5">
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded-[20px] bg-k5-ot">
            <ScrollText className="h-9 w-9 text-k5-oi" strokeWidth={2} aria-hidden="true" />
          </span>
          <DialogTitle className="m-0 min-w-0 flex-1 font-k5-display text-[28px] font-semibold leading-[1.1]">Terms and Conditions</DialogTitle>
          <DialogDescription className="sr-only">Fee refund policy and terms for Extra Classes</DialogDescription>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-12 w-12 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-card bg-[#D7263D] text-white shadow-[0_3px_0_#9E1B2C]">
            <X className="h-5 w-5" strokeWidth={3.5} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-[20px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#FFC531] text-[#1C2640]">
            <Info className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </span>
          <p className="m-0 text-lg font-black leading-[1.3]">{intro}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {terms.map((term, i) => (
              <li key={term} className="flex items-start gap-3 text-base font-bold leading-[1.5]">
                <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-k5-bt text-sm font-black text-k5-bi">{i + 1}</span>
                {term}
              </li>
            ))}
          </ol>
          {extra}
        </div>

        <div className={`flex flex-wrap items-center gap-3.5 rounded-[20px] border-[3px] px-4 py-3.5 ${agreed ? "border-k5-grn bg-k5-gt" : "border-k5-line bg-k5-soft"}`}>
          <label className="flex min-w-[240px] flex-1 cursor-pointer items-start gap-3 text-base font-black leading-[1.4]">
            <input type="checkbox" checked={agreed} onChange={(e) => onAgree(e.target.checked)} className="mt-0.5 h-7 w-7 flex-none cursor-pointer accent-[var(--k5-grn)]" />
            I confirm that I have read and agree to the above-mentioned fee refund policy and terms &amp; conditions.
          </label>
          <button
            type="button"
            disabled={!agreed || busy}
            onClick={onPay}
            className="min-h-14 cursor-pointer rounded-full border-none bg-k5-grn px-6 font-k5-display text-xl font-semibold text-white shadow-[0_5px_0_var(--k5-grnD)] disabled:cursor-default disabled:opacity-45"
          >
            {busy ? "Please wait…" : `Pay Now${amountText ? ` · ${amountText}` : ""}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
