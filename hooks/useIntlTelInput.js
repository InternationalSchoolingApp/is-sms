"use client";

import { useEffect } from "react";
import "intl-tel-input/styles";

// On phones intl-tel-input shows its country list as a full-screen popup. This decorates it to match the app's
// own select popup (components/ui/floating-label-select.jsx): a red close button beside the search box, the popup
// sized to the part of the screen not covered by the keyboard, and 1px between it and the keyboard while typing.
// Only the popup's own DOM / classes are touched; the matching CSS is in app/globals.css (".iti--fullscreen-popup").
function decorateFullscreenPopup(closePopup) {
  const popup = document.querySelector(".iti--fullscreen-popup");
  if (!popup) return () => {};
  const vv = window.visualViewport;

  const syncViewport = () => {
    if (!vv) return;
    popup.style.top = `${vv.offsetTop}px`;
    popup.style.bottom = "auto";
    popup.style.height = `${vv.height}px`;
  };
  syncViewport();
  vv?.addEventListener("resize", syncViewport);
  vv?.addEventListener("scroll", syncViewport);

  const onFocusIn = (e) => {
    if (e.target.matches?.(".iti__search-input")) popup.classList.add("iti--kb-open");
  };
  const onFocusOut = (e) => {
    if (e.target.matches?.(".iti__search-input")) popup.classList.remove("iti--kb-open");
  };
  popup.addEventListener("focusin", onFocusIn);
  popup.addEventListener("focusout", onFocusOut);

  const wrapper = popup.querySelector(".iti__search-input-wrapper");
  let button = null;
  if (wrapper) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "iti__popup-close";
    button.setAttribute("aria-label", "Close");
    button.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    // Keep the search box focused on press, otherwise it blurs first, the popup resizes and the click misses.
    button.addEventListener("pointerdown", (e) => e.preventDefault());
    button.addEventListener("click", closePopup);
    wrapper.appendChild(button);
  }

  return () => {
    vv?.removeEventListener("resize", syncViewport);
    vv?.removeEventListener("scroll", syncViewport);
    popup.removeEventListener("focusin", onFocusIn);
    popup.removeEventListener("focusout", onFocusOut);
    button?.remove();
  };
}

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

    let undecorate = null;
    function handleOpenSelector() {
      undecorate?.();
      undecorate = decorateFullscreenPopup(() => itiRef.current?.closeCountrySelector());
    }
    function handleCloseSelector() {
      undecorate?.();
      undecorate = null;
    }

    import("intl-tel-input/intlTelInputWithUtils").then(({ default: intlTelInput }) => {
      if (cancelled || !input) return;
      itiRef.current = intlTelInput(input, {
        initialCountry: initialCountry || "in",
        separateDialCode: true,
        dropdownParent: document.body,
      });
      input.addEventListener("open:countryselector", handleOpenSelector);
      input.addEventListener("close:countryselector", handleCloseSelector);
      input.addEventListener("countrychange", handleChange);
      input.addEventListener("input", handleChange);
      handleChange();
    });

    return () => {
      cancelled = true;
      undecorate?.();
      input?.removeEventListener("open:countryselector", handleOpenSelector);
      input?.removeEventListener("close:countryselector", handleCloseSelector);
      input?.removeEventListener("countrychange", handleChange);
      input?.removeEventListener("input", handleChange);
      itiRef.current?.destroy();
      itiRef.current = null;
    };
  }, []);
}
