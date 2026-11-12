"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Award, Wallet } from "lucide-react";
import { useParentChildFees } from "@/hooks/parent/useParentHome";
import { PaymentName } from "@/components/common/PaymentName";
import { dashboardNavHref } from "@/utils/dashboardNav";
import { allPaymentsSuccessful, duePayments } from "@/utils/parentHome";

/**
 * "Due & Upcoming Payment": the selected child's SCHEDULED fees, each marked Due (date reached) or Upcoming. There is
 * no Pay button here (legacy has none); View All opens Fee Details, where paying lives. When every fee is paid the
 * card thanks the parent instead.
 */
export function PaymentsDueCard() {
  const { school } = useParams();
  const { isLoading, rows } = useParentChildFees();
  const due = duePayments(rows);
  const allPaid = allPaymentsSuccessful(rows);
  const feesHref = dashboardNavHref(school, "parent", "parent-fee-details");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-extrabold text-black">Due &amp; Upcoming Payment</h2>
      <div className="max-h-[250px] overflow-y-auto px-5 py-3">
        {isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : allPaid ? (
          <div className="py-4 text-center">
            <Award className="mx-auto h-10 w-10 text-amber-500" aria-hidden="true" />
            <p className="mt-2 text-sm text-black/70">
              Your punctual payments reflect your strong commitment to your child&apos;s education. Thank you for your continued trust and support.
            </p>
          </div>
        ) : due.length === 0 ? (
          <p className="py-6 text-center text-sm text-black/60">No upcoming or due payments</p>
        ) : (
          <ul className="space-y-2">
            {due.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Wallet className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-black"><PaymentName name={p.name} /></span>
                  <span className="block text-xs text-black/60">{p.date}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${p.overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  {p.overdue ? "Due" : "Upcoming"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!allPaid && rows.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-2.5 text-right">
          <Link href={feesHref} className="text-xs font-bold text-primary no-underline">View All →</Link>
        </div>
      )}
    </section>
  );
}
