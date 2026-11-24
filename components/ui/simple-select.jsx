"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * A plain dropdown of the standard (non-K5) look: the shadcn/ui Select (never a native <select>) with a 40px field box like the
 * other form fields of the page. `options`: [{ value, label, disabled? }]; `value` "" / null shows `placeholder`; `onValueChange`
 * gets the picked option's value. Options need a non-empty `value` (map an "any" choice to a word like "ANY" at the call site).
 * The student dashboard looks use components/k5/K5Select.jsx instead.
 */
const TRIGGER = "!h-10 w-full cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 text-sm text-black hover:bg-white focus-visible:border-primary disabled:cursor-default disabled:opacity-60";

export function SimpleSelect({ value, onValueChange, options, placeholder = "", disabled = false, "aria-label": ariaLabel, id, className = "" }) {
  const selected = options.find((option) => option.value === value);
  return (
    <Select value={value || null} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={`${TRIGGER} ${className}`}>
        <SelectValue>{selected?.label ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
