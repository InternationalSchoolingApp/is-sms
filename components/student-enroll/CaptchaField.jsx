"use client";

import { RefreshCw, Lock } from "lucide-react";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { getCaptchaImageUrl } from "@/services/studentSignupApi";

/** Mirrors SignupCommon.jsp's captcha row: 6-digit input + refreshable image. */
export function CaptchaField({ schoolUUID, value, onChange, error, cacheBust, onRefresh }) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
        <FloatingLabelInput
          icon={Lock}
          label="Enter captcha"
          inputMode="numeric"
          maxLength={6}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
          className="mb-0"
        />
        <span aria-hidden className="text-xl font-extrabold text-primary">
          &larr;
        </span>
        <div className="flex h-[52px] w-[140px] items-center justify-between gap-1.5 rounded-2xl bg-primary px-2 shadow-lg shadow-primary/20">
          <img
            src={getCaptchaImageUrl(schoolUUID, cacheBust)}
            alt="Captcha"
            className="w-[85px] object-contain"
            loading="lazy"
          />
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Captcha"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white hover:text-white"
          >
            <RefreshCw className="h-4 w-4 cursor-pointer" />
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
