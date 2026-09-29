"use client";

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

const TH = "border border-slate-200 px-3 py-2 text-left text-sm font-semibold";
const TD = "border border-slate-200 px-3 py-2 align-top text-sm";
const RIGHT = "text-right";

function money(currency, amount) {
  return `${currency}${Number(amount).toFixed(2)}`;
}

// Legacy reads a global `currency`; the fee strings already carry the symbol, so lift it from one.
function currencyOf(fee) {
  const match = String(fee?.courseFeeString || "").match(/^[^\d-]*/);
  return match ? match[0].trim() : "";
}

function FeeTable({ children, wide }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white">
        {wide && (
          <colgroup>
            <col style={{ width: "60%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
        )}
        <thead className="bg-primary text-white">
          <tr>
            <th className={TH}>Description</th>
            <th className={`${TH} text-center`}>Fee</th>
            <th className={`${TH} text-center`}>Total</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function PayableRow({ amount }) {
  return (
    <tr className="bg-primary/10 font-bold">
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
        <ol className="my-1 ml-5 list-decimal text-xs text-slate-600">
          {(details.description || []).map((desc, index) => (
            <li key={index}>{desc}</li>
          ))}
        </ol>
        <span>{totalLabel}</span>
      </td>
      <td className={`${TD} ${RIGHT}`}>
        <div>&nbsp;</div>
        <ul className="my-1 text-xs">
          {(details.entityFees || []).map((amount, index) => (
            <li key={index}>
              {sign} {amount}
            </li>
          ))}
        </ul>
      </td>
      <td className={`${TD} ${RIGHT} align-bottom`}>
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
      <FeeTable wide>
        <CommonRows fee={fee} standardId={standardId} isFlexOrDual={isFlexOrDual} />
        <DiscountRow youSave={monthly.youSave} />
        {showPayable && <PayableRow amount={monthly.payableFeeString} />}
      </FeeTable>
      <div className="mt-4">
        <h3 className="bg-slate-700 px-4 py-2 text-left text-base font-semibold tracking-wide text-white">FEE SCHEDULE</h3>
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
                  <td className={TD}>{monthlyFee.paymentLabel}</td>
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
      <p className="p-2 text-sm">
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
    <FeeTable wide>
      {(details.schedulePayments || []).map((payment, index) => (
        <tr key={index}>
          <td className={TD}>
            {payment.paymentTitle} {index === 0 ? " (to be paid at the time of enrollment)" : ""}
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {options.map((option) => {
          const checked = option.key === selected;
          return (
            <label
              key={option.key}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                checked ? "border-primary bg-primary text-white shadow-md" : "border-slate-200 bg-white text-primary hover:border-primary/50"
              } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
            >
              <input
                type="radio"
                name="payModeCheckboxes"
                className="h-4 w-4 accent-green-500"
                checked={checked}
                onChange={() => onSelect(option.key)}
                disabled={disabled}
              />
              <span className="leading-snug">
                <b className="block text-sm">{option.label}</b>
                <span className="block text-xl font-bold">{option.amount}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-4">
        {active?.kind === "registration" && <RegistrationTable fee={fee} />}
        {active?.kind === "annual" && <AnnualTable fee={fee} standardId={standardId} isFlexOrDual={isFlexOrDual} />}
        {active?.kind === "monthly" && <InstallmentTables fee={fee} standardId={standardId} isFlexOrDual={isFlexOrDual} />}
      </div>

      <p className="mt-3 text-center text-xs font-bold">
        <b>Note:</b> All fees mentioned above are in US Dollars
      </p>
    </div>
  );
}
