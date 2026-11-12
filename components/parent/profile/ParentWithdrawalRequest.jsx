"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Check, TriangleAlert } from "lucide-react";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { ParentConfirmDialog } from "@/components/parent/profile/ParentWithdrawalDialogs";
import { BANK_FIELDS, BANK_FIELD_MAX, bankComplete, statusMeta, trackerSteps } from "@/components/parent/profile/withdrawalModel";

const TONES = {
  review: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  refund: "bg-teal-100 text-teal-700",
  challenge: "bg-purple-100 text-purple-700",
};
const REFUND_POLICY_URL = "https://internationalschooling.org/fee-refund-policy";
const SUPPORT_EMAIL = "admin.support@internationalschooling.org";

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${TONES[meta.tone]}`}>{meta.label}</span>;
}

/** Legacy tracker: Submitted > In Review > Approved / Denied ... as numbered steps (scrolls sideways on phones). */
function Tracker({ status }) {
  const steps = trackerSteps(status);
  return (
    <ol className="my-4 flex items-start overflow-x-auto pb-1" aria-label="Request progress">
      {steps.map((step, index) => {
        const bad = step.kind === "bad";
        const circle = bad
          ? "border-red-500 bg-red-500 text-white"
          : step.state === "done"
            ? "border-primary bg-primary text-white"
            : step.state === "active"
              ? "border-primary text-primary ring-4 ring-primary/10"
              : "border-slate-300 text-slate-400";
        return (
          <li key={step.label} className="flex items-start">
            {index > 0 && <span aria-hidden="true" className={`mt-3.5 h-0.5 w-6 shrink-0 sm:w-10 ${steps[index - 1].state === "done" ? "bg-primary" : "bg-slate-200"}`} />}
            <span className="flex w-20 shrink-0 flex-col items-center text-center">
              <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 bg-white text-xs font-bold ${circle}`}>
                {step.state === "done" ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span className={`mt-1.5 text-[11px] font-semibold leading-tight ${step.state === "pending" ? "text-slate-400" : "text-black"}`}>{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Note({ tone, who, children }) {
  const look = { plain: "border-slate-200 bg-slate-50 text-black/70", denied: "border-red-200 bg-red-50 text-red-800", approved: "border-green-200 bg-green-50 text-green-800", refund: "border-teal-200 bg-teal-50 text-teal-800" }[tone];
  return (
    <div className={`mt-3 rounded-lg border p-3 text-sm ${look}`}>
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide opacity-70">{who}</div>
      {children}
    </div>
  );
}

/** The bank summary of a submitted request: holder, bank, branch, SWIFT; account / routing reduced to the last four. */
function BankSummary({ bank }) {
  const rows = [
    ["Account holder", bank.accountHolder],
    ["Account number", bank.accountNoMasked],
    ["Bank name", bank.bankName],
    ["Branch", bank.branchAddress],
    ["SWIFT", bank.swiftCode],
    ["ABA/Routing", bank.routingNoMasked],
  ];
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">Bank details submitted</h4>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-bold text-black/50">{label}</dt>
            <dd className="break-words text-sm text-black">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BankForm({ onSubmit }) {
  const [values, setValues] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const result = await onSubmit(values);
    setBusy(false);
    setConfirming(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  return (
    <div className="mt-4">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary">Add your bank details to start the refund</h4>
      <form
        noValidate
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          if (bankComplete(values)) setConfirming(true);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {BANK_FIELDS.map(([key, label, required]) => (
            <FloatingLabelInput key={key} label={required ? `${label} *` : label} value={values[key] ?? ""} maxLength={BANK_FIELD_MAX} autoComplete="off" onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))} />
          ))}
        </div>
        <p className="mt-2 text-xs text-black/50">Please double-check these details — incorrect information can delay or fail your refund.</p>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <b>Your child&apos;s account will be deactivated.</b> Once the refund is initiated by the school, your child&apos;s account and access to all enrolled platforms will be permanently deactivated.
          </p>
        </div>
        <button type="submit" disabled={!bankComplete(values) || busy} className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          Submit bank details
        </button>
      </form>
      {confirming && (
        <ParentConfirmDialog
          title="Your child's account will be deactivated"
          message="Once your child's refund is initiated by the school, their account and access to all enrolled platforms will be deactivated. Do you want to submit the bank details now?"
          confirmLabel="Submit bank details"
          busy={busy}
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/**
 * One past withdrawal request (legacy getWithdrawalRequestCardHtml): reference, reason, submitted date, status badge, the
 * tracker, the parent's own description, the school's decision / remarks, and by status the challenge notice, refund steps,
 * the bank form (ACCEPTED without bank details) or the masked bank summary. onSubmitBank(requestId, values) -> { ok, message }.
 */
export function ParentWithdrawalRequest({ request, onSubmitBank }) {
  const status = String(request.status || "").toUpperCase();
  const decision = (tone, fallback) =>
    (request.remarks || request.reason) && (
      <Note tone={tone} who="Decision · Student Services">
        <b>{request.reason || fallback}</b>
        {request.remarks ? <p className="mt-1">{request.remarks}</p> : null}
      </Note>
    );
  return (
    <article className="mb-4 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold tracking-wide text-black/40">{request.requestNo || `WD-${request.requestId}`}</div>
          <h3 className="break-words text-base font-semibold text-black">{request.reason || "Withdrawal request"}</h3>
          <p className="text-xs text-black/60">Submitted {request.createdDate}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <Tracker status={request.status} />
      <Note tone="plain" who="Your request">
        <b className="text-black">Details:</b> <span className="break-words">{request.description || "—"}</span>
      </Note>

      {(status === "REJECTED" || status === "CHALLENGED") && decision("denied", "")}
      {status === "REJECTED" && (
        <div className="mt-3 rounded-lg border border-dashed border-purple-500 bg-purple-50 p-3 text-sm text-purple-900">
          <h4 className="font-semibold text-purple-700">Disagree with this decision?</h4>
          <p className="mt-1">
            As set out in the Terms &amp; Conditions, you may challenge this decision in a <b>United States</b> or <b>Singapore</b> court. To proceed, contact <b className="break-all">{SUPPORT_EMAIL}</b> — a school administration representative will be in touch.
          </p>
        </div>
      )}
      {status === "CHALLENGED" && (
        <div className="mt-3 rounded-lg border border-dashed border-purple-500 bg-purple-50 p-3 text-sm text-purple-900">
          <h4 className="font-semibold text-purple-700">This request is marked as Challenged</h4>
          <p className="mt-1">Your challenge is under review. A school administration representative will be in touch.</p>
        </div>
      )}
      {status === "ACCEPTED" && (
        <>
          {decision("approved", "Approved")}
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-black/70">
            <div className="mb-1 font-semibold text-primary">Process for Fee Refund</div>
            Please refer to the Fee Refund Policy{" "}
            <a href={REFUND_POLICY_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline">
              here
            </a>
            .
          </div>
          {request.bank ? <BankSummary bank={request.bank} /> : <BankForm onSubmit={(values) => onSubmitBank(request.requestId, values)} />}
        </>
      )}
      {status === "BANKDETAIL" && (
        <>
          <Note tone="refund" who="Refund">
            <b>Bank details submitted.</b>
            <p className="mt-1">Your refund will be initiated by the school and processed to the original payer within 5–10 business working days per the Fee Refund Policy.</p>
          </Note>
          {request.bank && <BankSummary bank={request.bank} />}
        </>
      )}
      {status === "TRANSFERRED" && (
        <>
          <Note tone="refund" who="Refund · Finance">
            <b>Refund initiated from our end.</b>
            <p className="mt-1">{request.remarks || "Your refund is being processed and will reach the original payer within 5–10 business working days."}</p>
          </Note>
          {request.bank && <BankSummary bank={request.bank} />}
        </>
      )}
    </article>
  );
}
