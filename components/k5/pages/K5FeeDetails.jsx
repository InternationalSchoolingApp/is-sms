"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { K5Loading, K5TableSkeleton } from "@/components/k5/K5Skeletons";

const PAGE_SIZE = 10;
const GRID = "56px minmax(130px,.9fr) minmax(100px,.7fr) minmax(220px,1.6fr) minmax(110px,.8fr) minmax(130px,.9fr) minmax(120px,.8fr) minmax(130px,.9fr)";
const COLUMNS = ["S.No", "Scheduled Date", "Grade", "Payment Name", "Paid Fee", "Paid Date", "Status", "Receipt"];
const CELL =
  "px-3.5 py-3 max-[760px]:order-2 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:[overflow-wrap:anywhere] max-[760px]:before:mb-0.5 max-[760px]:before:block max-[760px]:before:text-xs max-[760px]:before:font-black max-[760px]:before:text-k5-mut max-[760px]:before:content-[attr(data-l)]";

function paymentName(name) {
  return String(name || "")
    .split(/(<sup>.*?<\/sup>)/i)
    .map((part, index) => {
      const sup = part.match(/^<sup>(.*?)<\/sup>$/i);
      return sup ? <sup key={index}>{sup[1]}</sup> : part;
    });
}

function PageButton({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="min-h-11 cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-45"
    >
      {children}
    </button>
  );
}

const RETRY_STATUSES = ["PENDING", "FAILURE", "REJECTED"];

function feeAction(row, nextId, canView) {
  const { status, paymentTitle: title, pgName, paymentTransferType: transferType } = row;
  if (status === "SUCCESS") return canView ? { kind: "receipt" } : null;
  if (status === "INITIATED" && pgName === "CASH") return null;

  if (row.id === nextId) {
    if (RETRY_STATUSES.includes(status) && title !== "EXTENSION_FEE" && title !== "BOOKSESSION_FEE") {
      return { kind: "pay", label: "Try Again" };
    }
    if (status === "INITIATED" && (transferType == 3 || transferType == 0) && title !== "EXTENSION_FEE") {
      return { kind: "pay", label: "Try Again" };
    }
    if (status === "INITIATED" && transferType != 3) {
      if (pgName === "CONVERA") return { kind: "pay", label: "Change Payment Method", note: "Payment in Process" };
      return null;
    }
    if (title === "BOOKSESSION_FEE" || title === "EXTENSION_FEE") return null;
    return { kind: "pay", label: "Pay Now" };
  }

  if (RETRY_STATUSES.includes(status) && title !== "TEACHER REQUEST FEE" && title !== "BOOKSESSION_FEE") {
    return { kind: "pay", label: "Try Again" };
  }
  if (status === "INITIATED" && (transferType == 3 || transferType == 0)) return { kind: "pay", label: "Try Again" };
  return null;
}

export function K5FeeDetails({ isLoading, payments, nextUserPaymentDetailsId, symbol, canView, onPay }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  usePicoContentReady(!isLoading);

  const term = query.trim().toLowerCase();
  const filtered = term
    ? payments.filter((p) => [p.scheduledPayDate, p.standardName, p.paymentName, p.payDate, p.status].some((v) => String(v || "").toLowerCase().includes(term)))
    : payments;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const start = current * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
        <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-mt">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "var(--k5-mI)" }}>
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="M3 10h18M7 15h4" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">My Fee Details</h1>
          <p className="m-0 text-lg font-extrabold text-k5-mut">See your fee payments and receipts.</p>
        </div>
      </div>

      {isLoading ? (
        <K5Loading label="Loading your fee details">
          <K5TableSkeleton rows={4} cols={7} />
        </K5Loading>
      ) : (
        <section aria-labelledby="k5-fh" className={`${K5_CARD} flex flex-col gap-3.5 px-5 py-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="k5-fh" className="m-0 font-k5-display text-2xl font-semibold">Fee Details</h2>
            <label className="flex min-h-[50px] min-w-0 flex-[0_1_340px] items-center gap-2.5 rounded-full border-[3px] border-k5-line bg-k5-soft px-4 max-[760px]:flex-[1_1_100%]">
              <Search className="h-5 w-5 flex-none text-k5-mut" strokeWidth={3} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                placeholder="Search payments..."
                aria-label="Search payments..."
                className="min-w-0 flex-1 border-none bg-transparent text-base font-extrabold text-k5-ink outline-none"
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-[18px] border-[3px] border-k5-line max-[760px]:overflow-visible max-[760px]:border-0">
            <div role="table" aria-label="Fee Details" className="min-w-[1060px] text-[15px] font-extrabold max-[760px]:flex max-[760px]:min-w-0 max-[760px]:flex-col max-[760px]:gap-2.5">
              <div role="row" style={{ "--cols": GRID }} className="grid grid-cols-[var(--cols)] bg-k5-ac font-k5-display text-base font-semibold text-white max-[760px]:hidden">
                {COLUMNS.map((c) => (
                  <span key={c} role="columnheader" className="p-3.5">{c}</span>
                ))}
              </div>
              {visible.map((payment, i) => {
                const serial = start + i + 1;
                const action = feeAction(payment, nextUserPaymentDetailsId, canView);
                const success = payment.status === "SUCCESS";
                return (
                  <div
                    key={payment.id ?? serial}
                    role="row"
                    style={{ "--cols": GRID }}
                    className={`grid grid-cols-[var(--cols)] items-center border-t-2 border-k5-line max-[760px]:grid-cols-2 max-[760px]:rounded-[18px] max-[760px]:border-[3px] max-[760px]:py-1.5 ${i % 2 ? "bg-k5-soft" : "bg-k5-card"}`}
                  >
                    <span role="cell" className="px-3.5 py-3 max-[760px]:order-1 max-[760px]:px-3 max-[760px]:py-1.5 max-[760px]:font-k5-display max-[760px]:text-lg max-[760px]:font-semibold">{serial}</span>
                    <span role="cell" data-l="Scheduled Date" className={`${CELL} max-[760px]:col-span-full`}>{payment.scheduledPayDate || "N/A"}</span>
                    <span role="cell" data-l="Grade" className={`${CELL} max-[760px]:col-span-full`}>{payment.standardName || "N/A"}</span>
                    <span role="cell" data-l="Payment Name" className={`${CELL} max-[760px]:col-span-full`}>{payment.paymentName ? paymentName(payment.paymentName) : "N/A"}</span>
                    <span role="cell" data-l="Paid Fee" className={`${CELL} font-k5-display text-[17px] font-semibold max-[760px]:col-span-full`}>{`${symbol} ${payment.totalFeeWithMaterialFee ?? ""}`.trim()}</span>
                    <span role="cell" data-l="Paid Date" className={`${CELL} max-[760px]:col-span-full`}>{payment.payDate || "--"}</span>
                    <span role="cell" data-l="Status" className={`${CELL} max-[760px]:col-span-full`}>
                      {success ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#E4F4EA] py-1 pe-3 ps-1 text-[13px] font-black tracking-wide text-[#0E5A31]">
                          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-[#13803F]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                          </span>
                          {payment.dummyStatusLabel || "SUCCESS"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-k5-soft py-1 pe-3 ps-1 text-[13px] font-black tracking-wide text-k5-mut">
                          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-k5-line">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" style={{ stroke: "var(--k5-card)" }}><circle cx="12" cy="12" r="7" /><path d="M12 8.5V12l2.5 1.5" /></svg>
                          </span>
                          {payment.dummyStatusLabel || payment.status || "SCHEDULED"}
                        </span>
                      )}
                    </span>
                    <span role="cell" data-l="Receipt" className={`${CELL} max-[760px]:col-span-full`}>
                      {action?.note && <span className="text-sm text-k5-mut">{action.note}</span>}
                      {action?.kind === "receipt" && (
                        <a
                          href={payment.recieptLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[42px] cursor-pointer items-center whitespace-nowrap rounded-full border-[3px] border-k5-ac bg-k5-card px-4 font-k5-display text-[15px] font-semibold text-k5-acx no-underline"
                        >
                          View Receipt
                        </a>
                      )}
                      {action?.kind === "pay" && (
                        <button
                          type="button"
                          onClick={() => onPay?.(payment.id)}
                          className="inline-flex min-h-[42px] cursor-pointer items-center whitespace-nowrap rounded-full border-none bg-k5-ac px-[18px] font-k5-display text-[15px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)]"
                        >
                          {action.label}
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
              {visible.length === 0 && <div className="px-4 py-7 text-center font-k5-display text-[19px] font-semibold text-k5-mut">No fee details found.</div>}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-[15px] font-extrabold text-k5-mut">
              {filtered.length ? `Showing ${start + 1}-${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}` : "Showing 0"}
            </span>
            <nav aria-label="Pages" className="flex items-center gap-2">
              <PageButton disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</PageButton>
              <button type="button" aria-current="page" className="h-11 min-w-11 rounded-[14px] border-[3px] border-k5-ac bg-k5-ac px-1.5 font-k5-display text-[17px] font-semibold text-white">
                {current + 1}
              </button>
              <PageButton disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</PageButton>
            </nav>
          </div>
        </section>
      )}
    </div>
  );
}
