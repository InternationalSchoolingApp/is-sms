"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { createPasswordPath, saveCreatePasswordTarget } from "@/utils/addEnrollmentCreatePassword";
import { ArrowRight, Check, Copy, ExternalLink, Eye, EyeOff, User } from "lucide-react";

/**
 * "Set up your student accounts": step 1 creates the SMS password, step 2 signs in to the school Outlook.
 * `data` is the add-another-child thank-you response data (createPasswordUrl, outlookEmail, outlookPassword,
 * outlookLoginUrl). Shown by the payment-response page / wizard only when that response says isFirstPayment = Y.
 */
export function AccountSetupSection({ data }) {
  const router = useRouter();
  const { school } = useParams();
  const hasPasswordStep = Boolean(data.createPasswordUrl);
  const hasOutlook = Boolean(data.outlookEmail && data.outlookPassword);
  if (!hasPasswordStep && !hasOutlook) return null;
  const total = hasPasswordStep ? 2 : 1;

  return (
    <section className="mt-6 flex flex-col gap-5 border-t border-slate-200 pt-6 text-center" aria-labelledby="setup-h">
      <div>
        <p className="mb-1 text-xs font-bold tracking-[0.12em] text-primary uppercase">Next steps</p>
        <h2 id="setup-h" className="mb-1.5 text-xl font-extrabold text-slate-900">
          Start your academic journey
        </h2>
        <p className="text-[13px] text-slate-600">
          We have created your school accounts. Complete {total === 2 ? "these two steps" : "this step"} to get started.
        </p>
      </div>
      <ol className="flex flex-col gap-4">
        {hasPasswordStep && (
          <Step
            num={1}
            current
            title="Unlock your student dashboard"
            text="Create your School Management System (SMS) password to join classes, view your timetable, submit assignments and check grades."
          >
            {data.outlookEmail && (
              <p className="mb-3 flex flex-wrap items-center justify-center gap-1.5 text-[13px] text-slate-600">
                <User className="size-4" aria-hidden="true" />
                Your login email: <strong className="break-all text-slate-900">{data.outlookEmail}</strong>
              </p>
            )}
            <a
              href={data.createPasswordUrl}
              onClick={(event) => {
                // Add-enrollment: our own create-password page (needs the new student's id from the thank-you
                // data); without it, fall back to the legacy link.
                if (!data.childUserId || !school) return;
                event.preventDefault();
                saveCreatePasswordTarget({
                  userId: data.childUserId,
                  name: data.studentName,
                  email: data.loginEmail || data.outlookEmail,
                });
                router.push(createPasswordPath(school));
              }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm sm:w-auto sm:px-6 font-semibold text-white hover:bg-primary/90"
            >
              Create password and unlock dashboard
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </Step>
        )}
        <Step
          num={hasPasswordStep ? 2 : 1}
          current={!hasPasswordStep}
          title="Activate your school email"
          text={
            hasOutlook
              ? "Your official school email on Outlook. Class schedules, payment updates, and announcements are sent here, so check it regularly."
              : "Your Outlook account is being prepared. The details will be shared with you by email."
          }
        >
          {hasOutlook && <OutlookCredentials email={data.outlookEmail} password={data.outlookPassword} url={data.outlookLoginUrl} />}
        </Step>
      </ol>
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13px] text-slate-600">
        Stuck on a step?
        <a
          href="https://wa.me/17273902419"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
        >
          <Image src="/images/whatsapp-new.webp" alt="" width={18} height={18} unoptimized className="size-[18px]" />
          Chat with us on WhatsApp: +1 (727) 390-2419
        </a>
      </p>
    </section>
  );
}

function Step({ num, current, title, text, children }) {
  return (
    <li className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-5 sm:flex-row sm:items-start sm:gap-3 sm:px-5 ${current ? "border-2 border-primary bg-blue-50/40" : "border-slate-200"}`}>
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${current ? "bg-primary text-white" : "bg-blue-50 text-primary"}`}
      >
        {num}
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
        <div>
          <h3 className="mb-1 text-base leading-snug sm:leading-7 font-bold text-slate-900">{title}</h3>
          <p className="text-[13px] leading-[1.45] text-slate-600">{text}</p>
        </div>
        {children && <div className="w-full">{children}</div>}
      </div>
    </li>
  );
}

function OutlookCredentials({ email, password, url }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[10px] border border-slate-200 text-left">
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
      <p className="text-[13px] text-slate-600">Sign in once with these details, then choose your own password.</p>
      {url && (
        <div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] border-2 border-primary px-4 py-2 text-sm sm:w-auto sm:px-6 font-semibold text-primary hover:bg-blue-50"
          >
            Open Outlook
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
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
        <span className="text-[11px] font-semibold text-slate-600">{label}</span>
        <span className={`font-mono text-[13px] break-all ${masked ? "tracking-[0.15em]" : ""}`}>
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
