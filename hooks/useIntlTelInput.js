"use client";

import { useEffect } from "react";
import "intl-tel-input/styles";

/**
 * Wires intl-tel-input's vanilla JS API onto a plain <input type="tel">
 * ref — confirmed there is no published React component in this package
 * version (intl-tel-input@29.4.0's package.json `exports` map has no
 * "./react" entry). Shared by every phone-input variant (floating-label,
 * plain-label) so the wiring — and any future bugfix in it — only lives in
 * one place.
 *
 * `initialCountry` (ISO2, lowercase) only matters at mount — the widget is
 * only ever created once (empty dep array below) — so a caller that wants
 * to restore a saved country (e.g. Stage 1's get-student-details prefill)
 * must have that value ready BEFORE this component first mounts, not set
 * it asynchronously afterward.
 */
export function useIntlTelInput(inputRef, itiRef, onChange, initialCountry = "in") {
  useEffect(() => {
    let cancelled = false;
    const input = inputRef.current;

    function handleChange() {
      const iti = itiRef.current;
      if (!iti || !input) return;
      // v29's rewritten vanilla API renamed this from the old jQuery-plugin
      // -era getSelectedCountryData() — confirmed by a live "not a function"
      // crash, then checked against intlTelInput.d.ts directly.
      const countryData = iti.getSelectedCountry();
      onChange?.({
        contactNumber: input.value.trim(),
        countryIsdCode: countryData?.dialCode ? `+${countryData.dialCode}` : "",
        countryCode: countryData?.iso2 ? countryData.iso2.toUpperCase() : "",
        isValid: input.value.trim() ? iti.isValidNumber() : false,
      });
    }

    import("intl-tel-input/intlTelInputWithUtils").then(({ default: intlTelInput }) => {
      if (cancelled || !input) return;
      itiRef.current = intlTelInput(input, {
        initialCountry: initialCountry || "in",
        separateDialCode: true,
        dropdownParent: document.body,
      });
      input.addEventListener("countrychange", handleChange);
      input.addEventListener("input", handleChange);
      handleChange();
    });

    return () => {
      cancelled = true;
      input?.removeEventListener("countrychange", handleChange);
      input?.removeEventListener("input", handleChange);
      itiRef.current?.destroy();
      itiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
