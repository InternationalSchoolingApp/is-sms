"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/**
 * Calendar+Popover DOB picker, same visual language as
 * FloatingLabelInput/FloatingLabelSelect (floated label, thin border when
 * empty, dark border-2 when open). No such composition existed yet in
 * components/ui — built from the existing calendar.jsx/popover.jsx
 * primitives, no new shadcn install needed.
 *
 * `height` is the trigger's Tailwind height class (e.g. "h-10"); defaults to "h-12".
 * Optional: `disabledDates` (extra react-day-picker matchers, e.g. blackout Date[]) on top of the from/to range,
 * and `defaultMonth` (month shown when nothing is picked; defaults to `toDate`, as before).
 * Optional `placeholder`: grey text in the trigger while nothing is picked (for pickers without a floating `label`).
 */
export function DatePicker({ icon: Icon, label, value, onChange, fromDate, toDate, error, disabled = false, height = "h-12", autoOpen = false, disabledDates, defaultMonth, placeholder }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (autoOpen) setOpen(true); }, [autoOpen]);
  const floated = open || Boolean(value);

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          disabled={disabled}
          className={`relative flex ${height} w-full items-center rounded-md border ${disabled ? "cursor-not-allowed bg-slate-100 text-black" : "bg-white"} ${height ? "pb-1.5" : ""} ${Icon ? "pl-10" : "pl-3.5"} pr-3.5 pt-1  text-left text-[17px] ${
            error ? "border-2 border-red-500" : open ? "border-2 border-primary" : value && !disabled ? "border-2 border-emerald-500" : "border-slate-300"
          }`}
        >
          {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-1 h-4 w-4 -translate-y-1/2 text-slate-500" />}
          {label && (
            <span
              className={`pointer-events-none absolute z-1 bg-white px-1 transition-all ${
                floated
                  ? `left-3 top-0 -translate-y-1/2 text-xs max-[319px]:text-[10px] ${error ? "text-red-500" : "text-primary"}`
                  // Unfocused + empty, an invalid field's label would otherwise sit
                  // oversized and red right where the picker trigger text goes — hidden
                  // there, it fades in already floated the instant the field is focused.
                  : `top-1/2 -translate-y-1/2 text-sm max-[319px]:text-xs ${error ? "text-red-500 opacity-0" : "text-slate-500"} ${Icon ? "left-10" : "left-3.5"}`
              }`}
            >
              {label}
            </span>
          )}
          <span className="mt-0">
            {value ? value.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : placeholder && !label ? <span className="text-slate-400">{placeholder}</span> : ""}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange?.(date);
              setOpen(false);
            }}
            captionLayout="dropdown"
            startMonth={fromDate}
            endMonth={toDate}
            disabled={disabledDates ? [{ before: fromDate, after: toDate }, ...[].concat(disabledDates)] : { before: fromDate, after: toDate }}
            defaultMonth={value || defaultMonth || toDate}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
