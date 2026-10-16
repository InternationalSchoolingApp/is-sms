"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Eye, EyeOff } from "lucide-react";

/**
 * "Set up your student accounts": step 1 creates the SMS password, step 2 signs in to the school Outlook.
 * `data` is the add-another-child thank-you response data (createPasswordUrl, outlookEmail, outlookPassword,
 * outlookLoginUrl). Shown by the payment-response page / wizard only when that response says isFirstPayment = Y.
 */
export function AccountSetupSection({ data }) {
  const hasPasswordStep = Boolean(data.createPasswordUrl);
  const hasOutlook = Boolean(data.outlookEmail && data.outlookPassword);
  if (!hasPasswordStep && !hasOutlook) return null;
  const total = hasPasswordStep ? 2 : 1;

  return (
    <section className="mt-6 flex flex-col gap-[18px] border-t border-slate-200 pt-6 text-left" aria-labelledby="setup-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="setup-h" className="text-lg font-bold text-slate-900">
          Set up your student accounts
        </h2>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          0 of {total} done
        </span>
      </div>
      <ol className="flex flex-col gap-3.5">
         <Step
          num={hasPasswordStep ? 1: 1}
          title="Sign in to your school Outlook"
          text={
            hasOutlook
              ? "Use these details once, then choose a new password when prompted."
              : "Your Outlook account is being prepared. The details will be shared with you by email."
          }
        >
          {hasOutlook && <OutlookCredentials email={data.outlookEmail} password={data.outlookPassword} url={data.outlookLoginUrl} />}
        </Step>
        {hasPasswordStep && (
          <Step
            num={2}
            current
            title="Create your SMS password"
            text="The Student Management System is where you'll find classes, schedules and grades."
          >
            <a
              href={data.createPasswordUrl}
              className="inline-flex min-h-11 items-center rounded-[10px] bg-primary px-5 text-[15px] font-bold text-white hover:bg-primary/90"
            >
              Create password
            </a>
          </Step>
        )}
      </ol>
    </section>
  );
}

function Step({ num, current, title, text, children }) {
  return (
    <li className={`flex gap-4 rounded-xl border p-4 sm:p-5 ${current ? "border-primary bg-blue-50/50" : "border-slate-200"}`}>
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full font-extrabold ${current ? "bg-primary text-white" : "bg-slate-200 text-slate-900"}`}
      >
        {num}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h3 className="mb-1 text-base font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">{text}</p>
        </div>
        {children && <div>{children}</div>}
      </div>
    </li>
  );
}

function OutlookCredentials({ email, password, url }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[10px] border border-slate-200">
        <CredRow label="School email" value={email} copyLabel="Copy school email" />
        <CredRow
          label="Temporary password"
          value={password}
          masked={!show}
          copyLabel="Copy temporary password"
          border
          extra={
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="flex min-h-11 items-center gap-1 px-2.5 text-sm font-semibold text-primary"
            >
              {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              {show ? "Hide" : "Show"}
            </button>
          }
        />
      </div>
      {url && (
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-primary px-5 text-[15px] font-bold text-primary hover:bg-blue-50"
          >
            Open Outlook
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <span className="text-[13px] text-slate-600">{url.replace(/^https?:\/\//, "")}</span>
        </div>
      )}
    </div>
  );
}

function CredRow({ label, value, masked, copyLabel, border, extra }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className={`flex items-center gap-2 py-2 pr-1.5 pl-3.5 ${border ? "border-t border-slate-200" : ""}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className={`font-mono text-sm break-all ${masked ? "tracking-[0.15em]" : ""}`}>
          {masked ? "•".repeat(Math.min(value.length, 14)) : value}
        </span>
      </div>
      {extra}
      <button
        type="button"
        onClick={copy}
        aria-label={copyLabel}
        className={`flex size-11 items-center justify-center ${copied ? "text-emerald-700" : "text-primary"}`}
      >
        {copied ? <Check className="size-[18px]" aria-hidden="true" /> : <Copy className="size-[18px]" aria-hidden="true" />}
      </button>
    </div>
  );
}
