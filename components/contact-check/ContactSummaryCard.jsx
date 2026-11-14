"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AppWindow, Mail, MessageCircle, Smartphone, UserRound } from "lucide-react";
import { AppDownloadDialog } from "@/components/k5/AppDownloadDialog";
import { useContactSummary } from "@/hooks/useContactSummary";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { displayValue } from "@/utils/contactCheckFlow";

// Only fetched when the student presses "Fix now".
const ContactCheckModal = dynamic(() => import("@/components/contact-check/ContactCheckModal"), { ssr: false });

/**
 * "My contact details" on My Profile (legacy contactCheckContent.js getContactCheckSummaryShell / ccSummaryRow): one row
 * per channel with its value and status, and a button only where something is wrong - "Fix now" opens the contact-check
 * fix popup for that problem, "Get the app" the app download dialog. Hidden until a contact needs attention.
 */

const CHANNELS = {
  EMAIL: { Icon: Mail, label: "Email" },
  MOBILE: { Icon: Smartphone, label: "Mobile (SMS)" },
  WHATSAPP: { Icon: MessageCircle, label: "WhatsApp" },
  APP: { Icon: AppWindow, label: "App notifications" },
};

// Legacy CC_STATUS: [label, tone].
const STATUS = {
  VERIFIED: ["Verified", "ok"],
  OK: ["Working", "ok"],
  INVALID: ["Invalid", "bad"],
  NOT_REACHABLE: ["Not reachable", "warn"],
  APP_NOT_INSTALLED: ["App not installed", "info"],
  UNKNOWN: ["Not checked yet", "none"],
};

const TONE = {
  ok: "bg-[#E4F4EA] text-[#0E5A31]",
  bad: "bg-k5-rt text-k5-ri",
  warn: "bg-k5-yt text-k5-yx",
  info: "bg-k5-act text-k5-acx",
  none: "bg-k5-soft text-k5-mut",
};

const ACTION_BTN =
  "min-h-10 cursor-pointer whitespace-nowrap rounded-full border-none bg-k5-ac px-4 font-k5-display text-[15px] font-semibold text-white disabled:cursor-default disabled:opacity-60";

export function ContactSummaryCard() {
  const { isK5, isMiddle, context } = useDashboardContext();
  const summary = useContactSummary();
  const [appOpen, setAppOpen] = useState(false);
  if (!summary.show && !summary.flow) return null;

  const band = isK5 ? (isMiddle ? "middle" : "elementary") : "high";
  return (
    <section aria-labelledby="k5-contact-summary" className="flex flex-col gap-3 rounded-[18px] border-[3px] border-k5-line bg-k5-card px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-k5-act text-k5-acx">
          <UserRound className="h-[18px] w-[18px]" />
        </span>
        <h3 id="k5-contact-summary" className="m-0 flex-1 font-k5-display text-xl font-semibold">
          My contact details
        </h3>
        <span className="text-sm font-extrabold text-k5-mut">How the school reaches you</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {summary.rows.map((contact) => {
          const channel = CHANNELS[contact.channel] || { Icon: UserRound, label: contact.channel };
          const [statusLabel, tone] = STATUS[contact.status] || STATUS.UNKNOWN;
          const value = displayValue(contact) || contact.value || (contact.channel === "APP" ? "No phone signed in" : "Not given");
          const label = contact.label || channel.label;
          return (
            <li key={`${contact.channel}-${contact.reviewId ?? ""}-${contact.value ?? ""}`} className="flex flex-wrap items-center gap-3 rounded-2xl bg-k5-soft px-3 py-2.5">
              <channel.Icon className="h-5 w-5 flex-none text-k5-acx" aria-hidden="true" />
              <div className="flex min-w-0 flex-[1_1_180px] flex-col">
                <span className="font-k5-display text-base font-semibold">{label}</span>
                <span className="break-words text-sm font-extrabold text-k5-mut">{value}</span>
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-black ${TONE[tone]}`}>{statusLabel}</span>
                {contact.detail && <span className="text-xs font-extrabold text-k5-mut">{contact.detail}</span>}
              </div>
              <div className="flex min-w-[96px] justify-end">
                {contact.status === "APP_NOT_INSTALLED" ? (
                  <button type="button" onClick={() => setAppOpen(true)} className={ACTION_BTN}>
                    Get the app
                  </button>
                ) : contact.reviewId && (contact.status === "INVALID" || contact.status === "NOT_REACHABLE") ? (
                  <button type="button" onClick={() => summary.fix(contact.reviewId)} disabled={summary.opening || Boolean(summary.flow)} className={ACTION_BTN}>
                    Fix now<span className="sr-only"> {label}</span>
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <AppDownloadDialog open={appOpen} schoolName={context?.schoolName} onClose={() => setAppOpen(false)} />
      {summary.flow && <ContactCheckModal check={{ flow: summary.flow, state: summary.state }} band={band} />}
    </section>
  );
}
