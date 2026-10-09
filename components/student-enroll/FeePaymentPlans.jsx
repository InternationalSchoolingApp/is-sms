"use client";

import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * "Select Payment Option" / "Choose how to pay" block of the review screen —
 * port of getPaymentSelectionBodyContent() (and its table builders
 * commonPaymentTable / getAnnualPaymentTable / getMonthlyPaymentTable /
 * monthlyFeeShchedule / getBookAnEnrollmentTable / getCustomizedPaymentTable)
 * in signupStudentContent.js, redrawn to the flat "due now" hero card + Fee
 * Summary + payment-schedule timeline design (replaces the previous
 * bordered-table layout).
 *
 * Everything is read straight off `feePaymentDetailsResponse` (`fee`); field
 * names are the backend's, spelled exactly as it sends them (e.g.
 * `feeAlreayPaid`).
 */

const ORDINAL_WORDS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];

// The backend sends labels like "1<sup>st</sup> month fee"; render the <sup> as real superscript
// without injecting the string as HTML.
function SupText({ children }) {
  return String(children ?? "")
    .split(/(<sup>.*?<\/sup>)/gi)
    .map((part, index) => {
      const match = part.match(/^<sup>(.*?)<\/sup>$/i);
      return match ? <sup key={index}>{match[1]}</sup> : part;
    });
}

function money(currency, amount) {
  return `${currency}${Number(amount).toFixed(2)}`;
}

// Legacy reads a global `currency`; the fee strings already carry the symbol, so lift it from one.
function currencyOf(fee) {
  const match = String(fee?.courseFeeString || "").match(/^[^\d-]*/);
  return match ? match[0].trim() : "";
}

function ordinal(index) {
  return ORDINAL_WORDS[index] || `${index + 1}th`;
}

// "3, 4 or 5 months" — the Installments card's subtitle while it isn't the selected option yet
// (its exact total only applies once a specific month-count is chosen).
function describeMonths(chips) {
  const months = chips.map((chip) => chip.months).filter(Boolean);
  if (months.length === 0) return "Installments";
  if (months.length === 1) return `${months[0]} months`;
  return `${months.slice(0, -1).join(", ")} or ${months[months.length - 1]} months`;
}

// Dark "due now" hero tile — the one-time payment, or the next installment, due right now.
function DueNowCard({ eyebrow, amount, subtitle }) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl bg-primary px-5 py-5 text-white md:mt-5 md:px-7 md:py-6">
      <p className="relative text-[11px] font-bold uppercase tracking-wide text-white md:text-xs">{eyebrow}</p>
      <p className="relative mt-1 text-[28px] font-extrabold leading-tight md:text-[32px]">{amount}</p>
      <p className="relative mt-1 text-sm font-semibold text-white md:text-base">Due now</p>
      <p className="relative mt-0.5 text-xs text-white md:text-sm">{subtitle}</p>
    </div>
  );
}

// One "label  amount" line inside the flat Fee Summary / schedule total — replaces the old bordered
// table rows with the design's plain description : value list.
function SummaryRow({ label, amount, tone, bold }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className={bold ? "font-bold text-black md:text-base" : "text-black-700"}>{label}</span>
      <span
        className={`whitespace-nowrap ${
          bold
            ? "font-bold text-black md:text-base"
            : tone === "discount"
              ? "font-medium text-emerald-600"
              : "font-medium text-black"
        }`}
      >
        {amount}
      </span>
    </div>
  );
}

// Itemized Fee Summary block — "Extra Course Fee" / "External Material Fee" / "Fee Already Paid",
// each with its own description list (course names, etc.) before the section's own total line.
// Mirrors the old BreakdownRow table cell, laid out flat instead of in table columns.
function BreakdownBlock({ title, totalLabel, items, totalAmount, sign, tone }) {
  return (
    <div className="py-1.5 text-sm">
      <span className="text-black-700 font-semibold">{title}</span>
      <ol className="my-1 list-inside list-decimal text-black-700">
        {items.map((item, index) => (
          <li key={index} className="flex items-baseline justify-between gap-4 py-0.5">
            <span>
              <SupText>{item.desc}</SupText>
            </span>
            <span className="whitespace-nowrap font-medium text-black">
              {sign} {item.amount}
            </span>
          </li>
        ))}
      </ol>
      
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-bold text-black">{totalLabel}</span>
        <span className={`whitespace-nowrap font-bold ${tone === "discount" ? "text-emerald-600" : "text-black"}`}>
          {sign} {totalAmount}
        </span>
      </div>
    </div>
  );
}

// "You save ..." banner under the Fee Summary, shown whenever a discount applies.
function SavingsBanner({ text }) {
  return (
    <div className="mt-4 flex justify-center items-center gap-2 rounded-lg bg-[#e5f7e4] px-4 py-3 text-sm font-semibold text-dark">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-dark" aria-hidden="true" />
      {text}
    </div>
  );
}

// Flat "Fee summary" card: any extra/material/already-paid/discount lines, then (when given) the total.
function FeeSummaryFlat({ rows, total, savings, note }) {
  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 md:mt-5 md:px-4 md:py-3">
      <h3 className="text-base font-bold text-black md:text-lg">Fee summary</h3>
      <div className="mt-2 divide-y divide-slate-100">
        {rows.map((row, index) =>
          row.items ? <BreakdownBlock key={index} {...row} /> : <SummaryRow key={index} {...row}  />
        )}
        {total && (
          <div className="pt-2">
            <SummaryRow label={total.label} amount={total.amount} bold />
          </div>
        )}
      </div>
      {savings && <SavingsBanner text={savings} />}
      {note && <p className="mt-3 text-center text-xs text-black-800">{note}</p>}
    </section>
  );
}

// "Your payment schedule" numbered timeline — replaces the old FEE SCHEDULE table for installment
// and custom (admin-set) plans. `items` is [{ title, caption, amount }], first entry is "due now".
function PaymentScheduleList({ items, total, note }) {
  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 md:mt-5 md:px-4 md:py-3">
      <h3 className="text-base font-bold text-black md:text-lg">Your payment schedule</h3>
      <ol className="mt-3">
        {items.map((item, index) => (
          <li key={index} className="relative flex gap-3 pb-5 last:pb-0">
            {index < items.length - 1 && (
              <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-18px)] w-px bg-slate-200" />
            )}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs border border-slate-300 font-bold ${
                index === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pt-1">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-black">
                  {item.title}
                  {index === 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      Pay today
                    </span>
                  )}
                </p>
                {item.caption && <p className="text-xs text-black-700">{item.caption}</p>}
              </div>
              <span className="shrink-0 text-sm font-bold text-black">{item.amount}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-1 border-t border-slate-200 pt-3">
        <SummaryRow label={total.label} amount={total.amount} bold />
      </div>
      {note && <p className="mt-2 text-xs text-black-800 text-center">{note}</p>}
    </section>
  );
}

// commonPaymentTable()'s course/enrollment-fee line, as a single flat row.
function baseRow({ fee, standardId, isFlexOrDual }) {
  const enrollmentFeeAmount = fee.enrollmentFee ? fee.enrollmentFee.enrollmentFee : 0;
  const currency = currencyOf(fee);
  let label;
  if (enrollmentFeeAmount > 0) {
    label = isFlexOrDual ? "Course fee" : "Enrollment fee + course fee";
  } else {
    label = Number(standardId) === 20 ? "Course fee + enrollment fee" : "Course fee";
  }
  const amount = isFlexOrDual
    ? money(currency, parseFloat(fee.courseFee) - parseFloat(enrollmentFeeAmount))
    : fee.courseFeeString;
  return { label, amount };
}

// Extra Course Fee / External Material Fee / Fee Already Paid — each rendered as an itemized
// BreakdownBlock (description list + that section's own total), same data as the old table.
function breakdownBlock({ title, totalLabel, details, sign, tone }) {
  const items = (details.description || []).map((desc, index) => ({
    desc,
    amount: details.entityFees?.[index],
  }));
  return { title, totalLabel, items, totalAmount: details.totalEntityFeeString, sign, tone };
}

function buildExtraRows(fee) {
  const rows = [];
  if (fee.courseExtraFeeDetails?.totalEntityFee > 0) {
    rows.push(
      breakdownBlock({
        title: "Extra Course Fee",
        totalLabel: "Total",
        // Course names carry a "(X Credits)" suffix in the raw description — stripped here same as
        // the legacy table, which drops it to keep this list to just the course name.
        details: {
          ...fee.courseExtraFeeDetails,
          description: (fee.courseExtraFeeDetails.description || []).map((desc) =>
            String(desc).replace(/\s*\(\s*\d+(?:\.\d+)?\s*Credits?\s*\)/gi, "")
          ),
        },
        sign: "+",
      })
    );
  }
  if (fee.courseMaterialFeeDetails?.totalEntityFee > 0) {
    rows.push(
      breakdownBlock({ title: "External Material Fee", totalLabel: "Total", details: fee.courseMaterialFeeDetails, sign: "+" })
    );
  }
  if (fee.feeAlreayPaid?.totalEntityFee > 0) {
    rows.push(
      breakdownBlock({
        title: "Fee Already Paid",
        totalLabel: "Total Paid",
        details: fee.feeAlreayPaid,
        sign: "-",
        tone: "discount",
      })
    );
  }
  return rows;
}

function discountRow(youSave, label) {
  if (!youSave?.description?.length) return null;
  return { label, amount: `- ${youSave.totalEntityFeeString}`, tone: "discount" };
}

// getAnnualPaymentTable() — one-time "Pay in Full" plan.
function AnnualSummary({ fee, standardId, isFlexOrDual }) {
  const rows = [baseRow({ fee, standardId, isFlexOrDual }), ...buildExtraRows(fee)];
  if (isFlexOrDual && fee.enrollmentFee?.enrollmentFee > 0) {
    rows.push({ label: "Enrollment fee", amount: fee.enrollmentFee.enrollmentFeeString });
  }
  const discount = discountRow(fee.oneTimePayment?.youSave, "Pay-in-full discount");
  if (discount) rows.push(discount);

  return (
    <>
      <DueNowCard
        eyebrow="PAY IN FULL"
        amount={fee.oneTimePayment.payableFeeString}
        subtitle={fee.enrollmentFee?.enrollmentFee > 0 ? "Enrollment fee + course fee" : "Course fee"}
      />
      <FeeSummaryFlat
        rows={rows}
        total={{ label: "Total payable now", amount: fee.oneTimePayment.payableFeeString }}
        savings={discount ? `You save ${fee.oneTimePayment.youSave.totalEntityFeeString}` : undefined}
        note="Note: All fees mentioned above are in US Dollars"
      />
    </>
  );
}

// getMonthlyPaymentTable() + monthlyFeeShchedule() — Installments plan (3/4/5/6-month variants).
function InstallmentSummary({ fee, details, standardId, isFlexOrDual }) {
  const monthly = details || fee.monthlyFeeDetails;
  const monthlyFees = monthly.monthlyFees || [];
  const rows = [baseRow({ fee, standardId, isFlexOrDual }), ...buildExtraRows(fee)];
  if (isFlexOrDual && fee.enrollmentFee?.enrollmentFee > 0) {
    rows.push({ label: "Enrollment fee", amount: fee.enrollmentFee.enrollmentFeeString });
  }
  const discount = discountRow(monthly.youSave, "Fee discount");
  if (discount) rows.push(discount);

  const scheduleItems = monthlyFees.map((monthlyFee, index) => ({
    title: `${ordinal(index)} payment`,
    caption: index === 0 ? "Due now" : `${index * 30} days after start date`,
    amount: monthlyFee.amountString,
  }));

  return (
    <>
      <DueNowCard
        eyebrow={`PAYMENT 1 OF ${monthlyFees.length}`}
        amount={monthlyFees[0]?.amountString}
        subtitle={fee.enrollmentFee?.enrollmentFee > 0 ? "Enrollment fee + first installment" : "First installment"}
      />
      <FeeSummaryFlat
        rows={rows}
        total={{ label: "Payable Fee", amount: monthly.payableFeeString }}
        savings={discount ? `You save ${monthly.youSave.totalEntityFeeString}` : undefined}
      />
      <PaymentScheduleList
        items={scheduleItems}
        total={{ label: "Total program fee", amount: monthly.payableFeeString }}
        note="Note: All fees mentioned above are in US Dollars"
      />
    </>
  );
}

// getBookAnEnrollmentTable() — "Reserve an Enrollment Seat", a single non-refundable fee.
function RegistrationSummary({ fee }) {
  return (
    <>
      <DueNowCard eyebrow="RESERVE A SEAT" amount={fee.enrollmentFee.enrollmentFeeString} subtitle="Enrollment seat fee" />
      <p className="mt-3 text-center text-xs text-slate-500">
        Reserve an Enrollment Seat Fee of <b>{fee.enrollmentFee.enrollmentFeeString}</b> is non-refundable.
      </p>
    </>
  );
}

// getCustomizedPaymentTable(): fixed server-side plan (no Pay in Full / Installments choice), shown
// read-only as the same hero + schedule design.
export function CustomPlanTable({ fee }) {
  const details = fee?.paymentCalculationResponse?.paymentDetails;
  const payments = details?.schedulePayments || [];
  if (payments.length === 0) return null;

  const scheduleItems = payments.map((payment, index) => ({
    title: <SupText>{payment.paymentTitle}</SupText>,
    caption: index === 0 ? "Due at the time of enrollment" : undefined,
    amount: payment.payAmountString,
  }));

  return (
    <div>
      <DueNowCard
        eyebrow={payments.length > 1 ? `PAYMENT 1 OF ${payments.length}` : "PAYMENT DUE"}
        amount={payments[0]?.payAmountString}
        subtitle="Due at the time of enrollment"
      />
      <PaymentScheduleList
        items={scheduleItems}
        total={{ label: "Total program fee", amount: details.totalPayableAmountString }}
        note="Note: All fees mentioned above are in US Dollars"
      />
    </div>
  );
}

export function FeePaymentPlans({ fee, options, selected, onSelect, selectedVariant, onSelectVariant, disabled, standardId, isFlexOrDual }) {
  const active = options.find((option) => option.key === selected);
  const activeChips = active?.variants?.length > 1 ? active.variants : null;
  const activeVariant = active?.variants?.find((variant) => variant.mode === selectedVariant) || active?.variants?.[0];

  // Scrolls the Fee Summary into view on a user click — never on the initial/prefilled
  // selection — so picking a plan on mobile (where the summary starts off-screen below the
  // cards) brings its breakdown into view.
  const summaryRef = useRef(null);
  function selectAndScroll(key) {
    onSelect(key);
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      {/* A single plan option spans the full width instead of leaving an empty second column.
          Two options sit side by side at every width, mobile included — they never stack to
          full-width rows on small screens. */}
      <div className={`grid grid-cols-1 gap-2 md:gap-4 ${options.length > 1 ? "grid-cols-2" : ""}`}>
        {options.map((option) => {
          const checked = option.key === selected;
          const chips = option.variants?.length > 1 ? option.variants : null;
          const shownVariant = checked ? activeVariant : chips?.[0];
          return (
            <label
              key={option.key}
              className={`block min-w-0 min-h-[104px] rounded-2xl border-2 px-3 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 md:min-h-[136px] md:px-5 md:py-5 ${
                checked ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-primary/40"
              } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="payModeCheckboxes"
                className="sr-only"
                checked={checked}
                onChange={() => selectAndScroll(option.key)}
                disabled={disabled}
              />
              <span className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 md:h-5 md:w-5 ${
                    checked ? "border-primary" : "border-slate-400"
                  }`}
                >
                  {checked && <span className="h-2 w-2 rounded-full bg-primary md:h-2.5 md:w-2.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-700 md:text-sm">{option.label}</span>
                  {chips ? (
                    checked ? (
                      <span className="mt-1 block text-base font-bold text-black md:text-2xl">
                        {(shownVariant ?? chips[0]).amount} total
                      </span>
                    ) : (
                      <span className="mt-1 block text-xs font-medium text-slate-500 md:text-sm">{describeMonths(chips)}</span>
                    )
                  ) : (
                    <span className="mt-1 block text-base font-bold text-black md:text-2xl">{option.amount}</span>
                  )}
                  {option.savings && (
                    <span className="mt-1 block text-[11px] w-fit px-3 py-1 rounded-2xl font-bold bg-[#3fa43c] text-white md:text-xs">{option.savings}</span>
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {activeChips && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeChips.map((variant) => {
            const on = variant.mode === activeVariant?.mode;
            return (
              <button
                key={variant.mode}
                type="button"
                disabled={disabled}
                onClick={() => onSelectVariant?.(variant.mode)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  on ? "border-primary bg-primary/10 text-primary" : "border-slate-300 bg-white text-slate-600 hover:border-primary/50"
                } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
              >
                {variant.label}
              </button>
            );
          })}
        </div>
      )}

      <div ref={summaryRef} className="scroll-mt-28 md:scroll-mt-20">
        {active?.kind === "registration" && <RegistrationSummary fee={fee} />}
        {active?.kind === "annual" && <AnnualSummary fee={fee} standardId={standardId} isFlexOrDual={isFlexOrDual} />}
        {active?.kind === "monthly" && (
          <InstallmentSummary fee={fee} details={activeVariant?.details} standardId={standardId} isFlexOrDual={isFlexOrDual} />
        )}
      </div>
    </div>
  );
}
