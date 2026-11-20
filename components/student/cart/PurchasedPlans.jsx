"use client";

import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { MobileTableCard } from "@/components/student/MobileTableCard";
import { formatAmount, hasEnded } from "@/utils/cartPlan";

/**
 * "Purchased Plans" table — legacy getPurchasedPlans(): the paid plans of the
 * selected course (all of them when the student has a single course).
 * `subjectId` null = no filtering.
 */
export function PurchasedPlans({ items, subjectId, symbol, isoCode }) {
  const t = useTranslations("cart.purchased");
  const rows = subjectId == null ? items : items.filter((item) => String(item.subjectId) === String(subjectId));
  if (rows.length === 0) return null;
  const subjectName = rows[0].subjectName;

  return (
    <div className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-black">
        <BookOpen className="h-6 w-6 rounded bg-primary p-1 text-white" aria-hidden="true" />
        {subjectName ? t("titleWithCourse", { course: subjectName }) : t("title")}
      </h2>
      {/* Mobile: one card per plan (column title beside each value). */}
      <ul className="space-y-3 md:hidden">
        {rows.map((item, index) => (
          <li key={item.cartId ?? index}>
            <MobileTableCard
              rows={[
                { label: t("sNo"), value: index + 1 },
                { label: t("classes"), value: item.classCount },
                { label: isoCode ? t("feePaidIn", { currency: isoCode }) : t("feePaid"), value: formatAmount(symbol, item.planAmount) },
                {
                  label: t("planStatus"),
                  value: hasEnded(item.planEndDate) ? <span className="text-red-600">{t("inactive")}</span> : <span className="text-primary">{t("active")}</span>,
                },
              ]}
            />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-3 py-2">{t("sNo")}</th>
              <th className="px-3 py-2">{t("classes")}</th>
              <th className="px-3 py-2">{isoCode ? t("feePaidIn", { currency: isoCode }) : t("feePaid")}</th>
              <th className="px-3 py-2">{t("planStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr key={item.cartId ?? index} className="border-t border-slate-200 odd:bg-slate-50">
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">{item.classCount}</td>
                <td className="px-3 py-2">{formatAmount(symbol, item.planAmount)}</td>
                <td className="px-3 py-2">
                  {hasEnded(item.planEndDate) ? <span className="text-red-600">{t("inactive")}</span> : <span className="text-primary">{t("active")}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
