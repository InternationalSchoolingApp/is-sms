"use client";

import { useTranslations } from "next-intl";
import { SupText } from "@/components/student-enroll/FeePaymentPlans";

/**
 * Fee lines of one payment plan, in the order the legacy re-enrollment payment modal / review page shows them:
 * course fee, extra course / material fee, fee already paid (advance) in green, the discount box, then the
 * installment schedule (installment plans) and the payable fee.
 * `option` is a plan from buildPlanOptions(); `variantMode` picks one of its installment variants.
 */
function Lines({ details, sign = "+" }) {
  const tc = useTranslations("common");
  if (!details?.totalEntityFee > 0) return null;
  return (
    <div className="mb-2">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          {(details.description || []).map((line) => (
            <span key={line} className="my-1 block text-slate-700">
              <SupText>{line}</SupText>
            </span>
          ))}
        </div>
        <div className="text-right">
          {(details.entityFees || []).map((fee, index) => (
            <span key={index} className="my-1 block">
              {sign}
              {fee}
            </span>
          ))}
        </div>
      </div>
      <hr className="my-2 border-slate-200" />
      <div className="flex justify-between font-semibold text-slate-800">
        <span>{tc("words.total")}</span>
        <span>{details.totalEntityFeeString}</span>
      </div>
    </div>
  );
}

function Row({ label, value, strong, className = "" }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1 ${className}`}>
      <span className={strong ? "text-base font-bold text-black" : "font-semibold text-slate-800"}>{label}</span>
      <span className={strong ? "text-xl font-bold text-black" : "font-bold text-black"}>{value}</span>
    </div>
  );
}

function Discounts({ youSave }) {
  const t = useTranslations("reEnrollment.fee");
  const items = youSave?.entityDescriptions?.length
    ? youSave.entityDescriptions.map((item) => ({ label: item.entityDescription, fee: item.entityFee }))
    : (youSave?.description || []).map((label, index) => ({ label, fee: youSave.entityFees?.[index] }));
  if (items.length === 0) return null;
  return (
    <div className="my-2 rounded-[15px] border border-green-500 bg-[#F0FDF4] p-3">
      <h5 className="mb-2 text-base font-semibold text-black">{t("discounts")}</h5>
      {items.map((item, index) => (
        <div key={index} className="flex justify-between gap-3 py-0.5">
          <span>{index + 1}. <SupText>{item.label}</SupText></span>
          <span>-{item.fee}</span>
        </div>
      ))}
      <hr className="my-2 border-slate-300" />
      <div className="flex justify-between text-base font-bold text-black">
        <span>{t("youSave")}</span>
        <span>-{youSave.totalEntityFeeString}</span>
      </div>
    </div>
  );
}

/**
 * `advance`: the grade fee was already paid (advance) so the discounts, schedule and the payable fee come from
 * fee.advanceFeeDetails — the same fee lines the legacy review shows (getAdvancePaymentTable()), where the payable fee is
 * what is still due after the advance, not the plan's full amount.
 */
export function FeeBreakdown({ fee, option, variantMode, gradeName, advance = false, courseFeeLabel, payableOverride }) {
  const t = useTranslations("reEnrollment.fee");
  if (!fee) return null;
  const useAdvance = advance && Boolean(fee.advanceFeeDetails);
  if (!useAdvance && !option) return null;
  if (!useAdvance && option.kind === "registration") {
    return (
      <div className="text-sm">
        <Row label={t("payable")} value={fee.enrollmentFee?.enrollmentFeeString} strong />
        <p className="mt-1 text-xs text-slate-500">{t("seatNonRefundable", { fee: fee.enrollmentFee?.enrollmentFeeString ?? "" })}</p>
      </div>
    );
  }
  const installment = !useAdvance && option.kind === "monthly";
  const variant = installment ? option.variants?.find((v) => v.mode === variantMode) ?? option.variants?.[0] : null;
  const plan = useAdvance ? fee.advanceFeeDetails : installment ? variant?.details : fee.oneTimePayment;
  const alreadyPaid = fee.feeAlreayPaid;

  return (
    <div className="text-sm">
      <div className="flex justify-between font-semibold text-black">
        <span>{courseFeeLabel || t("feeFor", { grade: gradeName ?? "" })}</span>
        <span>{fee.courseFeeString}</span>
      </div>
      <hr className="my-2 border-slate-200" />
      {fee.courseExtraFeeDetails?.totalEntityFee > 0 && (
        <>
          <div className="mb-1 font-semibold text-slate-800">{t("extraCourseFee")}</div>
          <Lines details={fee.courseExtraFeeDetails} />
        </>
      )}
      {fee.courseMaterialFeeDetails?.totalEntityFee > 0 && (
        <>
          <div className="mb-1 font-semibold text-slate-800">{t("materialFee")}</div>
          <Lines details={fee.courseMaterialFeeDetails} />
        </>
      )}
      {alreadyPaid?.totalEntityFee > 0 && (
        <div className="mb-2 flex justify-between gap-3 font-semibold text-green-700">
          <span>{t("alreadyPaid")} <SupText>{(alreadyPaid.description || []).map((d) => `(${d})`).join(" ")}</SupText></span>
          <span className="text-right">
            {(alreadyPaid.entityFees || []).map((f, index) => (
              <span key={index} className="block">
                - {f}
              </span>
            ))}
          </span>
        </div>
      )}
      <Discounts youSave={plan?.youSave} />
      {(installment || useAdvance) && plan?.monthlyFees?.length > 0 && (
        <table className="my-2 w-full overflow-hidden rounded-lg border border-slate-200 text-sm">
          <thead>
            <tr className="bg-primary text-white">
              <th className="px-2 py-1.5 text-left">{t("schedule")}</th>
              <th className="px-2 py-1.5 text-right">{t("totalFee")}</th>
              <th className="px-2 py-1.5 text-right">{useAdvance ? t("status") : t("payingNow")}</th>
            </tr>
          </thead>
          <tbody>
            {plan.monthlyFees.map((monthly, index) => (
              <tr key={index} className="border-t border-slate-200">
                <td className="px-2 py-1.5"><SupText>{monthly.paymentLabel}</SupText></td>
                <td className="px-2 py-1.5 text-right">{monthly.amountString}</td>
                {useAdvance ? (
                  <td className={`px-2 py-1.5 text-right font-semibold ${monthly.status === "SUCCESS" ? "text-green-700" : "text-amber-600"}`}>
                    {monthly.status === "SUCCESS" ? t("paidOn", { date: monthly.paidDate ?? "" }) : t("scheduledOn", { date: monthly.scheduledDate ?? "" })}
                  </td>
                ) : (
                  <td className="px-2 py-1.5 text-right font-bold">{index === 0 ? monthly.amountString : ""}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Row label={t("payable")} value={payableOverride ?? plan?.payableFeeString} strong />
    </div>
  );
}
