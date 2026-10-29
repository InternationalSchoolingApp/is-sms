"use client";

import { useId, useRef, useState } from "react";
import { useIntlTelInput } from "@/hooks/useIntlTelInput";

/**
 * Floating-label phone input — dial code and number render as two separate bordered boxes
 * (intl-tel-input's flag+dial-code selector, then a plain number input), via the `.iti-split`
 * rules in app/globals.css. See hooks/useIntlTelInput.js for the intl-tel-input wiring (shared
 * with components/add-enrollment/PhoneNumberField.jsx). Because the dial-code box now sits
 * fully outside the number input, the label's left offset is a fixed value matching that box's
 * width, not a measured one.
 */
export function PhoneNumberField({ label = "Contact Number", name = "contactNumber", value, onChange, error, initialCountry, className }) {
  const inputRef = useRef(null);
  const itiRef = useRef(null);
  const id = useId();
  const [focused, setFocused] = useState(false);

  function handlePhoneChange(payload) {
    onChange?.(payload);
  }

  useIntlTelInput(inputRef, itiRef, handlePhoneChange, initialCountry);

  const floated = focused || Boolean(value);
  return (
    <div>
      <div className="relative">
        {/* Always floated: the dial-code box always has a value. */}
        <span className="pointer-events-none absolute left-3 top-0 z-2 -translate-y-1/2 bg-white px-1 text-xs text-primary max-[319px]:text-[10px]">
          Country Code
        </span>
        <label
          htmlFor={id}
          className={`pointer-events-none absolute z-1 bg-white px-1 transition-all ${
            floated
              ? `left-[6.75rem] top-0 -translate-y-1/2 text-xs max-[319px]:text-[10px] ${error ? "text-red-500" : "text-primary"}`
              // Unfocused + empty, an invalid field's label would otherwise sit
              // oversized and red right where the caret goes — hidden there, it
              // fades in already floated the instant the field is focused.
              : `left-[7.375rem] top-1/2 -translate-y-1/2 text-sm max-[319px]:text-xs ${error ? "text-red-500 opacity-0" : "text-slate-500"}`
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
          inputMode="numeric"
          autoComplete="off"
          placeholder=""
          onInput={(event) => {
            const input = event.currentTarget;
            input.value = input.value.replace(/\D/g, "");
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`h-12 w-full rounded-md bg-white px-3.5 pt-1 text-[17px] outline-none ${className} ${
            error ? "border-2 border-red-500" : focused ? "border-2 border-primary" : value ? "border-2 border-emerald-500" : "border border-slate-300"
          }`}
        />
      </div>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
