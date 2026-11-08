"use client";

import { Check } from "lucide-react";

/*
 * Mockup .pfund / .pfotp / .pfotpr / .pfverd: under a saved phone number or e-mail, "Send OTP" (and for a phone with
 * WhatsApp ticked, "WhatsApp OTP"); after sending, a 6-digit box with Verify and Resend; once verified, the
 * accent "Verified" mark. Nothing is offered for a value that is not saved yet (the code goes to the saved value).
 */

const OTP_BTN =
  "inline-flex min-h-8 cursor-pointer items-center rounded-full border-2 border-k5-ac bg-k5-act px-3 font-k5-body text-[13px] font-black text-k5-acx disabled:cursor-wait disabled:opacity-60";

export function VerifiedMark({ children = "Verified" }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1 rounded-full border-2 border-k5-ac bg-k5-act px-2.5 text-[13px] font-black text-k5-acx">
      <Check className="h-3.5 w-3.5" strokeWidth={3.4} aria-hidden="true" />
      {children}
    </span>
  );
}

function CodeRow({ otp, fieldId, channel, label }) {
  const st = otp.state(fieldId, channel);
  const working = otp.busy?.startsWith(`${fieldId}:${channel}`);
  const ready = /^[0-9]{6}$/.test(st.code);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          aria-label={`${label} code`}
          placeholder="Enter OTP"
          value={st.code}
          onChange={(e) => otp.setCode(fieldId, channel, e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ready && otp.verify(fieldId, channel)}
          className="min-h-[46px] w-full min-w-0 flex-1 rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3.5 font-k5-body text-base font-black tracking-[0.3em] text-k5-ink outline-none focus:border-k5-ac"
        />
        <button
          type="button"
          onClick={() => otp.verify(fieldId, channel)}
          disabled={!ready || Boolean(otp.busy)}
          className="min-h-[46px] flex-none cursor-pointer rounded-full border-none bg-[#13803F] px-4 font-k5-display text-base font-semibold text-white shadow-[0_4px_0_#0B5A2B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {working && otp.busy.endsWith("verify") ? "Checking…" : "Verify"}
        </button>
      </div>
      <button type="button" onClick={() => otp.send(fieldId, channel, true)} disabled={Boolean(otp.busy)} className="self-start border-none bg-transparent p-0 text-[13px] font-black text-k5-acx underline disabled:opacity-50">
        Send the code again
      </button>
    </div>
  );
}

/**
 * fieldId: the existing page's id (phoneNumber, altEmailId, fatherPhoneNumber, ...); saved: the value on screen is the
 * saved one and not empty; verified / whatsAppVerified from the profile; whatsApp: WhatsApp is ticked and saved.
 */
export function OtpControl({ otp, fieldId, label, saved, verified, whatsApp, whatsAppVerified }) {
  if (!otp) return null;
  // profileViewNew.js updateProfileContactVerificationUI / updateProfileWhatsappVerificationUI: a WhatsApp check counts
  // only while WhatsApp is ticked, and then also verifies the number.
  const waVerified = Boolean(whatsApp && whatsAppVerified);
  if (verified || waVerified) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <VerifiedMark />
        {waVerified && <VerifiedMark>WhatsApp verified</VerifiedMark>}
      </div>
    );
  }
  if (!saved) return null;
  const email = /email/i.test(fieldId);
  // With WhatsApp ticked the existing page offers only the WhatsApp code (the SMS button is hidden).
  const channels = email ? ["EMAIL"] : whatsApp ? ["WHATSAPP"] : ["PHONE"];
  const sent = channels.filter((ch) => otp.state(fieldId, ch).sent);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {channels.map((ch) => (
          <button key={ch} type="button" onClick={() => otp.send(fieldId, ch)} disabled={Boolean(otp.busy)} className={OTP_BTN}>
            {otp.busy === `${fieldId}:${ch}:send` ? "Sending…" : ch === "WHATSAPP" ? "WhatsApp OTP" : "Send OTP"}
          </button>
        ))}
        {sent.length > 0 && <span className="text-[13px] font-black text-k5-mut">Code sent</span>}
      </div>
      {sent.map((ch) => (
        <CodeRow key={ch} otp={otp} fieldId={fieldId} channel={ch} label={label} />
      ))}
    </div>
  );
}
