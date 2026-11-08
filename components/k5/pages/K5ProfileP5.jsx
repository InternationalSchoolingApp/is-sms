"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { activateSchoolEmail, confirmWithdrawal, getWithdrawal, resetSchoolEmailPassword, startWithdrawal, submitWithdrawalBank } from "@/services/profileP5Api";
import { callServer } from "@/utils/serverCall";

/*
 * My Profile P5 on the K–5 page (mockup sections 6 and 7):
 *   6 · Student School Email Account: activate the Microsoft 365 school user ID, Open Outlook, copy e-mail / password,
 *       reset the password (sent to the primary e-mail) — profileViewNewContent.js studentEmailInformation.
 *   7 · Withdrawal Request: student details, own requests with a status tracker, a new request (reason, details,
 *       Terms & Refund Policy, agreement) confirmed with an e-mailed 6-digit code, and bank details after approval
 *       — withdrawalRequestUser.js. Server calls: services/profileP5Api.js.
 */

const GRID2 = "grid grid-cols-2 gap-x-4 gap-y-3.5 max-[600px]:grid-cols-1";
const H3 = "m-0 font-k5-display text-xl font-semibold text-k5-ink";
const LABEL = "relative flex min-w-0 flex-col gap-1.5 pt-1.5 text-sm font-black text-k5-mut [&>span:first-child]:pointer-events-none [&>span:first-child]:absolute [&>span:first-child]:start-3 [&>span:first-child]:top-0 [&>span:first-child]:z-[1] [&>span:first-child]:-translate-y-1/2 [&>span:first-child]:bg-k5-card [&>span:first-child]:px-1 [&>span:first-child]:text-xs [&>span:first-child]:leading-none";
const INPUT =
  "h-[50px] w-full min-w-0 rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3.5 pt-1 font-k5-body text-base font-extrabold text-k5-ink outline-none focus:border-k5-ac";
const RO = "flex h-[50px] items-center gap-2 rounded-[14px] border-[3px] border-k5-line bg-k5-soft px-3.5 py-2 font-k5-body text-base font-extrabold text-k5-ink [overflow-wrap:anywhere]";
const ACCENT_BTN =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border-[3px] border-k5-ac bg-k5-ac px-5 font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] no-underline disabled:cursor-not-allowed disabled:opacity-50";
const PLAIN_BTN =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border-[3px] border-k5-line bg-k5-card px-5 font-k5-display text-[17px] font-semibold text-k5-ink shadow-[0_4px_0_var(--k5-line)] disabled:cursor-not-allowed disabled:opacity-50";
const HR = <hr className="my-1 h-[3px] rounded-[3px] border-none bg-k5-line" />;
const SUPPORT_EMAIL = "admin.support@internationalschooling.org";

const clean = (error) => String(error?.message || "Something went wrong.").replace(/^[A-Z_0-9]+:\s*/, "");

function Note({ tone = "yellow", title, children }) {
  const tones = {
    yellow: "border-k5-yb bg-k5-yt",
    accent: "border-k5-ac bg-k5-act",
    red: "border-k5-ri bg-k5-rt",
  };
  return (
    <div role="note" className={`flex items-start gap-3 rounded-[18px] border-[3px] px-4 py-3 text-[15px] font-extrabold leading-[1.45] text-k5-ink ${tones[tone]}`}>
      <span aria-hidden="true" className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[#FFC531] font-k5-display text-lg font-bold text-[#3A2A00]">
        i
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        {title && <strong className="font-k5-display text-lg font-semibold">{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

function Modal({ open, title, onClose, children, footer, labelId }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    ref.current?.querySelector("input,button")?.focus();
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(10,16,34,0.45)] p-4" onClick={() => onClose?.()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100vh-32px)] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-[26px] border-[3px] border-k5-ink bg-k5-card p-6 shadow-[0_6px_0_var(--k5-ink)]"
      >
        <h2 id={labelId} className="m-0 font-k5-display text-2xl font-semibold">
          {title}
        </h2>
        {children}
        {footer && <div className="flex flex-wrap justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}

function CopyValue({ label, value, secret }) {
  const [show, setShow] = useState(!secret);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Please copy it by hand.");
    }
  };
  return (
    <div className={LABEL}>
      <span>{label}</span>
      <span className={RO}>
        <span className={`min-w-0 flex-1 ${secret ? "font-mono" : ""}`}>{value ? (show ? value : "•".repeat(Math.min(12, value.length))) : "—"}</span>
        {value && secret && (
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border-none bg-transparent text-k5-acx">
            {show ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        )}
        {value && (
          <button type="button" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`} className="flex h-9 flex-none cursor-pointer items-center gap-1 rounded-[10px] border-none bg-transparent px-1.5 text-sm font-black text-k5-acx">
            {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
            {copied ? "Copied!" : null}
          </button>
        )}
      </span>
    </div>
  );
}

/** Section 6. */
export function SchoolEmailEditor({ m, refetch }) {
  const e = m.schoolEmail;
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(null);
  const run = async (key, action, done) => {
    setBusy(key);
    try {
      const result = await callServer(action);
      await refetch?.();
      toast.success(result?.message || done);
      return true;
    } catch (error) {
      toast.error(clean(error));
      return false;
    } finally {
      setBusy(null);
    }
  };
  if (!e.active) {
    return (
      <>
        <Note title="Your school user ID is not active yet">Activate it to get your own school email and Microsoft Outlook account.</Note>
        <div>
          <button type="button" onClick={() => setAsk(true)} disabled={Boolean(busy)} className={ACCENT_BTN}>
            <Mail className="h-5 w-5" aria-hidden="true" />
            {busy ? "Activating…" : "Activate your school user ID"}
          </button>
        </div>
        <Modal
          open={ask}
          labelId="k5-pf-azure-h"
          title="Activate your school user ID?"
          onClose={() => !busy && setAsk(false)}
          footer={
            <>
              <button type="button" onClick={() => setAsk(false)} disabled={Boolean(busy)} className={PLAIN_BTN}>
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={async () => {
                  const ok = await run("activate", () => activateSchoolEmail(), "Your school user ID is ready!");
                  if (ok) {
                    setAsk(false);
                    // The existing page opens Outlook right after activating (confirmActivateSchoolUserId).
                    window.open("https://outlook.office.com", "_blank", "noopener,noreferrer");
                  }
                }}
                className={ACCENT_BTN}
              >
                {busy ? "Activating…" : "Yes, activate"}
              </button>
            </>
          }
        >
          <p className="m-0 text-base font-extrabold leading-[1.45]">We will create your school email and password. You can then sign in to Outlook with them.</p>
        </Modal>
      </>
    );
  }
  return (
    <>
      <div className={GRID2}>
        <CopyValue label="Email" value={e.email} />
        <CopyValue label="Password" value={e.password} secret />
      </div>
      <div className="flex flex-wrap gap-2.5">
        <a href="https://outlook.office.com" target="_blank" rel="noopener noreferrer" className={ACCENT_BTN}>
          <Mail className="h-5 w-5" aria-hidden="true" />
          Open Outlook
        </a>
        {e.passwordCreated && (
          <button type="button" onClick={() => setAsk(true)} disabled={Boolean(busy)} className={PLAIN_BTN}>
            <KeyRound className="h-5 w-5" aria-hidden="true" />
            Reset password
          </button>
        )}
      </div>
      <Modal
        open={ask}
        labelId="k5-pf-azure-reset-h"
        title="Reset your school email password?"
        onClose={() => !busy && setAsk(false)}
        footer={
          <>
            <button type="button" onClick={() => setAsk(false)} disabled={Boolean(busy)} className={PLAIN_BTN}>
              Cancel
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={async () => {
                const ok = await run("reset", () => resetSchoolEmailPassword(), "A new password was sent to your primary email.");
                if (ok) setAsk(false);
              }}
              className={ACCENT_BTN}
            >
              {busy ? "Resetting…" : "Yes, reset"}
            </button>
          </>
        }
      >
        <p className="m-0 text-base font-extrabold leading-[1.45]">We will make a new password and send it to your primary email.</p>
      </Modal>
    </>
  );
}

// ---- Section 7 ----

const STATUS = {
  PENDING: { label: "In Review", tone: "yellow", group: "review" },
  INITIATED: { label: "In Review", tone: "yellow", group: "review" },
  ACCEPTED: { label: "Approved", tone: "accent", group: "approved" },
  BANKDETAIL: { label: "Approved · Bank details submitted", tone: "accent", group: "approved" },
  TRANSFERRED: { label: "Refund Initiated", tone: "accent", group: "refund" },
  REJECTED: { label: "Denied", tone: "red", group: "denied" },
  CHALLENGED: { label: "Challenged", tone: "red", group: "challenged" },
  CANCELLED: { label: "Cancelled", tone: "red", group: "cancelled" },
  DIRECT_WITHDRAWN: { label: "Withdrawn", tone: "accent", group: "refund" },
};
const statusOf = (s) => STATUS[s] || { label: s || "—", tone: "yellow", group: "review" };
const BADGE = { yellow: "border-k5-yb bg-k5-yt text-k5-yx", accent: "border-k5-ac bg-k5-act text-k5-acx", red: "border-k5-ri bg-k5-rt text-k5-ri" };

/** Mockup .pfwdtr: Submitted → In Review → Decision (→ Refund). */
function Tracker({ status }) {
  const { group } = statusOf(status);
  const review = group === "review";
  const steps = [
    { label: "Submitted", state: "done" },
    { label: "In Review", state: review ? "now" : "done" },
  ];
  if (group === "approved" || group === "refund") {
    steps.push({ label: "Approved", state: "done" }, { label: group === "refund" ? "Refund initiated" : "Refund", state: group === "refund" ? "done" : "now" });
  } else if (group === "denied" || group === "challenged") {
    steps.push({ label: "Denied", state: "bad" });
    if (group === "challenged") steps.push({ label: "Challenged", state: "done" });
  } else if (group === "cancelled") {
    steps.push({ label: "Cancelled", state: "bad" });
  } else {
    steps.push({ label: "Decision", state: "todo" });
  }
  return (
    <ol className="m-0 flex list-none items-start gap-2 overflow-x-auto p-0">
      {steps.map((s, i) => (
        <li key={s.label} className="flex flex-1 items-start gap-2">
          <span className="flex min-w-[76px] flex-none flex-col items-center gap-2">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full border-[3px] font-k5-display text-lg font-semibold ${
                s.state === "done" ? "border-k5-ac bg-k5-ac text-white" : s.state === "now" ? "border-k5-ac bg-k5-card text-k5-acx" : s.state === "bad" ? "border-k5-ri bg-k5-ri text-white" : "border-k5-line bg-k5-card text-k5-mut"
              }`}
            >
              {s.state === "done" ? <Check className="h-5 w-5" strokeWidth={3.4} aria-hidden="true" /> : s.state === "bad" ? "✕" : i + 1}
            </span>
            <span className="text-center text-sm font-black">{s.label}</span>
            <span className="sr-only">{s.state === "done" ? "(done)" : s.state === "now" ? "(now)" : ""}</span>
          </span>
          {i < steps.length - 1 && <span aria-hidden="true" className={`mt-5 block h-1 flex-1 rounded ${s.state === "done" ? "bg-k5-ac" : "bg-k5-line"}`} />}
        </li>
      ))}
    </ol>
  );
}

const BANK = [
  ["accountHolder", "Account holder name", true],
  ["holderAddress", "Account holder address", true],
  ["postalCode", "Postal code", true],
  ["phone", "Phone number", true],
  ["accountNo", "Account number", true],
  ["bankName", "Bank name", true],
  ["branchAddress", "Bank branch address", true],
  ["swiftCode", "Bank SWIFT code", true],
  ["routingNo", "ABA / Routing number (if applicable)", false],
];

function BankForm({ requestId, onDone }) {
  const [values, setValues] = useState({});
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const ready = BANK.every(([k, , req]) => !req || String(values[k] || "").trim());
  const submit = async () => {
    setBusy(true);
    try {
      await callServer(() => submitWithdrawalBank({ requestId, bank: values }));
      toast.success("Bank details submitted.");
      setAsk(false);
      await onDone();
    } catch (error) {
      toast.error(clean(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-3">
      <h3 className={H3}>Add your bank details to start the refund</h3>
      <div className={GRID2}>
        {BANK.map(([k, label, req]) => (
          <label key={k} className={LABEL}>
            <span>
              {label}
              {req && <span className="text-k5-ri"> *</span>}
            </span>
            <input value={values[k] || ""} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} autoComplete="off" className={INPUT} />
          </label>
        ))}
      </div>
      <p className="m-0 text-[13px] font-extrabold text-k5-mut">Please double-check these details — wrong information can delay or stop your refund.</p>
      <Note tone="red" title="Your account will be deactivated">
        Once the refund is initiated by the school, your account and access to all enrolled platforms will be permanently deactivated.
      </Note>
      <div>
        <button type="button" onClick={() => setAsk(true)} disabled={!ready || busy} className={ACCENT_BTN}>
          Submit bank details
        </button>
      </div>
      <Modal
        open={ask}
        labelId={`k5-wd-bank-${requestId}`}
        title="Your account will be deactivated"
        onClose={() => !busy && setAsk(false)}
        footer={
          <>
            <button type="button" onClick={() => setAsk(false)} disabled={busy} className={PLAIN_BTN}>
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={busy} className={ACCENT_BTN}>
              {busy ? "Submitting…" : "Submit bank details"}
            </button>
          </>
        }
      >
        <p className="m-0 text-base font-extrabold leading-[1.45]">
          Once your refund is started by the school, your account and access to all your learning platforms will be turned off. Do you want to submit the bank details now?
        </p>
      </Modal>
    </div>
  );
}

function BankSummary({ bank }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className={H3}>Bank details submitted</h3>
      <div className={GRID2}>
        {BANK.map(([k, label]) => (
          <div key={k} className={LABEL}>
            <span>{label}</span>
            <span className={RO}>{bank[k] || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestCard({ req, onRefresh }) {
  const meta = statusOf(req.status);
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border-[3px] border-k5-line bg-k5-card px-5 py-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-sm font-black text-k5-mut">{req.requestNo || `WD-${req.requestId}`}</span>
          <strong className="font-k5-display text-lg font-semibold">{req.reason || "Withdrawal request"}</strong>
          {req.createdDate && <span className="text-sm font-extrabold text-k5-mut">Submitted {req.createdDate}</span>}
        </div>
        <span className={`rounded-full border-2 px-3 py-1 text-sm font-black ${BADGE[meta.tone]}`}>{meta.label}</span>
      </div>
      <Tracker status={req.status} />
      <div className="rounded-[16px] border-[3px] border-k5-line bg-k5-soft px-4 py-3 text-[15px] font-extrabold">
        <span className="text-k5-mut">Your request · </span>
        {req.description || "—"}
      </div>
      {/* withdrawalRequestUser.js getWithdrawalRequestCardHtml: the decision shows the reason in bold, then the remarks. */}
      {["REJECTED", "CHALLENGED", "ACCEPTED"].includes(req.status) && (req.remarks || req.reason) && (
        <Note tone={meta.tone === "red" ? "red" : "accent"} title="Decision · Student Services">
          <b>{req.reason || (req.status === "ACCEPTED" ? "Approved" : "")}</b>
          {req.remarks && (
            <>
              <br />
              {req.remarks}
            </>
          )}
        </Note>
      )}
      {req.status === "REJECTED" && (
        <Note title="Disagree with this decision?">
          As set out in the Terms &amp; Conditions, you may challenge this decision in a <b>United States</b> or <b>Singapore</b> court. To proceed, contact <b>{SUPPORT_EMAIL}</b> — a school administration representative will be in touch.
        </Note>
      )}
      {req.status === "ACCEPTED" && (
        <Note tone="accent" title="Process for Fee Refund">
          Please refer to the Fee Refund Policy{" "}
          <a href="https://internationalschooling.org/fee-refund-policy" target="_blank" rel="noopener noreferrer" className="font-black text-k5-acx underline">
            here
          </a>
          .
        </Note>
      )}
      {req.status === "CHALLENGED" && <Note title="This request is marked as Challenged">Your challenge is under review. A school representative will be in touch.</Note>}
      {req.status === "ACCEPTED" && (req.bank ? <BankSummary bank={req.bank} /> : <BankForm requestId={req.requestId} onDone={onRefresh} />)}
      {(req.status === "BANKDETAIL" || req.status === "TRANSFERRED") && (
        <>
          <Note tone="accent" title={req.status === "TRANSFERRED" ? "Refund started" : "Bank details submitted"}>
            {/* withdrawalRequestUser.js: TRANSFERRED shows the finance remarks (or the default line), BANKDETAIL the wait. */}
            {req.status === "TRANSFERRED"
              ? req.remarks || "Your refund is being processed and will reach the original payer within 5–10 business working days."
              : "Your refund will be initiated by the school and processed to the original payer within 5–10 business working days per the Fee Refund Policy."}
          </Note>
          {req.bank && <BankSummary bank={req.bank} />}
        </>
      )}
    </div>
  );
}

function Policy({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[18px] border-[3px] border-k5-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-14 w-full cursor-pointer items-center gap-2.5 border-none bg-k5-card px-4 py-2 text-start font-k5-body text-[17px] font-black text-k5-ink"
      >
        <span>{title}</span>
        <span className="rounded-full border-2 border-k5-yb bg-k5-yt px-2.5 py-0.5 text-xs font-black uppercase tracking-[0.04em] text-k5-yx">Please read</span>
        <ChevronDown className={`ms-auto h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="px-5 pb-4 text-[15px] font-extrabold leading-[1.5]">{children}</div>}
    </div>
  );
}

function OtpBoxes({ value, onChange, onEnter }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");
  const setAt = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, 6));
  };
  return (
    <div className="flex justify-center gap-2 max-[420px]:gap-1.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          maxLength={1}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
            if (text) {
              e.preventDefault();
              onChange(text);
              refs.current[Math.min(text.length, 5)]?.focus();
            }
          }}
          onChange={(e) => {
            const n = e.target.value.replace(/[^0-9]/g, "").slice(-1);
            setAt(i, n);
            if (n && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "Enter") onEnter?.();
          }}
          className={`h-16 w-14 rounded-2xl border-[3px] text-center font-k5-display text-[28px] font-semibold text-k5-ink outline-none focus:border-k5-ac max-[420px]:h-[52px] max-[420px]:w-[42px] max-[420px]:text-[22px] ${d ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card"}`}
        />
      ))}
    </div>
  );
}

function NewRequest({ reasons, onDone }) {
  const [reasonId, setReasonId] = useState("");
  const [details, setDetails] = useState("");
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState(null); // null | { requestId, email }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { requestNo, email }
  const ready = reasonId && details.trim() && agree;

  const send = async () => {
    setBusy(true);
    try {
      const r = await callServer(() => startWithdrawal({ reasonId, description: details }));
      setCode("");
      setStep(r);
    } catch (error) {
      toast.error(clean(error));
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    if (!/^[0-9]{6}$/.test(code)) return;
    setBusy(true);
    try {
      const r = await callServer(() => confirmWithdrawal({ requestId: step.requestId, otp: code }));
      setDone({ requestNo: r.requestNo, email: step.email });
      setStep(null);
      setReasonId("");
      setDetails("");
      setAgree(false);
      await onDone();
    } catch (error) {
      toast.error(clean(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h3 className={H3}>New Withdrawal Request</h3>
      <label className={LABEL}>
        <span>
          Primary reason<span className="text-k5-ri"> *</span>
        </span>
        <select value={reasonId} onChange={(e) => setReasonId(e.target.value)} className={`${INPUT} cursor-pointer`}>
          <option value="">Select a reason…</option>
          {reasons.map((r) => (
            <option key={r.id} value={r.id}>
              {r.reason}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        <span>
          Tell us more<span className="text-k5-ri"> *</span>
        </span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Briefly explain the reason for this withdrawal request..."
          className={`${INPUT} resize-y py-3 leading-[1.45]`}
        />
      </label>
      <Policy title="Withdrawal Terms & Conditions">
        <ul className="m-0 flex flex-col gap-2 ps-5">
          <li>Once the withdrawal is completed, access to all the platforms you were enrolled in will be turned off.</li>
          <li>If you wish to join again after the withdrawal is completed, it will be a fresh enrollment.</li>
          <li>A refund (if any) is made only to the bank account the fee was paid from, without the handling and transaction fees.</li>
          <li>Requests not in the specified format will not be accepted.</li>
          <li>If any personal, academic or other detail was hidden or misrepresented, or false documents were submitted, no refund applies.</li>
          <li>The Enrollment Fee is not refunded under any circumstances.</li>
        </ul>
      </Policy>
      <Policy title="Fee Refund Policy">
        <p className="m-0 mb-3">Refunds (if any) follow the school&apos;s official Fee Refund Policy. Please read the full policy before you submit.</p>
        <a href="https://internationalschooling.org/fee-refund-policy" target="_blank" rel="noopener noreferrer" className={ACCENT_BTN}>
          View the full Fee Refund Policy
        </a>
      </Policy>
      <label className="flex cursor-pointer items-start gap-3 rounded-[16px] border-[3px] border-k5-line bg-k5-soft px-4 py-3.5 text-base font-black leading-[1.4]">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none cursor-pointer accent-[var(--k5-ac)]" />
        I have read and accept the Withdrawal Terms &amp; Conditions and the Fee Refund Policy.
      </label>
      <div className="flex flex-wrap items-center gap-3.5 rounded-[18px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3.5">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
          <strong className="font-k5-display text-lg font-semibold text-k5-yx">Please read before submitting</strong>
          <span className="text-[15px] font-extrabold leading-[1.45]">
            Submitting this request begins the cancellation of your enrollment and tells the school administration. Your enrollment and fees stay active until the withdrawal is
            approved. You&apos;ll confirm with a one-time code sent to your email first.
          </span>
        </div>
        <button type="button" onClick={send} disabled={!ready || busy} className={ACCENT_BTN}>
          {busy && !step ? "Sending code…" : "Verify & submit request"}
        </button>
      </div>

      <Modal
        open={Boolean(step)}
        labelId="k5-wd-otp-h"
        title="Verify it's you"
        onClose={() => !busy && setStep(null)}
        footer={
          <>
            <button type="button" onClick={() => setStep(null)} disabled={busy} className={PLAIN_BTN}>
              Cancel
            </button>
            <button type="button" onClick={verify} disabled={busy || !/^[0-9]{6}$/.test(code)} className={ACCENT_BTN}>
              {busy ? "Checking…" : "Verify & submit"}
            </button>
          </>
        }
      >
        <p className="m-0 text-base font-extrabold">
          We&apos;ve sent a 6-digit code to <b>{step?.email || "your registered email"}</b>.
        </p>
        <OtpBoxes value={code} onChange={setCode} onEnter={verify} />
        <Note title="This begins your enrollment cancellation">
          Once verified, the withdrawal request is submitted and the school administration is told. You can follow its status here afterwards.
        </Note>
      </Modal>

      <Modal
        open={Boolean(done)}
        labelId="k5-wd-done-h"
        title="Withdrawal request submitted"
        onClose={() => setDone(null)}
        footer={
          <button type="button" onClick={() => setDone(null)} className={ACCENT_BTN}>
            Done
          </button>
        }
      >
        <p className="m-0 text-base font-extrabold">Reference {done?.requestNo || "—"} · Status: In Review</p>
        <p className="m-0 text-[15px] font-extrabold leading-[1.45]">
          A confirmation email has been sent{done?.email ? <> to <b>{done.email}</b></> : null}. A representative from the school administration will be in touch.
        </p>
        <Note>
          Need help? You can contact us at <b>{SUPPORT_EMAIL}</b>.
        </Note>
      </Modal>
    </>
  );
}

/** Section 7. */
export function WithdrawalEditor({ m }) {
  const query = useQuery({
    queryKey: ["my-withdrawal", m.academic.studentId],
    queryFn: () => callServer(() => getWithdrawal()),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const data = query.data;
  const student = data?.student || {};
  return (
    <>
      <h3 className={H3}>Student Details</h3>
      <div className={GRID2}>
        {[
          ["Student ID", student.studentStringId || m.academic.studentId, true],
          ["Full Name", student.studentName || m.header.name],
          ["Grade", student.standardName || m.academic.grade],
          ["Learning Program", m.academic.learningProgram || student.programName],
        ].map(([label, value, mono]) => (
          <div key={label} className={LABEL}>
            <span>{label}</span>
            <span className={`${RO} ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
          </div>
        ))}
      </div>
      {HR}
      {query.isPending ? (
        <p className="m-0 font-k5-display text-lg font-semibold text-k5-mut" role="status">
          Loading your withdrawal requests…
        </p>
      ) : query.error ? (
        <Note tone="red" title="We couldn't load this">
          {clean(query.error)}{" "}
          <button type="button" onClick={() => query.refetch()} className="border-none bg-transparent p-0 font-black text-k5-acx underline">
            Try again
          </button>
        </Note>
      ) : (
        <>
          {data.requests.length > 0 && (
            <>
              <h3 className={H3}>My Withdrawal Requests</h3>
              {data.requests.map((req) => (
                <RequestCard key={req.requestId} req={req} onRefresh={() => query.refetch()} />
              ))}
            </>
          )}
          {data.canCreate ? (
            <>
              {data.requests.length > 0 && HR}
              <NewRequest reasons={data.reasons} onDone={() => query.refetch()} />
            </>
          ) : data.requests.length ? (
            <Note>
              You have a withdrawal request in progress (see its status above). You can submit a new request only once the current one is completed. Need help? Contact <b>{SUPPORT_EMAIL}</b> or <b>+1 (585) 4990662</b>.
            </Note>
          ) : (
            <p className="m-0 text-base font-extrabold text-k5-mut">No withdrawal request yet.</p>
          )}
        </>
      )}
    </>
  );
}
