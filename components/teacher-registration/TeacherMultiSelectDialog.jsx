"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * A multi-select picker in a dialog, for the teacher registration's "Grades you have taught" and "Courses you have
 * taught" (the latter has one tab per school level). Selecting works on a draft: "Apply" commits it, closing the dialog
 * any other way throws it away.
 *
 *   bands: [{ key, label, options: [{ value, label }] }]   (one band = no tabs)
 *   value: { [bandKey]: [selected option values] }
 *   onApply(nextValue)
 *
 * A saved value that is no longer in a band's options (a course renamed or retired since) is kept and shown as a chip,
 * so applying never silently drops what the teacher chose earlier; it can still be removed with its chip.
 */
export function TeacherMultiSelectDialog({ open, onOpenChange, title, description, bands, value, onApply }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        {/* mounted only while open, so every opening starts from the committed value */}
        {open && (
          <PickerBody
            title={title}
            description={description}
            bands={bands}
            value={value}
            onCancel={() => onOpenChange(false)}
            onApply={(next) => {
              onApply(next);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickerBody({ title, description, bands, value, onCancel, onApply }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(bands.map((band) => [band.key, [...(value?.[band.key] || [])]])));
  const [activeKey, setActiveKey] = useState(bands[0].key);
  const [query, setQuery] = useState("");
  const activeBand = bands.find((band) => band.key === activeKey) || bands[0];

  // Short labels ("KG", "Grade 12") read best as a grid of pills; long ones (course titles) as a list.
  const compact = activeBand.options.length > 0 && activeBand.options.every((option) => option.label.length <= 14);

  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? activeBand.options.filter((option) => option.label.toLowerCase().includes(needle)) : activeBand.options;
  }, [activeBand, query]);

  const labelByValue = useMemo(() => {
    const map = new Map();
    bands.forEach((band) => band.options.forEach((option) => map.set(`${band.key}:${option.value}`, option.label)));
    return map;
  }, [bands]);

  function toggle(bandKey, optionValue) {
    setDraft((prev) => {
      const current = prev[bandKey] || [];
      return {
        ...prev,
        [bandKey]: current.includes(optionValue) ? current.filter((v) => v !== optionValue) : [...current, optionValue],
      };
    });
  }

  const chips = bands.flatMap((band) =>
    (draft[band.key] || []).map((optionValue) => ({
      bandKey: band.key,
      value: optionValue,
      label: labelByValue.get(`${band.key}:${optionValue}`) || optionValue,
    }))
  );

  return (
    <>
      <DialogHeader className="shrink-0">
        <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>

      {bands.length > 1 && (
        <Tabs
          className="shrink-0"
          value={activeKey}
          onValueChange={(next) => {
            setActiveKey(next);
            setQuery("");
          }}
        >
          <TabsList>
            {bands.map((band) => (
              <TabsTrigger key={band.key} value={band.key}>
                {band.label}
                {(draft[band.key]?.length || 0) > 0 && <span className="ml-1 text-xs">({draft[band.key].length})</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {!compact && activeBand.options.length > 8 && (
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-9 pl-9" aria-label="Search" />
        </div>
      )}

      {/* Only this list scrolls, and only when it is longer than the room there is. Short labels (grades) are laid out
          as a grid of pills instead, so a whole band is visible at once. */}
      <div className={`flex-1 overflow-y-auto rounded-md border border-slate-200 p-2 ${compact ? "min-h-0" : "min-h-32"}`}>
        {visibleOptions.length === 0 ? (
          <p className="p-3 text-center text-sm text-slate-500">Nothing to choose here.</p>
        ) : compact ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {visibleOptions.map((option) => {
              const checked = (draft[activeBand.key] || []).includes(option.value);
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    checked ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-black hover:bg-slate-50"
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(activeBand.key, option.value)} />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        ) : (
          visibleOptions.map((option) => {
            const checked = (draft[activeBand.key] || []).includes(option.value);
            return (
              <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-sm text-black hover:bg-slate-50">
                <Checkbox checked={checked} onCheckedChange={() => toggle(activeBand.key, option.value)} className="mt-0.5" />
                <span>{option.label}</span>
              </label>
            );
          })
        )}
      </div>

      {chips.length > 0 && (
        <div className="shrink-0 rounded-md bg-slate-50 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Selected ({chips.length})</span>
            <button
              type="button"
              onClick={() => setDraft(Object.fromEntries(bands.map((band) => [band.key, []])))}
              className="cursor-pointer text-xs font-semibold text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
          {/* scrolls only when the selection really is long (a teacher picking dozens of courses) */}
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {chips.map((chip) => (
              <span
                key={`${chip.bandKey}:${chip.value}`}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-1 pl-2.5 text-xs font-semibold text-primary"
              >
                <span className="truncate">{chip.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${chip.label}`}
                  onClick={() => toggle(chip.bandKey, chip.value)}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="shrink-0">
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button type="button" onClick={() => onApply(draft)} className="cursor-pointer">
          Apply
        </Button>
      </DialogFooter>
    </>
  );
}
