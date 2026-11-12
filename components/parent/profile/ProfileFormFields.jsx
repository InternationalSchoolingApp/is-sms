"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { useIntlTelInput } from "@/hooks/useIntlTelInput";
import { PROFILE_LANGUAGES } from "@/components/parent/profile/profileLanguages";

/** One read-only value of the profile (label above, value below). */
export function ViewField({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-black/50">{label}</div>
      <div className="break-words text-sm font-semibold text-black">{value || "N/A"}</div>
    </div>
  );
}

/**
 * Phone number with its country: intl-tel-input through hooks/useIntlTelInput.js (dial code box + number box, as the
 * sign-up forms). Mounted only while editing, so every edit starts from the saved number and country.
 * onChange({ phone (national digits), iso (lower case ISO2), isd (dial code digits) }).
 */
export function ParentPhoneField({ label = "Phone Number", initialDigits, initialIso, error, onChange }) {
  const inputRef = useRef(null);
  const itiRef = useRef(null);
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [filled, setFilled] = useState(Boolean(initialDigits));
  // The widget keeps the callback it was created with, so it reads the latest onChange through a ref.
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  const [handleChange] = useState(() => (payload) => {
    const phone = String(payload.contactNumber || "").replace(/\D/g, "");
    setFilled(Boolean(phone));
    latest.current?.({
      phone,
      iso: String(payload.countryCode || "").toLowerCase(),
      isd: String(payload.countryIsdCode || "").replace(/\D/g, ""),
    });
  });

  useIntlTelInput(inputRef, itiRef, handleChange, initialIso || "", { containerClass: "iti-profile" });

  const floated = focused || filled;
  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-0 z-2 -translate-y-1/2 bg-white px-1 text-xs text-primary max-[319px]:text-[10px]">Country Code</span>
        <label
          htmlFor={id}
          className={`pointer-events-none absolute z-1 bg-white px-1 transition-all ${
            floated ? `left-[6.75rem] top-0 -translate-y-1/2 text-xs max-[319px]:text-[10px] ${error ? "text-red-500" : "text-primary"}` : `left-[7.375rem] top-1/2 -translate-y-1/2 text-sm max-[319px]:text-xs ${error ? "text-red-500" : "text-slate-500"}`
          }`}
        >
          {label}
        </label>
        <input
          ref={inputRef}
          id={id}
          type="tel"
          inputMode="tel"
          defaultValue={initialDigits}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`h-12 w-full rounded-md bg-white px-3.5 pt-1 text-sm outline-none ${error ? "border-2 border-red-500" : focused ? "border-2 border-primary" : filled ? "border-2 border-emerald-500" : "border border-slate-300"}`}
        />
      </div>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * "Languages" multi select (legacy select2 multiple over the ISO 639-1 list): the chosen languages as removable chips,
 * a search box and a scrollable checklist that opens in place. value / onChange use the language codes.
 */
export function LanguageSelect({ label = "Languages", value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const chosen = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? PROFILE_LANGUAGES.filter((l) => l.name.toLowerCase().includes(q)) : PROFILE_LANGUAGES;
  }, [query]);
  const toggle = (code) => onChange(chosen.has(code) ? value.filter((c) => c !== code) : [...value, code]);

  return (
    <div>
      <div className="relative">
        <span className={`pointer-events-none absolute left-3 top-0 z-2 -translate-y-1/2 bg-white px-1 text-xs ${open || value.length ? "text-primary" : "text-slate-500"}`}>{label}</span>
        <div className={`flex min-h-12 items-center gap-2 rounded-md bg-white py-2 pl-3 pr-2 ${open ? "border-2 border-primary" : value.length ? "border-2 border-emerald-500" : "border border-slate-300"}`}>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {value.map((code) => (
              <span key={code} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs text-primary">
                {PROFILE_LANGUAGES.find((l) => l.code === code)?.name || code}
                <button type="button" onClick={() => toggle(code)} aria-label={`Remove ${PROFILE_LANGUAGES.find((l) => l.code === code)?.name || code}`} className="rounded-full p-0.5 hover:bg-primary/20">
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={listId} aria-label={open ? "Close languages list" : "Open languages list"} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>
      {open && (
        <div id={listId} className="mt-1 rounded-md border border-slate-300 bg-white">
          <label className="relative block border-b border-slate-200">
            <span className="sr-only">Search languages</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search languages..." className="w-full rounded-t-md py-2 pl-9 pr-3 text-sm text-black outline-none" />
          </label>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox" aria-multiselectable="true" aria-label={label}>
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-black/50">No language found</li>}
            {filtered.map((l) => (
              <li key={l.code} role="option" aria-selected={chosen.has(l.code)}>
                <button type="button" onClick={() => toggle(l.code)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-black hover:bg-slate-50">
                  <input type="checkbox" readOnly tabIndex={-1} checked={chosen.has(l.code)} className="h-4 w-4 accent-primary" aria-hidden="true" />
                  {l.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
