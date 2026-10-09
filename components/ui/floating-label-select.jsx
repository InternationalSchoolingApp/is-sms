"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RequiredAsterisk } from "@/components/common/RequiredAsterisk";

/**
 * Select/dropdown counterpart to FloatingLabelInput — same visual language
 * (thin light-gray border when empty+closed, label inline as placeholder;
 * solid dark border-2 + label floated to the top border line in blue when
 * open or a value is chosen). Use this for every dropdown across the
 * project, same as FloatingLabelInput for text fields — never a plain
 * placeholder-only <Select>.
 *
 * Pass `searchable` for long option lists (country/state/city, 40-250+
 * items) — the legacy app used select2 for exactly these fields. Plain
 * base-ui `Select` has no built-in search box, so this renders a
 * Popover + text input + filtered list instead when `searchable` is set;
 * short fixed lists (gender, grade) should keep the default, non-searchable
 * form.
 */
export function FloatingLabelSelect({ searchable = false, ...props }) {
  // Dispatches to one of two sibling components rather than branching
  // inline, so neither implementation calls its hooks conditionally
  // (react-hooks/rules-of-hooks) depending on the `searchable` prop.
  return searchable ? <SearchableFloatingLabelSelect {...props} /> : <PlainFloatingLabelSelect {...props} />;
}

// Mobile screens get the same popup the phone-number country picker uses: a dimmed backdrop with a white panel
// (search on top, list below) sized to the *visible* part of the screen. An anchored dropdown cannot work with the
// on-screen keyboard, which on iOS does not shrink the layout viewport and so covers the list / the last field.
// Phone-sized screens only (below md, 768px): the popup is for mobile; tablets / desktops keep the dropdown.
const MOBILE_QUERY = "(max-width: 767px)";

function useIsTouch() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(MOBILE_QUERY);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

function useVisualViewportBox() {
  const [box, setBox] = useState({ top: 0, height: null });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => setBox({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return box;
}

const SHEET_SEARCH_MIN_OPTIONS = 8;

function MobileSelectSheet({ options, value, onSelect, onClose, searchable }) {
  const { top, height } = useVisualViewportBox();
  const [query, setQuery] = useState("");
  // True while the search box has focus, i.e. the on-screen keyboard is up.
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const showSearch = searchable || options.length >= SHEET_SEARCH_MIN_OPTIONS;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((option) => option.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  function handleBackdrop() {
    // While the keyboard is up a tap outside only dismisses the keyboard; the next one closes the popup.
    if (searchRef.current && document.activeElement === searchRef.current) searchRef.current.blur();
    else onClose();
  }

  return createPortal(
    <div
      className={`fixed inset-x-0 z-[100] bg-black/50 px-4 pt-4 ${searchFocused ? "pb-px" : "pb-4"}`}
      style={{ top, height: height ?? "100dvh" }}
      onClick={handleBackdrop}
      role="presentation"
    >
      <div
        className={`mx-auto flex ${searchFocused ? "max-h-full" : "max-h-[60%]"} max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {showSearch && (
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              autoFocus={searchable}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full text-base outline-none placeholder:text-slate-400"
            />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
          {filtered.length === 0 && <p className="px-4 py-3 text-center text-sm text-slate-400">No results</p>}
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-base hover:bg-slate-100"
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

function PlainFloatingLabelSelect({ icon: Icon, label, required = false, value, onValueChange, options, error, disabled = false, className = "" }) {
  const [open, setOpen] = useState(false);
  const isTouch = useIsTouch();
  const floated = open || Boolean(value);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={className}>
      <div className="relative">
        {Icon && (
          <Icon className={`pointer-events-none absolute left-3.5 top-1/2 z-1 h-4 w-4 -translate-y-1/2 ${disabled ? "text-slate-400" : "text-slate-500"}`} />
        )}
        {label && (
          <label
            className={`pointer-events-none absolute z-10 max-w-[calc(100%-1.5rem)] overflow-hidden text-ellipsis bg-white px-1 transition-all ${
              floated
                ? `left-3 top-0 -translate-y-1/2 whitespace-nowrap text-xs max-[319px]:text-[10px] ${error ? "text-red-500" : "text-primary"}`
                : `top-1/2 -translate-y-1/2 text-sm max-[319px]:text-[xs] text-slate-500 ${Icon ? "left-10" : "left-3.5"}`
            }`}
            // Unfloated, the label sits between the leading icon and the trailing chevron: cap its
            // width so a long label wraps instead of running under the chevron / required asterisk.
            style={floated ? undefined : { maxWidth: Icon ? "calc(100% - 5rem)" : "calc(100% - 3.5rem)" }}
          >
            {label}
            {required && <RequiredAsterisk className="ml-1" />}
          </label>
        )}
        {isTouch ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setOpen(true)}
              className={`flex !h-12 w-full items-center rounded-md border pr-8 pt-1 text-left text-[17px] ${Icon ? "pl-10" : "pl-3.5"} ${
                disabled
                  ? "cursor-not-allowed bg-slate-100 text-black disabled:opacity-100"
                  : `bg-white ${error ? "border-2 border-red-500" : open ? "border-2 border-primary" : value ? "border-2 border-emerald-500" : "border-slate-300"}`
              }`}
            >
              <span className="truncate relative bottom-0.75">{selected?.label ?? ""}</span>
            </button>
            <ChevronDown className={`pointer-events-none absolute right-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${disabled ? "text-slate-400" : "text-slate-500"}`} />
            {open && (
              <MobileSelectSheet
                options={options}
                value={value}
                onSelect={(next) => {
                  onValueChange?.(next);
                  setOpen(false);
                }}
                onClose={() => setOpen(false)}
              />
            )}
          </>
        ) : (
          <Select className="" value={value} onValueChange={onValueChange} onOpenChange={setOpen} disabled={disabled}>
            <SelectTrigger
              className={`!h-12 rounded-md w-full pt-1 text-[17px] ${Icon ? "pl-10" : "pl-3.5"} pr-3.5 ${
                disabled
                  ? "cursor-not-allowed bg-slate-100 text-black disabled:opacity-100"
                  : `bg-white ${error ? "border-2 border-red-500 focus:!border-red-500 focus-visible:!border-red-500" : open ? "border-2 border-primary" : value ? "border-2 border-emerald-500" : "border-slate-300"}`
              }`}
            >
              <SelectValue>{selected?.label ?? ""}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// On touch devices focusing the search box pops the on-screen keyboard, which covers the lower half of the
// screen: the list (and a field near the bottom such as City) ends up hidden behind it. So the box is only
// auto-focused where there is a real pointer + physical keyboard; on touch the user taps it when they
// actually want to type.
function canAutoFocusSearch() {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return !window.matchMedia("(pointer: coarse)").matches;
}

function SearchableFloatingLabelSelect({ icon: Icon, label, required = false, value, onValueChange, options, error, disabled = false, className }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isTouch = useIsTouch();
  const floated = open || Boolean(value);
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  function handleOpenChange(next) {
    if (disabled) return;
    setOpen(next);
    if (!next) setQuery("");
  }

  function handleSelect(optionValue) {
    onValueChange?.(optionValue);
    handleOpenChange(false);
  }

  return (
    <div className={className}>
      <div className="relative">
        {Icon && (
          <Icon className={`pointer-events-none absolute left-3.5 top-1/2 z-1 h-4 w-4 -translate-y-1/2 ${disabled ? "text-slate-400" : "text-slate-500"}`} />
        )}
        {label && (
          <label
            className={`pointer-events-none absolute z-1 max-w-[calc(100%-1.5rem)] overflow-hidden text-ellipsis bg-white px-1 transition-all ${
              floated
                ? `left-3 top-0 -translate-y-1/2 whitespace-nowrap text-xs max-[319px]:text-[10px] ${error ? "text-red-500" : "text-primary"}`
                // Unfocused + empty, an invalid field's label would otherwise sit
                // oversized and red right where the selected value goes — hidden
                // there, it fades in already floated the instant the field is
                // focused (opened) or gets a value.
                : `top-1/2 -translate-y-1/2 text-sm max-[319px]:text-xs ${error ? "text-red-500 opacity-0" : "text-slate-500"} ${Icon ? "left-10" : "left-3.5"}`
            }`}
            // Unfloated, the label sits between the leading icon and the trailing chevron: cap its
            // width so a long label wraps instead of running under the chevron / required asterisk.
            style={floated ? undefined : { maxWidth: Icon ? "calc(100% - 5rem)" : "calc(100% - 3.5rem)" }}
          >
            {label}
            {required && <RequiredAsterisk className="ml-1" />}
          </label>
        )}
        {isTouch ? (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleOpenChange(true)}
              className={`flex !h-12 w-full items-center rounded-md border pr-8 pt-1 text-left text-[17px] ${Icon ? "pl-10" : "pl-3.5"} ${
                disabled
                  ? "cursor-not-allowed bg-slate-100 text-black disabled:opacity-100"
                  : `bg-white ${error ? "border-2 border-red-500" : open ? "border-2 border-primary" : value ? "border-2 border-emerald-500" : "border-slate-300"}`
              }`}
            >
              <span className="truncate relative bottom-0.75">{selected?.label ?? ""}</span>
            </button>
            <ChevronDown className={`pointer-events-none absolute right-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${disabled ? "text-slate-400" : "text-slate-500"}`} />
            {open && <MobileSelectSheet searchable options={options} value={value} onSelect={handleSelect} onClose={() => handleOpenChange(false)} />}
          </>
        ) : (
          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger
              type="button"
              disabled={disabled}
              className={`flex !h-12 w-full items-center rounded-md border pr-8 pt-1 text-left text-[17px] ${Icon ? "pl-10" : "pl-3.5"} ${
                disabled
                  ? "cursor-not-allowed bg-slate-100 text-black disabled:opacity-100"
                  : `bg-white ${error ? "border-2 border-red-500 focus:!border-red-500 focus-visible:!border-red-500" : open ? "border-2 border-primary" : value ? "border-2 border-emerald-500" : "border-slate-300"}`
              }`}
            >
              <span className="truncate relative bottom-0.75">{selected?.label ?? ""}</span>
            </PopoverTrigger>
            <ChevronDown className={`pointer-events-none absolute right-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${disabled ? "text-slate-400" : "text-slate-500"}`} />
            <PopoverContent className="w-(--anchor-width) min-w-56 p-0" sideOffset={4}>
              <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  autoFocus={canAutoFocusSearch()}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                {filtered.length === 0 && <p className="px-2 py-3 text-center text-sm text-slate-400">No results</p>}
                {filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
