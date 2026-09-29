"use client";

import { useId, useRef, useState } from "react";
// import { Phone } from "lucide-react";
import { useIntlTelInput } from "@/hooks/useIntlTelInput";

/**
 * Floating-label phone input — see hooks/useIntlTelInput.js for the actual
 * intl-tel-input wiring (shared with the wizard's plain-label variant,
 * components/student-enroll/wizard/fields.jsx's PhoneField).
 */
export function PhoneNumberField({ label = "Contact Number", name = "contactNumber", value, onChange, error, initialCountry }) {
  const inputRef = useRef(null);
  const itiRef = useRef(null);
  const id = useId();
  const [focused, setFocused] = useState(false);

  useIntlTelInput(inputRef, itiRef, onChange, initialCountry);

  const floated = focused || Boolean(value);

  return (
    <div>
      <div className="relative">
        {/* <Phone className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" /> */}
        <label
          htmlFor={id}
          className={`pointer-events-none absolute z-1 bg-white px-1 transition-all ${
            floated ? `left-3 top-0 -translate-y-1/2 text-xs ${error ? "text-red-500" : "text-primary"}` : `left-20 top-1/2 -translate-y-1/2 text-sm ${error ? "text-red-500" : "text-slate-500"}`
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
          className={`h-12 w-full rounded-md bg-white pl-10 pr-3.5 pt-1 text-sm outline-none ${
            error ? "border-2 border-red-500" : focused ? "border-2 border-slate-900" : "border border-slate-300"
          }`}
        />
      </div>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
