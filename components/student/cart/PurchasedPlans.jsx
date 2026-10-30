"use client";

import { BookOpen } from "lucide-react";
import { formatAmount, hasEnded, weeksBetween, weeksLabel } from "@/utils/cartPlan";

/**
 * "Purchased Plans" table — legacy getPurchasedPlans(): the paid plans of the
 * selected course (all of them when the student has a single course).
 * `subjectId` null = no filtering.
 */
export function PurchasedPlans({ items, subjectId, symbol, isoCode }) {
  const rows = subjectId == null ? items : items.filter((item) => String(item.subjectId) === String(subjectId));
  if (rows.length === 0) return null;
  const subjectName = rows[0].subjectName;

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-black">
        <BookOpen className="h-6 w-6 rounded bg-primary p-1 text-white" aria-hidden="true" />
        Purchased Plans{subjectName ? ` - ${subjectName}` : ""}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-3 py-2">S.No</th>
              <th className="px-3 py-2">No. of Classes</th>
              <th className="px-3 py-2">Duration Plan</th>
              <th className="px-3 py-2">Fee Paid{isoCode ? ` (${isoCode})` : ""}</th>
              <th className="px-3 py-2">Plan Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={item.cartId ?? index} className="border-t border-slate-200 odd:bg-slate-50">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">{item.classCount}</td>
                <td className="px-3 py-2">
                  {item.planStartDate} to {item.planEndDate} ({weeksLabel(weeksBetween(item.planStartDate, item.planEndDate))})
                </td>
                <td className="px-3 py-2">{formatAmount(symbol, item.planAmount)}</td>
                <td className="px-3 py-2">
                  {hasEnded(item.planEndDate) ? <span className="text-red-600">Inactive</span> : <span className="text-primary">Active</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
