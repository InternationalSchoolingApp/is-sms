"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FullScreenLoader } from "@/components/common/Loader";
import { PaymentName } from "@/components/common/PaymentName";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ParentMobileTableCard } from "@/components/parent/common/ParentMobileTableCard";
import { ParentTableFooter } from "@/components/parent/common/ParentTableFooter";
import { feeAction, receiptHref } from "@/components/parent/fees/feeActions";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useModuleRights } from "@/hooks/useModuleRights";
import { useSchoolCurrency } from "@/hooks/useStudentCart";
import { useParentFeeDetails } from "@/hooks/parent/useParentFeeDetails";
import { useParentFeePayment } from "@/hooks/parent/useParentFeePayment";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";

const PAGE_SIZE = 10;
const HEADERS = ["S.No", "Scheduled Date", "Grade", "Payment Name", "Paid Fee", "Paid Date", "Status", "View Receipt"];

/**
 * Fee Details of the selected child — the parent's own page, legacy parentFeeDetails.js +
 * parentFeeDetailsContent.js ("Fee Details" table). Pay Now / Try Again run the legacy check-payment ->
 * gateway picker chain (useParentFeePayment); View Receipt opens the receipt link, gated on the module's viewed
 * right like legacy roleAndModule.viewed.
 */
function FeeDetailsBody() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const { schoolNumericId } = context ?? {};
  const { isLoading, failed, sessionOut, payments, nextUserPaymentDetailsId, refetch } = useParentFeeDetails();
  const { canView } = useModuleRights("parent-fee-details");
  const currencyQuery = useSchoolCurrency(schoolNumericId);
  const symbol = currencyQuery.data?.symbol ?? "";
  const [pageState, setPageState] = useState({ childId: null, page: 0 });
  const childId = selectedChild ? String(selectedChild.userId) : null;
  // The page number belongs to one child: another child starts on page 1 (derived, no effect needed).
  const page = pageState.childId === childId ? pageState.page : 0;
  const setPage = (next) => setPageState({ childId, page: next });

  const checkout = useParentFeePayment({
    context,
    onPaid: () => {
      refetch();
      toast.success("Payment received.");
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
    const href = action.receipt ? receiptHref(payment) : "";
    if (!href && !action.pay && action.notes.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {action.notes.map((note) => (
          <span key={note}>{note}</span>
        ))}
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-primary px-2 py-1 text-primary hover:bg-primary hover:text-white"
          >
            View Receipt
          </a>
        )}
        {action.pay && (
          <button
            type="button"
            onClick={() => checkout.start(payment.id)}
            disabled={checkout.preparing}
            className="rounded bg-primary px-3 py-1 text-white disabled:opacity-60"
          >
            {action.pay}
          </button>
        )}
      </div>
    );
  };

  const cells = (row) => {
    const { payment } = row;
    return [
      row.serial,
      payment.scheduledPayDate || "",
      payment.standardName || "",
      payment.paymentName ? <PaymentName key="name" name={String(payment.paymentName).replace(/<br\s*\/?>/gi, " ")} /> : "",
      `${symbol} ${payment.totalFeeWithMaterialFee ?? ""}`.trim(),
      payment.payDate || "--",
      <span key="status" className={payment.status === "SUCCESS" ? "font-bold text-[#58D68D]" : ""}>
        {payment.status}
      </span>,
      actionCell(row),
    ];
  };

  const loading = !context || isLoading;
  const message = loading
    ? "Loading…"
    : sessionOut
      ? "Your session has expired. Redirecting to sign in…"
      : failed
        ? "Fee details could not be loaded."
        : payments.length === 0
          ? "No fee details found"
          : null;

  return (
    <div className="w-full">
      <div className="rounded-[15px] border border-slate-200 bg-white p-3 sm:p-5">
        <div className="rounded-t-[10px] border border-slate-200 px-4 py-2">
          <h1 className="text-lg font-semibold text-black">Fee Details</h1>
        </div>

        {/* Phone: one card per payment (column title beside each value) instead of an 8-column table. */}
        <div className="md:hidden">
          {message ? (
            <div className="border-x border-b border-slate-200 py-8 text-center text-sm text-black/50">
              <p>{message}</p>
              {failed && !sessionOut && (
                <button type="button" onClick={() => refetch()} className="mt-3 rounded border border-primary px-3 py-1 text-primary">
                  Try again
                </button>
              )}
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {rows.map((row) => (
                <li key={row.payment.id}>
                  <ParentMobileTableCard
                    rows={cells(row)
                      .map((value, index) => ({ label: HEADERS[index], value }))
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
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {message ? (
                <tr>
                  <td colSpan={HEADERS.length} className="py-8 text-center text-black/50">
                    {message}
                    {failed && !sessionOut && (
                      <button type="button" onClick={() => refetch()} className="ml-3 rounded border border-primary px-3 py-1 text-primary">
                        Try again
                      </button>
                    )}
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

        {!message && <ParentTableFooter page={page} pageSize={PAGE_SIZE} total={payments.length} onPageChange={setPage} />}
      </div>

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
        <FullScreenLoader message={checkout.processing ? "Payment is under process..." : undefined} />
      )}
      <Dialog open={checkout.incomplete} onOpenChange={(open) => !open && checkout.dismissIncomplete()}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Oops!</DialogTitle>
          </DialogHeader>
          <h3 className="text-lg font-semibold text-red-600">Payment Incomplete</h3>
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
            <DialogTitle>Your payment is under review.</DialogTitle>
          </DialogHeader>
          <p className="text-black/70">Your fee status will be updated once the payment is received.</p>
        </DialogContent>
      </Dialog>
      {/* Legacy renderOldFeeCard ("School Payment Update"): the backend's message, as text. */}
      <Dialog open={Boolean(checkout.notice)} onOpenChange={(open) => !open && checkout.dismissNotice()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">School Payment Update</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-amber-900">
            <p className="font-semibold">Important Notice</p>
            <p className="mt-1 text-sm">{checkout.notice?.message}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ParentFeeDetails() {
  return (
    <ParentChildRequired>
      <FeeDetailsBody />
    </ParentChildRequired>
  );
}
