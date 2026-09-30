"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  // intl-tel-input writes the exact width of its flag + dial-code overlay into the input's inline
  // padding-left (77px for "+1", 86px for "+91", 96px for "+213"...), both after its async init and on
  // every country change. The resting label sits exactly at that padding so it never overlaps the dial
  // code, whatever the country.
  const [labelLeft, setLabelLeft] = useState(null);

  function handlePhoneChange(payload) {
    onChange?.(payload);
  }

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const measure = () => {
      const padding = parseFloat(el.style.paddingLeft);
      if (padding) setLabelLeft(padding - 4); // the label has 4px of its own left padding
    };
    const observer = new MutationObserver(measure);
    observer.observe(el, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);

  useIntlTelInput(inputRef, itiRef, handlePhoneChange, initialCountry);

  const floated = focused || Boolean(value);
  return (
    <div>
      <div className="relative">
        {/* <Smartphone
          className={`pointer-events-none absolute ${iconLeftClass} top-1/2 z-1 h-4 w-4 -translate-y-1/2 ${error ? "text-red-500" : "text-slate-500"}`}
        /> */}
        <label
          htmlFor={id}
          className={`pointer-events-none absolute z-1 bg-white px-1 transition-all ${
            floated ? `left-3 top-0 -translate-y-1/2 text-xs ${error ? "text-red-500" : "text-primary"}` : `left-20 top-1/2 -translate-y-1/2 text-sm ${error ? "text-red-500" : "text-slate-500"}`
          }`}
          style={!floated && labelLeft != null ? { left: labelLeft } : undefined}
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
