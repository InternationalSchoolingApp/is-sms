"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useParentChildFees } from "@/hooks/parent/useParentHome";
import { PaymentName } from "@/components/common/PaymentName";
import { dashboardNavHref } from "@/utils/dashboardNav";
import { allPaymentsSuccessful, duePayments } from "@/utils/parentHome";

const ARROW = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

/** The gold medal of the design board (static drawing). */
function Medal() {
  return (
    <span className="medal">
      <svg width="72" height="90" viewBox="0 0 76 96" aria-hidden="true">
        <defs>
          <clipPath id="pd-mc">
            <circle cx="38" cy="38" r="30" />
          </clipPath>
          <linearGradient id="pd-mg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFD24D" />
            <stop offset="1" stopColor="#F5A300" />
          </linearGradient>
        </defs>
        <path d="M22 50 10 88l14-6 8 12 8-30z" fill="#1F6BFF" />
        <path d="M54 50l12 38-14-6-8 12-8-30z" fill="#0A4BC2" />
        <circle cx="38" cy="38" r="30" fill="url(#pd-mg)" />
        <circle cx="38" cy="38" r="23" fill="#FFDA6B" stroke="#F5B400" strokeWidth="2" />
        <path d="m38 24 4.1 8.4 9.2 1.3-6.7 6.5 1.6 9.2-8.2-4.3-8.2 4.3 1.6-9.2-6.7-6.5 9.2-1.3z" fill="#F59E00" />
        <g clipPath="url(#pd-mc)">
          <rect className="shine" x="22" y="0" width="12" height="80" fill="#FFFFFF" opacity=".45" transform="skewX(-20)" />
        </g>
      </svg>
    </span>
  );
}

/**
 * "Due & Upcoming Payment" (design board): the selected child's SCHEDULED fees, each marked Due (date reached) or
 * Upcoming. There is no Pay button here (legacy has none); the arrow opens Fee Details, where paying lives. When every
 * fee is paid the card thanks the parent instead.
 */
export function PaymentsDueCard() {
  const { school } = useParams();
  const { isLoading, rows } = useParentChildFees();
  const due = duePayments(rows);
  const allPaid = allPaymentsSuccessful(rows);
  const feesHref = dashboardNavHref(school, "parent", "parent-fee-details");

  return (
    <section className="tile" aria-labelledby="pd-pay" style={{ animationDelay: ".12s" }}>
      <div className="feed-h">
        <h2 id="pd-pay">Due &amp; Upcoming Payment</h2>
      </div>
      <Link className="go" href={feesHref} aria-label="Open fee details">
        {ARROW}
      </Link>
      {isLoading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-[var(--soft)]" />
          ))}
        </div>
      ) : allPaid ? (
        <div className="pay">
          <Medal />
          <br />
          <span className="okpill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m5 12 5 5 9-10" />
            </svg>
            No payment due
          </span>
          <p>Your punctual payments reflect your strong commitment to your child&apos;s education. Thank you for your continued trust and support.</p>
        </div>
      ) : due.length === 0 ? (
        <p className="empty">No upcoming or due payments</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {due.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-[var(--soft)] px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--ink)]">
                  <PaymentName name={p.name} />
                </span>
                <span className="block text-xs text-[var(--mut)]">{p.date}</span>
              </span>
              <span className="chip2" style={p.overdue ? { background: "var(--redT)", color: "var(--red)" } : { background: "#FFF2CC", color: "#8A6100" }}>
                {p.overdue ? "Due" : "Upcoming"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
