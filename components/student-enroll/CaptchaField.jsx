"use client";

import { RotateCw } from "lucide-react";
import { FaShieldAlt } from "react-icons/fa";
import { AccountInput } from "@/components/student-enroll/AccountInput";
import { getCaptchaImageUrl } from "@/services/studentSignupApi";

/**
 * Captcha row for the Account Creation card — matches the signup-new
 * design: a plain "Enter CAPTCHA code" input, a light-blue rounded box
 * showing the challenge, and a solid-blue rounded refresh button.
 *
 * NOTE: the box on the right is the REAL server-generated captcha IMAGE
 * (getCaptchaImageUrl → backend captcha.jpg), NOT static text — the
 * backend validates the typed code against the exact image it generated in
 * the session (see services/authApi.js). The mock's "423567" is only what
 * a generated image happens to look like; it must stay an <img>, so the
 * code the user sees always matches what the server will accept.
 */
export function CaptchaField({ schoolUUID, value, onChange, error, cacheBust, onRefresh }) {
  return (
    <div className="flex items-start gap-2.5">
      <AccountInput
        icon={FaShieldAlt}
        label="Enter CAPTCHA code"
        inputMode="numeric"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        error={error}
        className="min-w-0 flex-1"
      />

      {/* Light-blue challenge box (the real captcha image). */}
      <div className="flex h-[52px] w-[86px] shrink-0 items-center justify-center rounded-xl bg-[#cfe7ff]">
        {/* eslint-disable-next-line @next/next/no-img-element -- server-generated
            captcha bound to the session; must be a raw <img>, not next/image. */}
        <img
          src={getCaptchaImageUrl(schoolUUID, cacheBust)}
          alt="CAPTCHA challenge"
          className="max-h-full w-full object-contain px-1"
          loading="lazy"
        />
      </div>

      {/* Solid-blue refresh button. */}
      <button
        type="button"
        onClick={onRefresh}
        title="Refresh CAPTCHA"
        aria-label="Refresh CAPTCHA"
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-colors hover:bg-primary/90"
      >
        <RotateCw className="h-5 w-5" />
      </button>
    </div>
  );
}
