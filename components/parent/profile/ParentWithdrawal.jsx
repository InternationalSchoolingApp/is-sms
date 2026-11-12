"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, ChevronDown, ChevronRight, TriangleAlert, Users } from "lucide-react";
import { ChildAvatar } from "@/components/parent/ChildAvatar";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { ParentOtpDialog, ParentSubmittedDialog } from "@/components/parent/profile/ParentWithdrawalDialogs";
import { ParentWithdrawalRequest } from "@/components/parent/profile/ParentWithdrawalRequest";
import { REASON_MAX } from "@/components/parent/profile/withdrawalModel";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { useParentWithdrawal } from "@/hooks/parent/useParentWithdrawal";

const REFUND_POLICY_URL = "https://internationalschooling.org/fee-refund-policy";
const BACK = "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-slate-50";

/**
 * Parent "Withdrawal Request" (legacy withdrawalRequestUser.js, parent mode): choose the child (the parent's own children
 * list, names only), then that child's details, the past requests with their status, and, while none is in progress,
 * the new request form -> one-time code e-mailed to the parent -> submitted. Approved requests ask for refund bank
 * details. The server checks every child and request belongs to the signed-in parent.
 */
export function ParentWithdrawal({ onBack }) {
  const { children } = useSelectedChild();
  const [childId, setChildId] = useState(null);

  if (childId) return <ChildWithdrawal key={childId} studentUserId={childId} onBackToChildren={() => setChildId(null)} />;

  return (
    <div className="rounded-[10px] border border-slate-200 bg-white p-4 sm:p-6">
      <button type="button" onClick={onBack} className={BACK}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>
      <div className="mx-auto mt-4 max-w-2xl">
        <h2 className="flex items-center justify-center gap-2 text-lg font-semibold text-black">
          <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          Select a child
        </h2>
        <p className="mx-auto mb-4 mt-1 max-w-md text-center text-sm text-black/60">Choose the child you want to submit a withdrawal request for. Their details will be pre-filled on the next screen.</p>
        {children.length === 0 ? (
          <p className="py-6 text-center text-sm text-black/50">No child found.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {children.map((child) => {
              const detail = [child.standardName, child.learningProgramName].filter(Boolean).join(" · ");
              return (
                <li key={child.userId}>
                  <button
                    type="button"
                    onClick={() => setChildId(String(child.userId))}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-primary hover:shadow-[0_0_0_3px_rgba(43,127,255,0.12)]"
                  >
                    <ChildAvatar child={child} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-black">{child.studentName || "Student"}</span>
                      {detail && <span className="block truncate text-xs text-black/60">{detail}</span>}
                      {child.studentRollNo && <span className="block truncate text-[11px] text-black/40">{child.studentRollNo}</span>}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReadOnly({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-bold text-black/50">{label}</div>
      <div className="break-words text-sm text-black">{value || "N/A"}</div>
    </div>
  );
}

function Policy() {
  const box = "group rounded-lg border border-slate-200 bg-white";
  const summary = "flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-black [&::-webkit-details-marker]:hidden";
  const chevron = <ChevronDown className="ml-auto h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />;
  return (
    <div className="space-y-3">
      <details className={box}>
        <summary className={summary}>
          Withdrawal Terms &amp; Conditions <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Please read</span>
          {chevron}
        </summary>
        <ul className="list-disc space-y-1.5 border-t border-slate-200 py-3 pl-9 pr-4 text-sm text-black/70">
          <li>Once the withdrawal process is completed, the student&apos;s access will be disabled from all the platforms he/she was enrolled in.</li>
          <li>In case the child wishes to re-apply any time after the withdrawal process is completed, he/she shall be considered as a <b>fresh enrollment</b>.</li>
          <li>Kindly note that a refund will be made (if any) <b>ONLY</b> to the bank account from which the fee was paid. The refund amount (if any) will be exclusive of the handling fee &amp; transaction fee.</li>
          <li>Without the specified format, no requests shall be entertained.</li>
          <li>In case of concealment/misrepresentation of personal, academic, or any other detail by the student/guardian or/and in case of submission of false/fake documents by student/guardian, <b>no refund shall apply</b>.</li>
          <li>No refund of the <b>Enrollment Fee</b> will be made under any circumstances.</li>
        </ul>
      </details>
      <details className={box}>
        <summary className={summary}>
          Fee Refund Policy <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Please read</span>
          {chevron}
        </summary>
        <div className="space-y-2 border-t border-slate-200 p-4 text-sm text-black/70">
          <p>Refunds (if any) are governed by International Schooling&apos;s official Fee Refund Policy. Please read the full policy before submitting your request.</p>
          <a href={REFUND_POLICY_URL} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">
            View the full Fee Refund Policy ↗
          </a>
        </div>
      </details>
    </div>
  );
}

function ChildWithdrawal({ studentUserId, onBackToChildren }) {
  const withdrawal = useParentWithdrawal(studentUserId);
  const { data } = withdrawal;
  const [reasonId, setReasonId] = useState("");
  const [description, setDescription] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [otp, setOtp] = useState(null); // { requestId, email } while the code dialog is open
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [submitted, setSubmitted] = useState(null); // { requestNo, email }

  const sendCode = async () => {
    setSending(true);
    const result = await withdrawal.sendOtp({ reasonId, description });
    setSending(false);
    if (result.ok) {
      setOtpError("");
      setOtp({ requestId: result.requestId, email: result.email });
    } else {
      toast.error(result.message);
    }
  };

  const verify = async (code) => {
    setVerifying(true);
    const result = await withdrawal.verifyOtp({ requestId: otp.requestId, otp: code });
    setVerifying(false);
    if (result.ok) {
      setSubmitted({ requestNo: result.requestNo, email: result.email || otp.email });
      setOtp(null);
      setReasonId("");
      setDescription("");
      setAgreed(false);
    } else {
      setOtpError(result.message);
    }
  };

  let body;
  if (withdrawal.isLoading) body = <p className="py-10 text-center text-sm text-black/50">Loading…</p>;
  else if (withdrawal.sessionOut) body = <p className="py-10 text-center text-sm text-black/60">Your session has expired. Please log in again.</p>;
  else if (withdrawal.failed || !data) {
    body = (
      <div className="py-10 text-center text-sm text-black/60">
        <p>{withdrawal.failedMessage || "Unable to load withdrawal details."}</p>
        <button type="button" onClick={withdrawal.retry} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Try again
        </button>
      </div>
    );
  } else {
    const { student, reasons, requests, canCreate } = data;
    const formReady = Boolean(reasonId && description.trim() && agreed);
    body = (
      <>
        <h2 className="mb-1 break-words text-lg font-semibold text-black">Withdrawal Request — {student.studentName || "Student"}</h2>
        <h3 className="mb-3 mt-4 text-xs font-bold uppercase tracking-wide text-primary">Student Details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadOnly label="Student ID" value={student.studentStringId} />
          <ReadOnly label="Full Name" value={student.studentName} />
          <ReadOnly label="Grade" value={student.standardName} />
          <ReadOnly label="Learning Program" value={student.programName} />
        </div>

        {requests.length > 0 && (
          <>
            <hr className="my-5 border-slate-200" />
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary">My withdrawal requests</h3>
            {requests.map((request) => (
              <ParentWithdrawalRequest key={request.requestId ?? request.requestNo} request={request} onSubmitBank={(requestId, bank) => withdrawal.submitBank({ requestId, bank })} />
            ))}
          </>
        )}

        {canCreate ? (
          <>
            <hr className="my-5 border-slate-200" />
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-primary">New withdrawal request</h3>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (formReady && !sending) sendCode();
              }}
              className="space-y-4"
            >
              <FloatingLabelSelect label="Primary reason" required value={reasonId} options={reasons.map((r) => ({ value: String(r.id), label: r.reason }))} onValueChange={setReasonId} />
              <div>
                <label htmlFor="parent-withdrawal-desc" className="mb-1 block text-xs font-semibold text-black/60">
                  Tell us more <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="parent-withdrawal-desc"
                  value={description}
                  maxLength={REASON_MAX}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly explain the reason for this withdrawal request…"
                  className="min-h-[96px] w-full resize-y rounded-md border border-slate-300 p-3 text-sm text-black outline-none focus:border-2 focus:border-primary"
                />
              </div>
              <Policy />
              <label className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-black/80">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-primary" />
                <span>I have read and accept the Withdrawal Terms &amp; Conditions and the Fee Refund Policy.</span>
              </label>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  <b>Please read before submitting.</b> Submitting this request begins the cancellation of your child&apos;s enrollment and notifies administration. Enrollment and fees remain active until a withdrawal is formally approved. You&apos;ll verify with a one-time code sent to your email before it&apos;s submitted.
                </p>
              </div>
              <button type="submit" disabled={!formReady || sending} className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {sending ? "Sending code…" : "Verify & submit request"}
              </button>
            </form>
          </>
        ) : requests.length > 0 ? (
          <p className="mt-4 rounded-lg border border-[#bcd4fb] bg-[#f4f8ff] p-3 text-sm text-primary">
            You have a withdrawal request in progress (see status above). You can submit a new request only once the current one is completed. Need help? Contact <b className="break-all">admin.support@internationalschooling.org</b> or <b>+1 (585) 4990662</b>.
          </p>
        ) : (
          <p className="py-6 text-center text-sm text-black/40">No withdrawal request yet.</p>
        )}
      </>
    );
  }

  return (
    <div className="rounded-[10px] border border-slate-200 bg-white p-4 sm:p-6">
      <button type="button" onClick={onBackToChildren} className={BACK}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to my children
      </button>
      <div className="mt-4">{body}</div>
      {otp && <ParentOtpDialog email={otp.email} busy={verifying} error={otpError} onVerify={verify} onCancel={() => setOtp(null)} />}
      {submitted && <ParentSubmittedDialog requestNo={submitted.requestNo} email={submitted.email} onClose={() => setSubmitted(null)} />}
    </div>
  );
}
