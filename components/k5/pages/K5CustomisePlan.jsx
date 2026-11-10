"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";

const BLUE = "#1D6BF0";
const BLUE_DEEP = "#1C47B8";

/**
 * K–5 look of "Customise your plan" (mockup Buy Extra Classes, customise dialog): the same count / amount /
 * weeks and Add to cart / Buy as the existing dialog, in the Playful style.
 */
export function K5CustomiseDialog({ subjectName, count, minDisabled, maxDisabled, onChange, amountText, weeks, onWeeks, weeksLeft, busy, onSubmit, onClose }) {
  const themeProps = useK5ThemeProps(
    "flex max-h-[calc(100vh-32px)] w-full flex-col gap-4 overflow-y-auto rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-[22px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[720px]",
  );
  const options = Array.from({ length: Math.max(weeksLeft, 0) }, (_, i) => i + 1);
  const heading = "font-k5-display text-lg font-semibold text-center";
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} {...themeProps}>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-[18px] bg-k5-bt text-[30px]">🧮</span>
          <DialogTitle className="m-0 flex-1 font-k5-display text-[26px] font-semibold leading-[1.15]">Customise your plan</DialogTitle>
          <DialogDescription className="sr-only">Pick how many extra classes and for how many weeks</DialogDescription>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-[#D7263D] bg-[#D7263D] text-white">
            <X className="h-4 w-4" strokeWidth={3.5} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-3.5">
          <h3 className="m-0 text-center font-k5-display text-[26px] font-semibold">{subjectName}</h3>
          <div className="grid grid-cols-3 gap-3.5 rounded-[20px] bg-[#EAF2FF] p-4 max-[560px]:grid-cols-1">
            <div className="flex flex-col items-center gap-2">
              <span id="k5-cust-n" className={heading} style={{ color: BLUE }}>No. of classes</span>
              <div role="group" aria-labelledby="k5-cust-n" className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Fewer classes"
                  disabled={minDisabled}
                  onClick={() => onChange(count - 1)}
                  className="h-11 w-11 cursor-pointer rounded-xl border-[3px] border-k5-line bg-white text-2xl font-black disabled:cursor-default disabled:opacity-45"
                  style={{ color: BLUE }}
                >
                  −
                </button>
                <span aria-live="polite" className="box-border flex h-11 min-w-12 items-center justify-center rounded-xl border-[3px] border-k5-line bg-white px-2 font-k5-display text-[22px] font-bold" style={{ color: BLUE }}>
                  {count}
                </span>
                <button
                  type="button"
                  aria-label="More classes"
                  disabled={maxDisabled}
                  onClick={() => onChange(count + 1)}
                  className="h-11 w-11 cursor-pointer rounded-xl border-none text-2xl font-black text-white disabled:cursor-default disabled:opacity-45"
                  style={{ background: BLUE, boxShadow: `0 3px 0 ${BLUE_DEEP}` }}
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className={heading} style={{ color: BLUE }}>Amount</span>
              <span aria-live="polite" className="box-border flex min-h-[52px] min-w-[120px] items-center justify-center rounded-[14px] border-[3px] border-k5-line bg-white px-3.5 font-k5-display text-2xl font-bold" style={{ color: BLUE }}>
                {amountText}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <label htmlFor="k5-cust-w" className={heading} style={{ color: BLUE }}>Number of Weeks</label>
              <select
                id="k5-cust-w"
                value={weeks}
                onChange={(e) => onWeeks(e.target.value)}
                className="box-border min-h-[52px] w-full max-w-[200px] cursor-pointer rounded-[14px] border-[3px] bg-white px-3 font-k5-body text-[17px] font-extrabold text-[#1E2242]"
                style={{ borderColor: weeks ? "var(--k5-line)" : "#E5243B" }}
              >
                <option value="">Select weeks</option>
                {options.map((w) => (
                  <option key={w} value={w}>{w === 1 ? "1 week" : `${w} weeks`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-center gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubmit(false)}
              className="min-h-12 flex-[0_1_200px] cursor-pointer rounded-[14px] border-none text-base font-black text-white disabled:cursor-default disabled:opacity-50"
              style={{ background: BLUE, boxShadow: `0 4px 0 ${BLUE_DEEP}` }}
            >
              Add to cart
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSubmit(true)}
              className="min-h-12 flex-[0_1_200px] cursor-pointer rounded-[14px] border-2 bg-k5-card text-base font-black disabled:cursor-default disabled:opacity-50"
              style={{ borderColor: BLUE, color: BLUE }}
            >
              Buy
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
