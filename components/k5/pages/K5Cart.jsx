"use client";

import Link from "next/link";
import { ChevronLeft, Info, Lock, Pencil, PlusCircle, ScrollText, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { formatAmount, weeksBetween, weeksLabel } from "@/utils/cartPlan";
import { studentNavHref } from "@/utils/dashboardNav";

const CART_BLUE = "#1D6BF0";
const CART_BLUE_DEEP = "#1C47B8";

function CartHeader({ count, school, backHref }) {
  return (
    <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-bt">
        <PlusCircle className="h-12 w-12 text-k5-bi" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">
          Your Cart ({count} {count === 1 ? "item" : "items"})
        </h1>
        <p className="m-0 text-lg font-extrabold text-k5-mut">Check your classes, then pay.</p>
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
export function K5CartNotice({ school, children }) {
  return (
    <div className="flex flex-col gap-4">
      <CartHeader count={0} school={school} />
      <div className={`${K5_CARD} p-8 text-center font-k5-display text-2xl font-semibold`}>{children}</div>
    </div>
  );
}

function CartItem({ item, symbol, school, busy, onRemove }) {
  const weeks = weeksBetween(item.planStartDate, item.planEndDate);
  const label = "text-[15px] font-extrabold text-k5-mut";
  return (
    <article className={`${K5_CARD} flex flex-wrap items-center gap-4 p-4`}>
      <div
        aria-hidden="true"
        className="flex h-28 w-28 flex-none flex-col items-center justify-center rounded-[22px] text-white shadow-[0_5px_0_#1C47B8]"
        style={{ background: "linear-gradient(150deg, #5A9BFF 0%, #1D5BF0 100%)" }}
      >
        <span className="font-k5-display text-[44px] font-bold leading-none">{item.classCount}</span>
        <span className="mt-1 text-sm font-black uppercase tracking-[0.06em]">classes</span>
      </div>
      <dl className="m-0 grid min-w-0 flex-[1_1_240px] grid-cols-[auto_1fr] items-baseline gap-x-3.5 gap-y-2">
        {item.subjectName && (
          <>
            <dt className={label}>Course</dt>
            <dd className="m-0 font-k5-display text-[19px] font-semibold">{item.subjectName}</dd>
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
        <dd className="m-0 font-k5-display text-[22px] font-bold" style={{ color: CART_BLUE }}>
          {formatAmount(symbol, item.planAmount)}
        </dd>
      </dl>
      <div className="ms-auto flex gap-2">
        <Link
          href={`${studentNavHref(school, "student-addon")}?subject=${item.subjectId}`}
          aria-label="Change plan"
          title="Change plan"
          className="flex h-12 w-12 items-center justify-center rounded-[14px] text-white shadow-[0_4px_0_#1C47B8]"
          style={{ background: CART_BLUE }}
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
        >
          <Trash2 className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

/**
 * K–5 look of the cart (mockup Buy Extra Classes, cart view): the same items, discount code, totals and
 * CONFIRM AND PAY as the existing cart, in the Playful layout.
 */
export function K5CartView({ school, count, items, symbol, cart, appliedCode, code, onCode, busy, canPay, onRemove, onToggleDiscount, onPay }) {
  const empty = items.length === 0;
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
                style={{ background: CART_BLUE }}
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
          <label htmlFor="k5-code" className="text-base font-black">Discount Code</label>
          <div className="flex overflow-hidden rounded-2xl border-[3px] bg-white" style={{ borderColor: cart.errorMsg ? "#E5243B" : appliedCode ? "#0E7A43" : CART_BLUE }}>
            <input
              id="k5-code"
              type="text"
              maxLength={15}
              value={appliedCode || code}
              disabled={Boolean(appliedCode) || busy}
              onChange={(e) => onCode(e.target.value.replace(/[^A-Za-z0-9]/g, ""))}
              placeholder="Type a code"
              className="min-h-12 min-w-0 flex-1 border-none bg-transparent px-3.5 font-k5-body text-[17px] font-bold uppercase text-[#1E2242] outline-none disabled:bg-slate-100"
            />
            <button
              type="button"
              disabled={busy}
              onClick={onToggleDiscount}
              title={appliedCode ? "Remove Discount Code" : "Apply Discount Code"}
              className="min-w-[92px] flex-none cursor-pointer border-none px-3 font-k5-display text-[17px] font-semibold text-white disabled:cursor-default disabled:opacity-50"
              style={{ background: CART_BLUE }}
            >
              {appliedCode ? "Remove" : "Apply"}
            </button>
          </div>
          {cart.errorMsg && <p className="-mt-1 m-0 text-sm font-extrabold text-[#E5243B]">{cart.errorMsg}</p>}
          {appliedCode && (
            <div className="flex justify-between gap-2.5 text-[17px] font-extrabold text-[#0E7A43]">
              <span>Discount</span>
              <span>− {formatAmount(symbol, cart.cpDiscount)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-2.5 border-t-[3px] border-dashed border-k5-line pt-3.5">
            <span className="font-k5-display text-[22px] font-semibold">Total</span>
            <span className="font-k5-display text-[30px] font-bold" style={{ color: CART_BLUE }}>{formatAmount(symbol, cart.totalPayAmount)}</span>
          </div>
          <button
            type="button"
            disabled={!canPay}
            onClick={onPay}
            className="min-h-[60px] cursor-pointer rounded-[18px] border-none font-k5-display text-[22px] font-semibold tracking-[0.03em] text-white shadow-[0_5px_0_#1C47B8] disabled:cursor-default disabled:opacity-45"
            style={{ background: CART_BLUE }}
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
