"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FullScreenLoader } from "@/components/common/Loader";
import { PaymentName } from "@/components/common/PaymentName";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { PdFooter } from "@/components/parent/pageParts/PdFooter";
import { PdHero } from "@/components/parent/pageParts/PdHero";
import { firstName } from "@/components/parent/childLabels";
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
      <>
        {action.notes.map((note) => (
          <span key={note} style={{ marginRight: 8 }}>
            {note}
          </span>
        ))}
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="fbtn o">
            View Receipt
          </a>
        )}
        {action.pay && (
          <button
            type="button"
            onClick={() => checkout.start(payment.id)}
            disabled={checkout.preparing}
            className="fbtn p"
            style={{ cursor: "pointer", opacity: checkout.preparing ? 0.6 : 1 }}
          >
            {action.pay}
          </button>
        )}
      </>
    );
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

  const name = firstName(selectedChild?.studentName);
  const paidCount = payments.filter((payment) => payment.status === "SUCCESS").length;
  const subtitle = message
    ? ""
    : `${payments.length} payment${payments.length === 1 ? "" : "s"}${paidCount === payments.length ? " \u00b7 all paid" : ` \u00b7 ${paidCount} paid`}`;

  return (
    <section className="sch on" aria-label="Fee details" aria-busy={loading}>
      <PdHero title={name ? `${name}\u2019s Fee Details` : "Fee Details"} subtitle={subtitle} />

      <div className="fcard">
        <h3>Fee Details</h3>
        <div className="ftw">
          <table className="ftbl">
            <thead>
              <tr>
                {HEADERS.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {message ? (
                <tr>
                  <td colSpan={HEADERS.length} className="pv-empty" style={{ display: "block", textAlign: "center" }}>
                    {message}
                    {failed && !sessionOut && (
                      <button type="button" onClick={() => refetch()} className="fbtn o" style={{ marginLeft: 12, height: 32, cursor: "pointer" }}>
                        Try again
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const { payment } = row;
                  const ok = payment.status === "SUCCESS";
                  return (
                    <tr key={payment.id}>
                      <td data-l={HEADERS[0]}>{row.serial}</td>
                      <td data-l={HEADERS[1]}>{payment.scheduledPayDate || ""}</td>
                      <td data-l={HEADERS[2]}>{payment.standardName || ""}</td>
                      <td data-l={HEADERS[3]}>
                        {payment.paymentName ? <PaymentName name={String(payment.paymentName).replace(/<br\s*\/?>/gi, " ")} /> : ""}
                      </td>
                      <td data-l={HEADERS[4]}>{`${symbol} ${payment.totalFeeWithMaterialFee ?? ""}`.trim()}</td>
                      <td data-l={HEADERS[5]}>{payment.payDate || "--"}</td>
                      <td data-l={HEADERS[6]}>
                        {ok ? (
                          <span className="fst ok">
                            <i>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12.5l4.5 4.5L19 7.5" />
                              </svg>
                            </i>
                            Success
                          </span>
                        ) : (
                          <span className="fst sc">
                            <i>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                                <circle cx="12" cy="12" r="8" />
                                <path d="M12 8v4l2.5 1.5" />
                              </svg>
                            </i>
                            {payment.status}
                          </span>
                        )}
                      </td>
                      <td className="fa" data-l={HEADERS[7]}>
                        {actionCell(row)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!message && <PdFooter page={page} pageSize={PAGE_SIZE} total={payments.length} onPageChange={setPage} />}
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
    </section>
  );
}

export function ParentFeeDetails() {
  return (
    <ParentChildRequired>
      <FeeDetailsBody />
    </ParentChildRequired>
  );
}
