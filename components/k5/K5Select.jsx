"use client";

import { useState } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";

/**
 * The dropdown of the student dashboard modules (K–5 / Grade 6–8 / Grade 9–12): the shadcn/ui Select (never a native <select>)
 * dressed in the K–5 box - 50px tall, 14px radius, 3px border, the K–5 colours (they turn dark with night mode) - and an open
 * list that keeps the student's look, because the list is portalled out of the page (useK5ThemeProps puts the tokens, fonts and
 * the band's skin back on it). Inside a native <dialog> (showModal) the list is rendered in that dialog, or it would sit behind it.
 *
 * `options`: [{ value, label, disabled? }] or a group { groupLabel, options: [...] } (like <optgroup>). `value` is the chosen
 * option's value ("" / null = nothing chosen: `placeholder` shows). `onValueChange(next)` gets the value of the option picked.
 * `variant="inline"`: a small borderless trigger for inside a field (e.g. the Templates picker of a subject line); its list is wider.
 */
const TRIGGER =
  "motion-none !h-[50px] w-full cursor-pointer rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3 font-k5-body text-base font-extrabold text-k5-ink hover:bg-k5-card disabled:cursor-default disabled:bg-k5-soft dark:bg-k5-card dark:hover:bg-k5-card";
const INLINE_TRIGGER =
  "motion-none !h-8 w-auto max-w-[150px] flex-none cursor-pointer rounded-none border-0 border-l-[3px] border-k5-line bg-transparent px-2 font-k5-body text-sm font-black text-k5-ink hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent";
const LIST_BOX = "rounded-[14px] border-[3px] border-k5-line bg-k5-card text-k5-ink shadow-k5-chunky ring-0";
const ROW = "min-h-10 rounded-[10px] py-2 font-k5-body text-base font-extrabold text-k5-ink focus:bg-k5-act focus:text-k5-acx";

function Rows({ options }) {
  return options.map((option) =>
    option.options ? (
      <SelectGroup key={option.groupLabel}>
        <SelectLabel className="px-2 py-1.5 font-k5-body text-xs font-black text-k5-mut">{option.groupLabel}</SelectLabel>
        <Rows options={option.options} />
      </SelectGroup>
    ) : (
      <SelectItem key={option.value} value={option.value} disabled={option.disabled} className={ROW}>
        {option.label}
      </SelectItem>
    ),
  );
}

function List({ options, container, wide }) {
  const themeProps = useK5ThemeProps(`${LIST_BOX} ${wide ? "min-w-[260px] max-w-[min(360px,90vw)]" : ""}`);
  return (
    <SelectContent {...themeProps} container={container}>
      <Rows options={options} />
    </SelectContent>
  );
}

const flat = (options) => options.flatMap((option) => (option.options ? flat(option.options) : [option]));

export function K5Select({ value, onValueChange, options, placeholder = "", disabled = false, variant = "box", "aria-label": ariaLabel, id }) {
  // The <dialog> the field sits in, if any (set when the trigger mounts).
  const [container, setContainer] = useState(null);
  const selected = flat(options).find((option) => option.value === value);
  return (
    <Select value={value || null} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger ref={(el) => setContainer(el?.closest("dialog") ?? null)} id={id} aria-label={ariaLabel} className={variant === "inline" ? INLINE_TRIGGER : TRIGGER}>
        <SelectValue>{selected?.label ?? placeholder}</SelectValue>
      </SelectTrigger>
      <List options={options} container={container} wide={variant === "inline"} />
    </Select>
  );
}
