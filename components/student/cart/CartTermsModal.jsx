"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { K5TermsDialog } from "@/components/k5/pages/K5Cart";
import { useDashboardContext } from "@/hooks/useDashboardContext";

// Common Extra Class terms (renderCartPaymentTerms() in cartDetailContent.js, every school but 5):
// the cart.terms.extra.* messages, in order.
const EXTRA_CLASS_TERMS = ["definition", "payInAdvance", "onlineOnly", "preBooked", "changeTimings", "nonRefundable", "compensation", "notifications", "amend"];

// School 5's own list (cart.terms.schoolFive.*).
const SCHOOL_FIVE_TERMS = ["oneComplimentary", "definition", "payInAdvance", "onlineOnly", "preBooked", "changeTimings", "nonRefundable", "compensation"];

/**
 * Terms and Conditions before Pay Now — legacy renderCartPaymentTerms()
 * (#payTabBookingSessionModal). cart-payment always returns planStatus "b"
 * today; "d" / "bd" (Discovery Education Add-on) are kept from the legacy
 * branches. Pay Now stays disabled until the box is ticked.
 */
export function CartTermsModal({ open, planStatus, schoolNumericId, schoolName, busy, amountText, onClose, onPay }) {
  const { isK5 } = useDashboardContext();
  const t = useTranslations("cart.terms");
  const tc = useTranslations("common");
  const [agreed, setAgreed] = useState(false);
  const name = schoolName || t("theSchool");
  const extraClasses = planStatus === "b" || planStatus === "bd";
  const DISCOVERY_TERM = t("discoveryTerm");
  const terms =
    planStatus === "d"
      ? [DISCOVERY_TERM]
      : Number(schoolNumericId) === 5 && extraClasses
        ? SCHOOL_FIVE_TERMS.map((key) => t(`schoolFive.${key}`, { school: name }))
        : EXTRA_CLASS_TERMS.map((key) => t(`extra.${key}`, { school: name }));

  const intro = extraClasses ? t("introExtra") : t("introDiscovery");

  if (isK5) {
    return (
      <K5TermsDialog
        open={open}
        intro={intro}
        terms={terms}
        extra={
          planStatus === "bd" ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="m-0 text-base font-black">{t("introDiscovery")}</p>
              <p className="m-0 text-base font-bold">{DISCOVERY_TERM}</p>
            </div>
          ) : null
        }
        agreed={agreed}
        onAgree={setAgreed}
        busy={busy}
        amountText={amountText}
        onClose={onClose}
        onPay={onPay}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <p className="font-bold text-black">
          {intro}
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-black">
          {terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ol>
        {planStatus === "bd" && (
          <>
            <p className="font-bold text-black">{t("introDiscovery")}</p>
            <ol className="list-decimal pl-5 text-sm text-black">
              <li>{DISCOVERY_TERM}</li>
            </ol>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <label className="flex flex-1 cursor-pointer items-start gap-2 text-sm text-black">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4" />
            {t("agree")}
          </label>
          <button
            type="button"
            disabled={!agreed || busy}
            onClick={onPay}
            className="rounded-lg bg-green-600 px-5 py-2 font-bold text-white disabled:opacity-50"
          >
            {busy ? tc("status.pleaseWait") : t("payNow")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
