"use client";

import { ReceiptText } from "lucide-react";

/**
 * "Selected Fee Plan" block of the review screen — port of
 * getPaymentSelectionBodyContent() (and its table builders
 * commonPaymentTable / getAnnualPaymentTable / getMonthlyPaymentTable /
 * monthlyFeeShchedule / getBookAnEnrollmentTable / getCustomizedPaymentTable)
 * in signupStudentContent.js. Radio cards for each plan the backend offers,
 * then the breakdown table for whichever plan is selected.
 *
 * Everything is read straight off `feePaymentDetailsResponse` (`fee`); field
 * names are the backend's, spelled exactly as it sends them (e.g.
 * `feeAlreayPaid`).
 */

const TH = "px-4 py-3 text-xs font-bold text-slate-900";
const TD = "border-t border-slate-100 px-4 py-3 align-top text-xs text-slate-800";
const RIGHT = "text-right";

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

// The bordered card around every fee table ("Fee Summary" in the design), note included.
export function FeeSummaryCard({ children }) {
  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white px-7 py-6">
      <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-900">
        <ReceiptText className="h-6 w-6 text-primary" aria-hidden="true" /> Fee Summary
      </h3>
      <div className="mt-4">{children}</div>
      <p className="mt-4 text-center text-xs font-medium text-slate-800">
        Note: All fees mentioned above are in US Dollars
      </p>
    </section>
  );
}

function FeeTable({ children }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse bg-white">
        <colgroup>
          <col style={{ width: "58%" }} />
          <col style={{ width: "21%" }} />
          <col style={{ width: "21%" }} />
        </colgroup>
        <thead className="bg-slate-50">
          <tr>
            <th className={`${TH} text-left`}>Description</th>
            <th className={`${TH} text-right`}>Fee (USD)</th>
            <th className={`${TH} text-right`}>Total (USD)</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function PayableRow({ amount }) {
  return (
    <tr className="bg-slate-50 font-bold">
      <td className={TD}>Payable Fee</td>
      <td className={`${TD} ${RIGHT}`}>{amount}</td>
      <td className={`${TD} ${RIGHT}`}>{amount}</td>
    </tr>
  );
}

// One "Extra Course Fee" / "External Material Fee" / "Fee Discounts" / "Fee Already Paid" row:
// description list on the left, one amount per line, and the section total.
function BreakdownRow({ title, totalLabel, details, sign }) {
  return (
    <tr>
      <td className={TD}>
        <span>{title}</span>
        <ol className="my-0.5 list-inside list-decimal">
          {(details.description || []).map((desc, index) => (
            <li key={index}>
              <SupText>{desc}</SupText>
            </li>
          ))}
        </ol>
        <span className="font-bold">{totalLabel}</span>
      </td>
      <td className={`${TD} ${RIGHT}`} style={{ verticalAlign: "bottom" }}>
        <ul className="my-0.5">
          {(details.entityFees || []).map((amount, index) => (
            <li key={index}>
              {sign} {amount}
            </li>
          ))}
        </ul>
      </td>
      <td className={`${TD} ${RIGHT}`} style={{ verticalAlign: "bottom" }}>
        {sign} {details.totalEntityFeeString}
      </td>
    </tr>
  );
}

// commonPaymentTable(): course fee line plus extra / material / already-paid lines.
function CommonRows({ fee, standardId, isFlexOrDual }) {
  const enrollmentFeeAmount = fee.enrollmentFee ? fee.enrollmentFee.enrollmentFee : 0;
  const currency = currencyOf(fee);
  let label;
  if (enrollmentFeeAmount > 0) {
    label = isFlexOrDual ? "Course Fee" : "Total (Enrollment Fee + Course Fee)";
  } else {
    label = Number(standardId) === 20 ? "Total Course Fee + Enrollment Fee" : "Total Course Fee";
  }
  const courseFee = isFlexOrDual ? money(currency, parseFloat(fee.courseFee) - parseFloat(enrollmentFeeAmount)) : fee.courseFeeString;

  return (
    <>
      <tr>
        <td className={TD}>{label}</td>
        <td className={`${TD} ${RIGHT}`}>{courseFee}</td>
        <td className={`${TD} ${RIGHT}`}>{courseFee}</td>
      </tr>
      {fee.courseExtraFeeDetails?.totalEntityFee > 0 && (
        <BreakdownRow title="Extra Course Fee" totalLabel="Total Extra Course Fee" details={fee.courseExtraFeeDetails} sign="+" />
      )}
      {fee.courseMaterialFeeDetails?.totalEntityFee > 0 && (
        <BreakdownRow title="External Material Fee" totalLabel="Total External Material Fee" details={fee.courseMaterialFeeDetails} sign="+" />
      )}
      {fee.feeAlreayPaid?.totalEntityFee > 0 && (
        <BreakdownRow title="Fee Already Paid" totalLabel="Total Paid" details={fee.feeAlreayPaid} sign="-" />
      )}
    </>
  );
}

function DiscountRow({ youSave }) {
  if (!youSave?.description?.length) return null;
  return <BreakdownRow title="Fee Discounts" totalLabel="Total You Saved" details={youSave} sign="-" />;
}

// getAnnualPaymentTable()
function AnnualTable({ fee, standardId, isFlexOrDual }) {
  return (
    <FeeTable>
      <CommonRows fee={fee} standardId={standardId} isFlexOrDual={isFlexOrDual} />
      <DiscountRow youSave={fee.oneTimePayment?.youSave} />
      {isFlexOrDual && fee.enrollmentFee?.enrollmentFee > 0 && (
        <tr>
          <td className={TD}>Enrollment Fee</td>
          <td className={`${TD} ${RIGHT}`}>{fee.enrollmentFee.enrollmentFeeString}</td>
          <td className={`${TD} ${RIGHT}`}>{fee.enrollmentFee.enrollmentFeeString}</td>
        </tr>
      )}
      <PayableRow amount={fee.oneTimePayment.payableFeeString} />
    </FeeTable>
  );
}

// getMonthlyPaymentTable() + monthlyFeeShchedule() ("FEE SCHEDULE")
function InstallmentTables({ fee, standardId, isFlexOrDual }) {
  const monthly = fee.monthlyFeeDetails;
  // Payable Fee row only when something above changes the plain course fee.
  const showPayable =
    monthly.youSave?.description?.length > 0 || fee.courseExtraFeeDetails?.totalEntityFee > 0 || fee.feeAlreayPaid?.totalEntityFee > 0;
  return (
    <>
      <FeeTable>
        <CommonRows fee={fee} standardId={standardId} isFlexOrDual={isFlexOrDual} />
        <DiscountRow youSave={monthly.youSave} />
        {showPayable && <PayableRow amount={monthly.payableFeeString} />}
      </FeeTable>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <h3 className="bg-slate-50 px-4 py-3 text-left text-xs font-bold tracking-wide text-slate-900">FEE SCHEDULE</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white">
            <colgroup>
              <col style={{ width: "60%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
            <tbody>
              {(monthly.monthlyFees || []).map((monthlyFee, index) => (
                <tr key={index}>
                  <td className={TD}>
                    <SupText>{monthlyFee.paymentLabel}</SupText>
                  </td>
                  <td className={`${TD} ${RIGHT} font-bold`}>{monthlyFee.amountString}</td>
                  <td className={`${TD} ${RIGHT} font-bold`}>{index === 0 ? monthlyFee.amountString : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// getBookAnEnrollmentTable() + the non-refundable note
function RegistrationTable({ fee }) {
  return (
    <>
      <FeeTable>
        <PayableRow amount={fee.enrollmentFee.enrollmentFeeString} />
      </FeeTable>
      <p className="p-2 text-xs">
        Reserve an Enrollment Seat Fee of&nbsp;<b>{fee.enrollmentFee.enrollmentFeeString}</b>&nbsp;is non-refundable.
      </p>
    </>
  );
}

// getCustomizedPaymentTable(): fixed server-side plan, shown read-only with no radio cards.
export function CustomPlanTable({ fee }) {
  const details = fee?.paymentCalculationResponse?.paymentDetails;
  if (!details) return null;
  return (
    <FeeTable>
      {(details.schedulePayments || []).map((payment, index) => (
        <tr key={index}>
          <td className={TD}>
            <SupText>{payment.paymentTitle}</SupText> {index === 0 ? " (to be paid at the time of enrollment)" : ""}
          </td>
          <td className={`${TD} ${RIGHT}`}>{payment.payAmountString}</td>
          <td className={`${TD} ${RIGHT}`}>{payment.payAmountString}</td>
        </tr>
      ))}
      <PayableRow amount={details.totalPayableAmountString} />
    </FeeTable>
  );
}

export function FeePaymentPlans({ fee, options, selected, onSelect, disabled, standardId, isFlexOrDual }) {
  const active = options.find((option) => option.key === selected);
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {options.map((option) => {
          const checked = option.key === selected;
          return (
            <label
              key={option.key}
              className={`relative flex cursor-pointer flex-col justify-center rounded-xl border px-6 py-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 ${
                checked ? "border-primary bg-primary/10" : "border-slate-200 bg-white hover:border-primary/50"
              } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <input
                type="radio"
                name="payModeCheckboxes"
                className="sr-only"
                checked={checked}
                onChange={() => onSelect(option.key)}
                disabled={disabled}
              />
              <span className="text-sm text-slate-700">{option.label}</span>
              <span className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold leading-tight text-slate-900">{option.amount}</span>
                {option.badge && (
                  <span className="rounded bg-yellow-300 px-2 py-0.5 text-xs font-semibold text-slate-900">{option.badge}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      <FeeSummaryCard>
        {active?.kind === "registration" && <RegistrationTable fee={fee} />}
        {active?.kind === "annual" && <AnnualTable fee={fee} standardId={standardId} isFlexOrDual={isFlexOrDual} />}
        {active?.kind === "monthly" && <InstallmentTables fee={fee} standardId={standardId} isFlexOrDual={isFlexOrDual} />}
      </FeeSummaryCard>
    </div>
  );
}
