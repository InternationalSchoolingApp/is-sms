"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

function PlainFloatingLabelSelect({ icon: Icon, label, value, onValueChange, options, error, disabled = false, className = "" }) {
  const [open, setOpen] = useState(false);
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
            className={`pointer-events-none absolute z-10 bg-white px-1 transition-all ${
              floated
                ? `left-3 top-0 -translate-y-1/2 text-xs max-[319px]:text-[10px] ${error ? "text-red-500" : "text-primary"}`
                : `top-1/2 -translate-y-1/2 text-sm max-[319px]:text-xs text-slate-500 ${Icon ? "left-10" : "left-3.5"}`
            }`}
          >
            {label}
          </label>
        )}
        <Select className="" value={value} onValueChange={onValueChange} onOpenChange={setOpen} disabled={disabled}>
          <SelectTrigger
            className={`!h-12 rounded-md w-full pt-1 ${Icon ? "pl-10" : "pl-3.5"} pr-3.5 ${
              disabled
                ? "cursor-not-allowed bg-slate-100 text-black disabled:opacity-100"
                : `bg-white ${error ? "border-2 border-red-500" : open ? "border-2 border-slate-900" : "border-slate-300"}`
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
      </div>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SearchableFloatingLabelSelect({ icon: Icon, label, value, onValueChange, options, error, disabled = false, className }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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
            className={`pointer-events-none absolute z-1 bg-white px-1 transition-all ${
              floated
                ? `left-3 top-0 -translate-y-1/2 text-xs max-[319px]:text-[10px] ${error ? "text-red-500" : "text-primary"}`
                : `top-1/2 -translate-y-1/2 text-sm max-[319px]:text-xs ${error ? "text-red-500" : "text-slate-500"} ${Icon ? "left-10" : "left-3.5"}`
            }`}
          >
            {label}
          </label>
        )}
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            type="button"
            disabled={disabled}
            className={`flex !h-12 w-full items-center rounded-md border pr-8 pt-1 text-left text-sm ${Icon ? "pl-10" : "pl-3.5"} ${
              disabled
                ? "cursor-not-allowed bg-slate-100 text-black disabled:opacity-100"
                : `bg-white ${error ? "border-2 border-red-500" : open ? "border-2 border-slate-900" : "border-slate-300"}`
            }`}
          >
            <span className="truncate">{selected?.label ?? ""}</span>
          </PopoverTrigger>
          <ChevronDown className={`pointer-events-none absolute right-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 ${disabled ? "text-slate-400" : "text-slate-500"}`} />
          <PopoverContent className="w-(--anchor-width) min-w-56 p-0" sideOffset={4}>
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                autoFocus
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
      </div>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
