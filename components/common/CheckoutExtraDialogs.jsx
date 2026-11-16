"use client";

import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PaymentInProgressModal } from "@/components/student-enroll/PaymentInProgressModal";
import { SupportCard } from "@/components/re-enrollment/ReEnrollmentParts";
import { useDashboardContext } from "@/hooks/useDashboardContext";

/**
 * The two answers of a Pay Now (hooks/useCartCheckout.js) that the picker does not cover - legacy commonPaymentGateway.js:
 *  - "You already started this payment" / "This fee is already paid" (invoke-payment-gateway: PAYMENT_IN_PROGRESS /
 *    ALREADY_PAID): continue it, start a new one (payment-attempt-cancel, then the same gateway again) or not now.
 *  - "School Payment Update" (OLD_FEE from check-payment / invoke): the school's message for an old fee that can no longer
 *    be paid here, with the support contacts and a Close button.
 * Mount once beside the checkout's PaymentGatewayPickerModal: <CheckoutExtraDialogs checkout={checkout} />.
 */
export function CheckoutExtraDialogs({ checkout }) {
  const { context } = useDashboardContext();
  const request = checkout.paymentInProgress;
  return (
    <>
      {request && (
        <PaymentInProgressModal
          key={request.openedAt}
          request={request}
          onClose={checkout.closePaymentInProgress}
          onCancelAttempt={checkout.cancelPaymentAttempt}
          onCancelled={checkout.relaunchAfterCancel}
          onPaid={checkout.paidAlready}
          onSessionExpired={checkout.sessionExpired}
        />
      )}
      <Dialog open={Boolean(checkout.oldFee)} onOpenChange={(open) => !open && checkout.closeOldFee()} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="gap-0 overflow-hidden rounded-[20px] border-0 p-0 sm:max-w-[460px]">
          <div className="flex items-center justify-center bg-primary px-3 py-3">
            <DialogTitle className="m-0 text-lg font-medium normal-case text-white">School Payment Update</DialogTitle>
          </div>
          <div className="bg-white px-6 py-5">
            <div className="mb-4 rounded-[15px] border border-amber-400 bg-amber-50 px-3 py-3 text-[#92400E]">
              <p className="mb-2 flex items-center gap-2 font-semibold">
                <Info className="h-4 w-4" aria-hidden="true" />
                Important Notice
              </p>
              <DialogDescription className="m-0 text-[#92400E]">{checkout.oldFee}</DialogDescription>
            </div>
            <SupportCard uniqueId={context?.uniqueId} />
            <div className="mt-4 text-center">
              <button type="button" onClick={checkout.closeOldFee} className="cursor-pointer rounded-[10px] border-none bg-primary px-8 py-2.5 text-lg font-semibold text-white">
                Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
