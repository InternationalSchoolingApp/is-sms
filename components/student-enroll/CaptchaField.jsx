"use client";

import { RotateCw } from "lucide-react";
import { FaShieldAlt } from "react-icons/fa";
import { AccountInput } from "@/components/student-enroll/AccountInput";
import { getCaptchaImageUrl } from "@/services/studentSignupClientApi";

export function CaptchaField({ schoolUUID, value, onChange, error, cacheBust, onRefresh }) {
  return (
    <div className="flex items-start gap-2.5">
      <AccountInput
        icon={FaShieldAlt}
        label="Enter CAPTCHA"
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
