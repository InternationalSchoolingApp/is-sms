"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";

/**
 * The dropdown of the student dashboard modules (K–5 / Grade 6–8 / Grade 9–12): the shadcn/ui Select (never a native <select>)
 * dressed in the K–5 box - 50px tall, 14px radius, 3px border, the K–5 colours (they turn dark with night mode) - and an open
 * list that keeps the student's look, because the list is portalled out of the page (useK5ThemeProps puts the tokens, fonts and
 * the band's skin back on it).
 *
 * `options`: [{ value, label, disabled? }]. `value` is the chosen option's value ("" / null = nothing chosen: `placeholder` shows).
 * `onValueChange(next)` gets the value of the option that was picked.
 */
const TRIGGER =
  "motion-none !h-[50px] w-full cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3 font-k5-body text-base font-extrabold text-k5-ink hover:bg-k5-card disabled:cursor-default disabled:bg-k5-soft dark:bg-k5-card dark:hover:bg-k5-card";
const LIST_BOX = "rounded-[14px] border-[3px] border-k5-line bg-k5-card text-k5-ink shadow-k5-chunky ring-0";
const ROW = "min-h-10 rounded-[10px] py-2 font-k5-body text-base font-extrabold text-k5-ink focus:bg-k5-act focus:text-k5-acx";

function List({ options }) {
  const themeProps = useK5ThemeProps(LIST_BOX);
  return (
    <SelectContent {...themeProps}>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value} disabled={option.disabled} className={ROW}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  );
}

export function K5Select({ value, onValueChange, options, placeholder = "", disabled = false, "aria-label": ariaLabel, id }) {
  const selected = options.find((option) => option.value === value);
  return (
    <Select value={value || null} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={TRIGGER}>
        <SelectValue>{selected?.label ?? placeholder}</SelectValue>
      </SelectTrigger>
      <List options={options} />
    </Select>
  );
}
