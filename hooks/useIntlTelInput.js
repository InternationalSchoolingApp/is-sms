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

  // The panel and its list get explicit pixel heights (60% of the visible area, all of it while the keyboard is
  // up, which leaves 1px above the keyboard). WebKit does not shrink the list inside a percentage max-height flex
  // column, so the list would be clipped instead of scrolling and the later countries could not be reached.
  const layout = () => {
    const visibleHeight = vv ? vv.height : window.innerHeight;
    if (vv) {
      popup.style.top = `${vv.offsetTop}px`;
      popup.style.bottom = "auto";
      popup.style.height = `${vv.height}px`;
    }
    const keyboardOpen = popup.classList.contains("iti--kb-open");
    const available = visibleHeight - 16 - (keyboardOpen ? 1 : 16);
    const panelMax = Math.max(160, Math.floor(keyboardOpen ? available : available * 0.6));
    const selector = popup.querySelector(".iti__country-selector");
    const list = popup.querySelector(".iti__country-list");
    const searchWrapper = popup.querySelector(".iti__search-input-wrapper");
    if (selector) selector.style.maxHeight = `${panelMax}px`;
    if (list) list.style.maxHeight = `${panelMax - (searchWrapper ? searchWrapper.offsetHeight : 49)}px`;
  };
  layout();
  vv?.addEventListener("resize", layout);
  vv?.addEventListener("scroll", layout);

  const onFocusIn = (e) => {
    if (!e.target.matches?.(".iti__search-input")) return;
    popup.classList.add("iti--kb-open");
    layout();
  };
  const onFocusOut = (e) => {
    if (!e.target.matches?.(".iti__search-input")) return;
    popup.classList.remove("iti--kb-open");
    layout();
  };
  // Same reason as the select popup: pressing a country must not blur the search box, or the popup resizes
  // between press and release and the tap never selects the country.
  const keepFocus = (e) => {
    if (!e.target.closest?.(".iti__search-input")) e.preventDefault();
  };
  popup.addEventListener("mousedown", keepFocus);
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
    vv?.removeEventListener("resize", layout);
    vv?.removeEventListener("scroll", layout);
    popup.removeEventListener("mousedown", keepFocus);
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
