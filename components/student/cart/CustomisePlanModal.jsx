"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Minus, Plus } from "lucide-react";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";
import { formatAmount, weeksUntil } from "@/utils/cartPlan";

// buyExtraClass.js add(): at most 50 classes in a custom plan.
const MAX_CLASSES = 50;

/**
 * "Customise your plan" — legacy customiseYourPlanModal() + add()/subtract()/
 * buyCustomClass(): pick 1-50 classes (amount = count x single class fee) and a
 * number of weeks up to the course's enrollment end.
 */
export function CustomisePlanModal({ subject, plan, symbol, busy, onClose, onAdd }) {
  const [count, setCount] = useState(1);
  // The modal opens on the plan's own amount; every +/- recomputes count x fee.
  const [amount, setAmount] = useState(Number(plan.amount) || 0);
  const [weeks, setWeeks] = useState("");
  const weeksLeft = weeksUntil(subject.enrollmentEndDate);
  const fee = Number(plan.singleClassFee) || 0;

  function change(next) {
    setCount(next);
    setAmount(next * fee);
  }

  function submit(buyNow) {
    if (!weeks) {
      toast.error("Please select number of week");
      return;
    }
    onAdd(
      {
        planId: plan.planId,
        planName: plan.planName,
        singleClassFee: plan.singleClassFee,
        amount,
        classCount: count,
        weeks: Number(weeks),
      },
      buyNow
    );
  }

  return (
    <CalendarModal title="Customise your plan" onClose={onClose}>
      <h3 className="text-center font-bold">{subject.subjectName}</h3>
      <div className="flex flex-wrap items-end justify-around gap-4 rounded-xl bg-primary/10 p-3 text-primary">
        <div className="text-center">
          <p className="mb-1 text-sm font-semibold">No. of Classes</p>
          <div className="flex items-center overflow-hidden rounded-lg border border-primary/30 bg-white">
            <button type="button" aria-label="Fewer classes" disabled={count <= 1} onClick={() => change(count - 1)} className="px-2 py-1 disabled:opacity-40">
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-8 px-2 text-center font-bold">{count}</span>
            <button type="button" aria-label="More classes" disabled={count >= MAX_CLASSES} onClick={() => change(count + 1)} className="px-2 py-1 disabled:opacity-40">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="text-center">
          <p className="mb-1 text-sm font-semibold">Amount</p>
          <span className="inline-block rounded-lg bg-white px-3 py-1 font-bold">{formatAmount(symbol, amount)}</span>
        </div>
        <label className="text-center">
          <span className="mb-1 block text-sm font-semibold">Number of Weeks</span>
          <select value={weeks} onChange={(e) => setWeeks(e.target.value)} className="rounded-lg border border-primary/30 bg-white px-2 py-1 text-primary">
            <option value="">Select Weeks</option>
            {Array.from({ length: Math.max(weeksLeft, 0) }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex justify-center gap-2 pt-2">
        <button type="button" disabled={busy} onClick={() => submit(false)} className="rounded-lg bg-primary px-5 py-2 font-bold text-white disabled:opacity-50">
          Add to cart
        </button>
        <button type="button" disabled={busy} onClick={() => submit(true)} className="rounded-lg border border-primary px-5 py-2 font-bold text-primary disabled:opacity-50">
          Buy
        </button>
      </div>
    </CalendarModal>
  );
}
