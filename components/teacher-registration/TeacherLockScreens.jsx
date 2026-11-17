"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The legacy "Demo Under Review" modal as a screen of the wizard: shown from the moment the profile is submitted
 * (stage 13) and while the school holds it (24, which the legacy wizard worded the same). The teacher can only log out
 * or check the status; the page also looks by itself every 30 s (hooks/useTeacherReview.js useTeacherStatusPoll), and
 * moves on when the school approves.
 */
export function TeacherUnderReview({ fullName, schoolName, onCheck, checking, onLogout }) {
  return (
    <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:mt-8" data-testid="teacher-under-review">
      <h2 className="text-center text-xl font-extrabold text-black md:text-2xl">Demo Under Review</h2>
      <div className="mt-4 text-[15px] leading-relaxed text-black">
        <p className="font-bold">
          Dear <span className="capitalize">{fullName || "Teacher"}</span>,
        </p>
        <p className="mt-3 font-bold">
          Your demo is <span className="text-primary">Under Review</span>. We will get back to you within 1 week.
        </p>
        <p className="mt-3 font-bold">
          Thanks
          <br />
          {schoolName}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={onCheck} disabled={checking} className="cursor-pointer rounded-md px-4">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check status
        </Button>
        <Button type="button" onClick={onLogout} className="cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90">
          Log out
        </Button>
      </div>
    </div>
  );
}

// The card of the contract waiting screens: a title, a greeting and a message, Check status and Log out.
function ContractWaiting({ testId, title, fullName, schoolName, children, onCheck, checking, onLogout }) {
  return (
    <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:mt-8" data-testid={testId}>
      <h2 className="text-center text-xl font-extrabold text-black md:text-2xl">{title}</h2>
      <div className="mt-4 text-[15px] leading-relaxed text-black">
        <p className="font-bold">
          Dear <span className="capitalize">{fullName || "Teacher"}</span>,
        </p>
        <p className="mt-3 font-bold">{children}</p>
        <p className="mt-3 font-bold">
          Thanks
          <br />
          {schoolName}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" variant="outline" onClick={onCheck} disabled={checking} className="cursor-pointer rounded-md px-4">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check status
        </Button>
        <Button type="button" onClick={onLogout} className="cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90">
          Log out
        </Button>
      </div>
    </div>
  );
}

/**
 * The teacher's profile was approved, but the school has not published the contract yet (the legacy wizard called this
 * "Contract Expired", which it was not). The page asks again by itself; the teacher is also told by e-mail.
 */
export function TeacherContractNotReady(props) {
  return (
    <ContractWaiting testId="teacher-contract-not-ready" title="Contract Details" {...props}>
      Your contract is being prepared. We will notify you by email once it is ready.
    </ContractWaiting>
  );
}

/** The contract's validity has ended (the legacy "Contract Expired" modal's wording): the school can issue it again. */
export function TeacherContractExpired(props) {
  return (
    <ContractWaiting testId="teacher-contract-expired" title="Contract Expired" {...props}>
      Your agreement has expired. Please contact the administration for further assistance.
    </ContractWaiting>
  );
}

/**
 * The legacy "Documents Under Verification" modal as a screen of the wizard: shown from the moment the verification is
 * submitted (stage 21), until the school moves the teacher on to the bank details. Like the review's lock it looks again
 * by itself every 30 s and has Check status and Log out.
 */
export function TeacherVerificationUnderReview(props) {
  return (
    <ContractWaiting testId="teacher-verification-under-review" title="Documents Under Verification" {...props}>
      Your verification documents are currently under review. We will get back to you within 1 week.
    </ContractWaiting>
  );
}

/**
 * A declined teacher (stage 15 / 25): the backend's message ("Your profile has been declined") and a Log out button.
 * The legacy wizard ended the teacher's login and showed the message on the login page; here the wizard shows it.
 */
export function TeacherDeclined({ message, onLogout }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f2f5fa] px-4" data-testid="teacher-declined">
      <div className="max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-black">Profile declined</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <Button type="button" onClick={onLogout} className="mt-4 cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90">
          Log out
        </Button>
      </div>
    </div>
  );
}
