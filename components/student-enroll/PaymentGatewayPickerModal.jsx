"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Shown only when common/payment-gateway/options resolves more than one
 * available gateway for this school/entity (getPaymentGatewaysOptions()'s
 * tabbed modal in commonPaymentGateway.js, simplified to a plain list — the
 * per-gateway embedded checkout UI, e.g. Airwallex's own element mount, is
 * out of scope here; Airwallex's method names from get-airwallex-payment-methods
 * are listed under its button). `options` is the raw `paymentOptions` array from
 * PaymentOptionDetails ({name, label, icon, additionalFee, additionalDetails}).
 */
export function PaymentGatewayPickerModal({ open, onOpenChange, options, airwallexMethods, busy, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a payment method</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(options || []).map((option) => (
            <div key={option.name}>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              disabled={busy}
              onClick={() => onSelect(option)}
            >
              <span>{option.label || option.name}</span>
              {option.additionalFee > 0 && (
                <span className="text-xs text-slate-500">+{option.additionalFee} fee</span>
              )}
            </Button>
            {/* Airwallex's own method list (get-airwallex-payment-methods), shown under its button. */}
            {option.name === "Airwallex" && airwallexMethods?.length > 0 && (
              <p className="mt-1 px-1 text-xs text-slate-500">
                {airwallexMethods.map((method) => method.labelName).filter(Boolean).join(" · ")}
              </p>
            )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
