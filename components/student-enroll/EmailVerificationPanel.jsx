"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resendEmailVerification } from "@/services/studentSignupApi";
import { getHash } from "@/utils/common";

/**
 * Mirrors the #accountConfirmation panel in SignupCommon.jsp — shown after
 * stage-1 succeeds but the account's email isn't verified yet.
 */
export function EmailVerificationPanel({ email, context, onClose }) {
  const [resent, setResent] = useState(false);

  async function handleResend() {
    await resendEmailVerification(context.schoolUUID, {
      // authentication.schoolId is the NUMERIC backend row id (Integer),
      // NOT the UUID/slug used in the URL — same distinction documented in
      // hooks/useAccountSignup.js. schoolUUID carries the slug instead.
      authentication: { hash: getHash(), schoolId: context.schoolNumericId, schoolUUID: context.schoolUUID, userType: "STUDENT" },
      data: { email, userType: "STUDENT" },
    });
    setResent(true);
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-blue-100 bg-white p-6 text-center shadow-sm">
      <h1 className="text-xl font-bold text-primary">Email Verification</h1>
      <p className="mt-3 text-base font-semibold">
        Verification email sent to <span className="text-primary">{email}</span>
      </p>
      <p className="mt-2 text-sm text-slate-600">Please click on the VERIFY EMAIL button in that email.</p>
      <p className="mt-4 text-sm text-slate-600">Not yet received? Check your spam folder or resend the email.</p>
      <Button variant="outline" className="mt-3" onClick={handleResend} disabled={resent}>
        {resent ? "Email resent" : "Resend Email"}
      </Button>
      <button type="button" onClick={onClose} className="mt-4 block w-full text-xs text-slate-400 underline">
        Back
      </button>
    </div>
  );
}
