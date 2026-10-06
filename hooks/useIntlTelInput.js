"use client";

import { useEffect } from "react";
import "intl-tel-input/styles";

export function useIntlTelInput(inputRef, itiRef, onChange, initialCountry = "in") {
  useEffect(() => {
    let cancelled = false;
    const input = inputRef.current;

    function handleChange() {
      const iti = itiRef.current;
      if (!iti || !input) return;
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
  }, []);
}
