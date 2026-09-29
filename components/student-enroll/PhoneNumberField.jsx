"use client";

import { useId, useRef, useState } from "react";
import { Smartphone } from "lucide-react";
import { useIntlTelInput } from "@/hooks/useIntlTelInput";

/**
 * Floating-label phone input — see hooks/useIntlTelInput.js for the actual
 * intl-tel-input wiring (shared with the wizard's plain-label variant,
 * components/student-enroll/wizard/fields.jsx's PhoneField). The Smartphone
 * icon sits AFTER intl-tel-input's own flag+dial-code overlay (left-20,
 * matching that overlay's approximate width), not at the field's left edge
 * like every other field's icon — putting it there would collide with the
 * flag. This offset is an approximation (the flag+dial-code overlay's real
 * width varies slightly per country), tuned to look right for common cases.
 */
export function PhoneNumberField({ label = "Contact Number", name = "contactNumber", value, onChange, error, initialCountry, className }) {
  const inputRef = useRef(null);
  const itiRef = useRef(null);
  const id = useId();
  const [focused, setFocused] = useState(false);
  // Length of the selected country's dial code digits (e.g. 2 for "+91", 3
  // for "+971") — intl-tel-input's flag+dial-code overlay gets wider for
  // longer dial codes, so the label needs to shift right to match. Can only
  // be known once useIntlTelInput's onChange fires (itiRef.current is null
  // until its async init finishes — reading it synchronously during render
  // is what crashed here before), so this starts at the common 2-digit case
  // and updates itself on the first real countrychange/input event.
  const [dialCodeLength, setDialCodeLength] = useState(2);

  function handlePhoneChange(payload) {
    const digits = (payload.countryIsdCode || "").replace(/\D/g, "");
    if (digits.length) setDialCodeLength(digits.length);
    onChange?.(payload);
  }

  useIntlTelInput(inputRef, itiRef, handlePhoneChange, initialCountry);

  const floated = focused || Boolean(value);
  // Icon sits right after intl-tel-input's flag+dial-code overlay; label
  // sits one step further right than the icon (icon width + gap).
  const labelLeftClass = dialCodeLength === 1 ? "left-18" : dialCodeLength === 2 ? "left-20" : dialCodeLength === 3 ? "left-23" : "left-26";

  return (
    <div>
      <div className="relative">
        {/* <Smartphone
          className={`pointer-events-none absolute ${iconLeftClass} top-1/2 z-1 h-4 w-4 -translate-y-1/2 ${error ? "text-red-500" : "text-slate-500"}`}
        /> */}
        <label
          htmlFor={id}
          className={`pointer-events-none absolute z-1 bg-white px-1 transition-all ${
            floated ? `left-3 top-0 -translate-y-1/2 text-xs ${error ? "text-red-500" : "text-primary"}` : `${labelLeftClass} top-1/2 -translate-y-1/2 text-sm ${error ? "text-red-500" : "text-slate-500"}`
          }`}
        >
          {label}
        </label>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="tel"
          defaultValue={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`h-12 w-full rounded-md bg-white pl-10 pr-3.5 pt-1 text-sm outline-none ${className} ${
            error ? "border-2 border-red-500" : focused ? "border-2 border-slate-900" : "border border-slate-300"
          }`}
        />
      </div>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
