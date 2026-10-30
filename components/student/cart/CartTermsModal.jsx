"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Common Extra Class terms (renderCartPaymentTerms() in cartDetailContent.js, every school but 5).
function extraClassTerms(schoolName) {
  return [
    "Extra Classes are defined as doubt-clearing classes which are in addition to your complimentary classes. For example, 2 extra classes per week mean 1 complimentary doubt-clearing class + 2 extra doubt-clearing classes = 3 doubt-clearing classes per week.",
    "Students have to pay in full for the Extra Classes in advance.",
    "Fees will be accepted through online payment methods only.",
    "All your Extra Classes will be pre-booked at the beginning of every month. You will be notified duly about your Extra Classes Schedule via mail.",
    `In case you want to change the date and/or timings of your Extra Class(s), you will have to inform ${schoolName} via mail at least 7 days in advance.`,
    "Under any circumstances/conditions, fee for Extra Class is non-refundable, non-transferable and non-adjustable. Absence is not valid for any compensation class or refund of fee.",
    `The class will be compensated only if it is canceled by ${schoolName}. The compensation will occur only through policies of ${schoolName}. You cannot claim a refund of fees in such cases.`,
    `Students (or their parents/guardians) are responsible for regularly checking the website for any upcoming notifications. ${schoolName} will not send notifications or updates separately to students (or their parents/guardians)`,
    `${schoolName} reserves the right to amend, limit or revoke any offers or terms at any time prior to purchase and accepts no responsibility for any technical issues resulting in the failure to pay.`,
  ];
}

// School 5's own list.
function schoolFiveTerms(schoolName) {
  return [
    "Each student receives one complimentary class per Grade.",
    "Extra Classes are defined as doubt-clearing classes which are in addition to your one complimentary class per Grade.",
    "Students have to pay in full for the Extra Classes in advance.",
    "The fee will be accepted through the online payment method only.",
    "All your Extra Classes will be pre-booked by you at the beginning of every month. There are time periods in which you can book for the Extra Classes. You will be notified duly about your Extra Classes Schedule via mail.",
    `In case you want to change the date and/or timings of your Extra Classes, you will have to inform ${schoolName} via mail at least 7 days in advance.`,
    "Under any circumstances/conditions, fees for Extra Classes are not refundable or transferable. Absence is not valid for any compensation class or refund of fee.",
    `The class will be compensated only if it is canceled by ${schoolName}. The compensation will occur only through policies of ${schoolName}. You cannot claim a refund of fees in such cases.`,
  ];
}

const DISCOVERY_TERM = "Under any circumstances/conditions, fees for Discovery Education Add-on is not refundable or transferable.";

/**
 * Terms and Conditions before Pay Now — legacy renderCartPaymentTerms()
 * (#payTabBookingSessionModal). cart-payment always returns planStatus "b"
 * today; "d" / "bd" (Discovery Education Add-on) are kept from the legacy
 * branches. Pay Now stays disabled until the box is ticked.
 */
export function CartTermsModal({ open, planStatus, schoolNumericId, schoolName, busy, onClose, onPay }) {
  const [agreed, setAgreed] = useState(false);
  const name = schoolName || "the school";
  const extraClasses = planStatus === "b" || planStatus === "bd";
  const terms =
    planStatus === "d" ? [DISCOVERY_TERM] : Number(schoolNumericId) === 5 && extraClasses ? schoolFiveTerms(name) : extraClassTerms(name);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
        </DialogHeader>
        <p className="font-bold text-black">
          {extraClasses
            ? "Please note the important fee refund policy and terms & conditions before enrolling for Extra Classes:"
            : "Please note the below important terms and conditions before enrolling for Discovery Education Add-on:"}
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-black">
          {terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ol>
        {planStatus === "bd" && (
          <>
            <p className="font-bold text-black">Please note the below important terms and conditions before enrolling for Discovery Education Add-on:</p>
            <ol className="list-decimal pl-5 text-sm text-black">
              <li>{DISCOVERY_TERM}</li>
            </ol>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <label className="flex flex-1 cursor-pointer items-start gap-2 text-sm text-black">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4" />
            I confirm that I have read and agree to the above-mentioned fee refund policy and terms &amp; conditions.
          </label>
          <button
            type="button"
            disabled={!agreed || busy}
            onClick={onPay}
            className="rounded-lg bg-green-600 px-5 py-2 font-bold text-white disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Pay Now"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
