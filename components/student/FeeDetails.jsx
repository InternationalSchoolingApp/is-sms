"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { FullScreenLoader } from "@/components/common/Loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { CheckoutExtraDialogs } from "@/components/common/CheckoutExtraDialogs";
import { MobileTableCard } from "@/components/student/MobileTableCard";
import { TableFooter } from "@/components/student/TableFooter";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useCartCheckout } from "@/hooks/useCartCheckout";
import { useModuleRights } from "@/hooks/useModuleRights";
import { useSchoolCurrency } from "@/hooks/useStudentCart";
import { K5FeeDetails } from "@/components/k5/pages/K5FeeDetails";
import { useStudentFeeDetails } from "@/hooks/useStudentFeeDetails";
import { useLabelTranslator } from "@/i18n/labels";

const PAGE_SIZE = 10;
const HEADERS = ["S.No", "Scheduled Date", "Grade", "Payment Name", "Paid Fee", "Paid Date", "Status", "View Receipt"];
// fees.table.* — the shown column titles (HEADERS stay the React keys).
const HEADER_KEYS = ["sNo", "scheduledDate", "grade", "paymentName", "paidFee", "paidDate", "status", "viewReceipt"];
const RETRY_STATUSES = ["PENDING", "FAILURE", "REJECTED"];

// Installment names carry ordinal suffixes as markup ("1<sup>st</sup> of 3"), which legacy injected
// as HTML; render just those <sup> parts, everything else stays text.
function paymentName(name) {
  return String(name || "")
    .split(/(<sup>.*?<\/sup>)/i)
    .map((part, index) => {
      const sup = part.match(/^<sup>(.*?)<\/sup>$/i);
      return sup ? <sup key={index}>{sup[1]}</sup> : part;
    });
}

/**
 * The last column's action — legacy getStudentFeeDetailsRowsHtml, branch for branch. The row
 * that is next due (nextUserPaymentDetailsId) gets the full set (Pay Now / Change Payment
 * Method); every other unpaid row can only be retried.
 * Returns { kind: "receipt" | "pay", label?, note? } or null; label / note are fees.actions.* keys.
 */
function feeAction(row, nextId, schoolNumericId, canView) {
  const { status, paymentTitle: title, pgName, paymentTransferType: transferType } = row;
  if (status === "SUCCESS") return canView ? { kind: "receipt" } : null;
  if (status === "INITIATED" && pgName === "CASH") return null;

  if (row.id === nextId) {
    if (RETRY_STATUSES.includes(status) && title !== "EXTENSION_FEE" && title !== "BOOKSESSION_FEE") {
      return { kind: "pay", label: "tryAgain" };
    }
    if (status === "INITIATED" && (transferType == 3 || transferType == 0) && title !== "EXTENSION_FEE") {
      return { kind: "pay", label: "tryAgain" };
    }
    if (status === "INITIATED" && transferType != 3) {
      if (pgName === "CONVERA") return { kind: "pay", label: "changePaymentMethod", note: "paymentInProcess" };
      if (schoolNumericId == 5 && pgName === "WireTransfer") return { note: "paymentUnderProcess" };
      return null;
    }
    if (title === "BOOKSESSION_FEE" || title === "EXTENSION_FEE") return null;
    return { kind: "pay", label: "payNow" };
  }

  if (RETRY_STATUSES.includes(status) && title !== "TEACHER REQUEST FEE" && title !== "BOOKSESSION_FEE") {
    return { kind: "pay", label: "tryAgain" };
  }
  if (status === "INITIATED" && (transferType == 3 || transferType == 0)) return { kind: "pay", label: "tryAgain" };
  return null;
}

/**
 * Fee Details ("My Fee Details") — legacy studentFeeDetails.js + studentFeeDetailsContent.js
 * ("Fee Details" DataTable). Pay Now / Try Again run the same checkPayment -> gateway picker
 * chain as the cart (useCartCheckout); View Receipt opens the receipt link, gated on the
 * module's viewed right like legacy roleAndModule.viewed.
 */
export function FeeDetails() {
  const t = useTranslations("fees");
  const tc = useTranslations("common");
  const statusLabel = useLabelTranslator("fees.statuses");
  const headers = HEADER_KEYS.map((key) => t(`table.${key}`));
  const { context, isK5 } = useDashboardContext();
  const { schoolUUID, userId, schoolNumericId } = context ?? {};
  const { isLoading, payments, nextUserPaymentDetailsId, refetch } = useStudentFeeDetails({ schoolUUID, userId });
  const { canView } = useModuleRights("fee-details");
  const currencyQuery = useSchoolCurrency(schoolNumericId);
  const symbol = currencyQuery.data?.symbol ?? "";
  const [page, setPage] = useState(0);
  const checkout = useCartCheckout({
    context,
    onPaid: () => {
      refetch();
      toast.success(t("paymentReceived"));
    },
  });

  const rows = useMemo(
    () =>
      payments.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE).map((payment, index) => ({
        payment,
        serial: page * PAGE_SIZE + index + 1,
        action: feeAction(payment, nextUserPaymentDetailsId, schoolNumericId, canView),
      })),
    [payments, page, nextUserPaymentDetailsId, schoolNumericId, canView],
  );

  const actionCell = ({ payment, action }) => {
    if (!action) return null;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {action.note && <span>{t(`actions.${action.note}`)}</span>}
        {action.kind === "receipt" && (
          <a
            href={payment.recieptLink}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-primary px-2 py-1 text-primary hover:bg-primary hover:text-white"
          >
            {t("actions.viewReceipt")}
          </a>
        )}
        {action.kind === "pay" && (
          <button
            type="button"
            onClick={() => checkout.start(payment.id)}
            disabled={checkout.preparing}
            className="rounded bg-primary px-3 py-1 text-white disabled:opacity-60"
          >
            {t(`actions.${action.label}`)}
          </button>
        )}
      </div>
    );
  };

  const cells = (row) => {
    const { payment } = row;
    const success = payment.status === "SUCCESS";
    return [
      row.serial,
      payment.scheduledPayDate || "",
      payment.standardName || "",
      payment.paymentName ? paymentName(payment.paymentName) : "",
      `${symbol} ${payment.totalFeeWithMaterialFee ?? ""}`.trim(),
      payment.payDate || "--",
      <span key="status" className={success ? "font-bold text-[#58D68D]" : ""}>
        {/* Legacy shows the dummy row's own label ("PAID") in dummy mode; real rows never carry it. */}
        {statusLabel(payment.dummyStatusLabel || payment.status)}
      </span>,
      actionCell(row),
    ];
  };

  if (isK5) {
    return (
      <>
        <K5FeeDetails
          isLoading={!context || isLoading}
          payments={payments}
          nextUserPaymentDetailsId={nextUserPaymentDetailsId}
          symbol={symbol}
          canView={canView}
          onPay={checkout.start}
        />
        <CheckoutExtraDialogs checkout={checkout} />
        {context && (
          <PaymentGatewayPickerModal
            open={Boolean(checkout.picker)}
            onOpenChange={(open) => !open && checkout.closePicker()}
            details={checkout.picker?.details}
            airwallexMethods={checkout.picker?.methods}
            payerCountryCode={checkout.picker?.countryCode}
            schoolNumericId={context.schoolNumericId}
            schoolName={context.schoolName}
            busy={checkout.launching}
            onPay={checkout.launchGateway}
            onUploadProof={checkout.uploadProof}
            onSubmitOffline={checkout.submitOffline}
          />
        )}
        {(checkout.preparing || checkout.processing) && (
          <FullScreenLoader message={checkout.processing ? t("paymentProcessing") : undefined} />
        )}
        <Dialog open={checkout.incomplete} onOpenChange={(open) => !open && checkout.dismissIncomplete()}>
          <DialogContent className="text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl">{t("oops")}</DialogTitle>
            </DialogHeader>
            <h3 className="text-lg font-semibold text-red-600">{t("paymentIncomplete")}</h3>
          </DialogContent>
        </Dialog>
        <Dialog
          open={checkout.underReview}
          onOpenChange={(open) => {
            if (open) return;
            checkout.dismissUnderReview();
            refetch();
          }}
        >
          <DialogContent className="text-center">
            <DialogHeader>
              <DialogTitle>{t("underReviewTitle")}</DialogTitle>
            </DialogHeader>
            <p className="text-black/70">{t("underReviewText")}</p>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const status = !context || isLoading ? tc("status.loading") : payments.length === 0 ? t("empty") : null;

  return (
    <div className="w-full">
      <div className="rounded-[15px] border border-slate-200 bg-white p-3 sm:p-5">
        <div className="rounded-t-[10px] border border-slate-200 px-4 py-2">
          <h4 className="text-lg font-semibold text-black">{t("title")}</h4>
        </div>

        {/* Mobile: one card per payment (column title beside each value) instead of an 8-column table. */}
        <div className="md:hidden">
          {status ? (
            <p className="border-x border-b border-slate-200 py-8 text-center text-sm text-black/50">{status}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {rows.map((row) => (
                <li key={row.payment.id}>
                  <MobileTableCard
                    rows={cells(row)
                      .map((value, index) => ({ label: headers[index], value }))
                      .filter(({ value }) => value !== null && value !== "")}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full whitespace-nowrap border border-t-0 border-slate-200 text-left text-sm text-black">
            <thead className="bg-primary text-white">
              <tr>
                {HEADERS.map((header, index) => (
                  <th key={header} className={`py-3 pr-3 font-normal ${index === 0 ? "pl-4" : "pl-3"}`}>
                    {headers[index]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {status ? (
                <tr>
                  <td colSpan={HEADERS.length} className="py-8 text-center text-black/50">
                    {status}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.payment.id} className="border-b border-slate-200">
                    {cells(row).map((value, index) => (
                      <td key={HEADERS[index]} className={`py-3 pr-3 ${index === 0 ? "pl-4 text-center" : "pl-3"}`}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!status && <TableFooter page={page} pageSize={PAGE_SIZE} total={payments.length} onPageChange={setPage} />}
      </div>

      <CheckoutExtraDialogs checkout={checkout} />
      {context && (
        <PaymentGatewayPickerModal
          open={Boolean(checkout.picker)}
          onOpenChange={(open) => !open && checkout.closePicker()}
          details={checkout.picker?.details}
          airwallexMethods={checkout.picker?.methods}
          payerCountryCode={checkout.picker?.countryCode}
          schoolNumericId={context.schoolNumericId}
          schoolName={context.schoolName}
          busy={checkout.launching}
          onPay={checkout.launchGateway}
          onUploadProof={checkout.uploadProof}
          onSubmitOffline={checkout.submitOffline}
        />
      )}
      {(checkout.preparing || checkout.processing) && (
        <FullScreenLoader message={checkout.processing ? t("paymentProcessing") : undefined} />
      )}
      <Dialog open={checkout.incomplete} onOpenChange={(open) => !open && checkout.dismissIncomplete()}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t("oops")}</DialogTitle>
          </DialogHeader>
          <h3 className="text-lg font-semibold text-red-600">{t("paymentIncomplete")}</h3>
        </DialogContent>
      </Dialog>
      <Dialog
        open={checkout.underReview}
        onOpenChange={(open) => {
          if (open) return;
          checkout.dismissUnderReview();
          refetch();
        }}
      >
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle>{t("underReviewTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-black/70">{t("underReviewText")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
