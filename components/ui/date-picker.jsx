"use client";

import { useState } from "react";
// import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

/**
 * Calendar+Popover DOB picker, same visual language as
 * FloatingLabelInput/FloatingLabelSelect (floated label, thin border when
 * empty, dark border-2 when open). No such composition existed yet in
 * components/ui — built from the existing calendar.jsx/popover.jsx
 * primitives, no new shadcn install needed.
 */
export function DatePicker({ label, value, onChange, fromDate, toDate, error }) {
  const [open, setOpen] = useState(false);
  const floated = open || Boolean(value);

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={`relative flex h-12 w-full items-center rounded-md border bg-white pl-3.5 pr-3.5 pt-1 text-left text-sm ${
            error ? "border-2 border-red-500" : open ? "border-2 border-slate-900" : "border-slate-300"
          }`}
        >
          {/* <CalendarIcon className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" /> */}
          {label && (
            <span
              className={`pointer-events-none absolute z-1 bg-white px-1 transition-all ${
                floated
                  ? `left-3 top-0 -translate-y-1/2 text-xs ${error ? "text-red-500" : "text-primary"}`
                  : `left-3.5 top-1/2 -translate-y-1/2 text-sm ${error ? "text-red-500" : "text-slate-500"}`
              }`}
            >
              {label}
            </span>
          )}
          <span className="mt-0">{value ? value.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}</span>
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
            disabled={{ before: fromDate, after: toDate }}
            defaultMonth={value || toDate}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
