"use client";

import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RequiredAsterisk } from "@/components/common/RequiredAsterisk";

/**
 * Reusable floating-label input.
 *
 * IMPORTANT: the floated/not-floated visual state is driven ENTIRELY by
 * CSS (`:focus` and `:not(:placeholder-shown)` on the input itself, read
 * via `peer-*` on the label) — NOT by React state. An earlier version
 * tracked `focused`/`value` in JS and only floated when React's onChange
 * had fired, which broke on real mobile devices: browser/WebView autofill
 * sets the native input value without firing a normal input event, so the
 * JS state (and therefore the float) never updated even though the field
 * visibly had text. `:placeholder-shown` is evaluated by the browser
 * directly against the live DOM value, so it is correct regardless of
 * whether the value was typed, pasted, or autofilled — this is why it
 * requires `placeholder=" "` (a non-empty placeholder) below, which is
 * what makes `:placeholder-shown` toggle off the instant there's any value.
 *
 * Because of this, do NOT reintroduce a JS-tracked `floated` state here —
 * if a future change needs to know "is this field floated", derive it from
 * the same CSS, don't rebuild the old event-based version.
 *
 * `k5`: the K–5 / Grade 6–8 / Grade 9–12 My Profile look (50px box, 14px radius, 3px border, K5 colours that turn dark with
 * night mode, accent border and label while focused). `multiline`: a textarea instead of a one-line input (its label sits at
 * the first line and floats the same way). `required`: a red asterisk after the label.
 */
export function FloatingLabelInput({
  icon: Icon,
  label,
  filledLabel,
  status,
  error,
  trailing,
  onChange,
  className = "",
  inputClassName = "",
  k5 = false,
  multiline = false,
  required = false,
  ...inputProps
}) {
  const hasError = status === "invalid" || Boolean(error);
  const Field = multiline ? "textarea" : Input;
  const k5Field = cn(
    "peer w-full min-w-0 rounded-[14px] border-[3px] bg-k5-card px-3.5 font-k5-body text-base font-extrabold text-k5-ink outline-none transition-colors focus-visible:ring-0 read-only:bg-k5-soft dark:bg-k5-card dark:read-only:bg-k5-soft",
    multiline ? "min-h-[110px] resize-y pb-3 pt-5 leading-[1.45]" : "!h-[50px] pt-1",
    hasError ? "border-k5-ri focus:!border-k5-ri" : "border-k5-line focus:!border-k5-ac",
    inputClassName
  );
  const k5Label =
    "bg-k5-card font-k5-body text-base font-black !text-k5-mut peer-focus:!text-xs peer-focus:!text-k5-ac peer-[&:not(:placeholder-shown)]:!text-xs peer-[&:not(:placeholder-shown)]:!text-k5-ac";

  return (
    <div className={className}>
      <div className="relative">
        <Field
          placeholder=" "
          onChange={onChange}
          // Best-effort ONLY: resyncs React state a little sooner than the
          // FormData-on-submit fallback (AccountForm.jsx), so status icons
          // etc. can react before the user hits submit. The float itself
          // never depends on this — see the component doc comment above.
          onAnimationStart={(e) => {
            if (e.animationName === "onAutoFillStart") onChange?.({ target: e.target });
          }}
          className={
            k5
              ? k5Field
              : `peer h-12 rounded-md bg-white border pt-1 text-[17px] transition-colors ${Icon ? "pl-10" : "pl-3.5"} ${
                  trailing ? "pr-10" : status ? "pr-10" : "pr-3.5"
                } ${
                  hasError
                    ? "border-2 border-red-500 focus:!border-red-500 focus-visible:!border-red-500"
                    : "border-slate-300 focus:border-2 focus:!border-primary [&:not(:placeholder-shown):not(:focus):not(:disabled)]:border-2 [&:not(:placeholder-shown):not(:focus):not(:disabled)]:border-emerald-500"
                } focus-visible:ring-0 ${inputClassName}`
          }
          {...inputProps}
        />
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-1 h-4 w-4 -translate-y-1/2 text-slate-500" />
        )}
        {label && (
          <label
            className={cn(`${filledLabel ? "[&>.lf]:hidden peer-[&:not(:placeholder-shown)]:[&>.le]:hidden peer-[&:not(:placeholder-shown)]:[&>.lf]:inline peer-autofill:[&>.le]:hidden peer-autofill:[&>.lf]:inline " : ""}pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 bg-white px-1 text-sm max-[319px]:text-xs transition-all peer-focus:top-0 peer-focus:text-xs max-[319px]:peer-focus:!text-[10px] peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-xs max-[319px]:peer-[&:not(:placeholder-shown)]:!text-[10px] peer-autofill:top-0 peer-autofill:text-xs max-[319px]:peer-autofill:!text-[10px] peer-[:-internal-autofill-selected]:top-0 peer-[:-internal-autofill-selected]:text-xs max-[319px]:peer-[:-internal-autofill-selected]:!text-[10px] ${
              Icon
                ? "left-10 peer-focus:left-3 peer-[&:not(:placeholder-shown)]:left-3 peer-autofill:left-3 peer-[:-internal-autofill-selected]:left-3"
                : "left-3.5 peer-focus:left-3 peer-[&:not(:placeholder-shown)]:left-3 peer-autofill:left-3 peer-[:-internal-autofill-selected]:left-3"
            } ${
              hasError
                // Unfocused + empty, an invalid field's label would otherwise sit
                // oversized and red right where the caret goes — hidden there, it
                // fades in already floated the instant the field is focused (or
                // gets a value), instead of ever being shown inline.
                ? "text-red-500 opacity-0 peer-focus:opacity-100 peer-[&:not(:placeholder-shown)]:opacity-100 peer-autofill:opacity-100 peer-[:-internal-autofill-selected]:opacity-100"
                : "text-slate-500 peer-focus:text-primary peer-[&:not(:placeholder-shown)]:text-primary peer-autofill:text-primary peer-[:-internal-autofill-selected]:text-primary"
            }`, k5 && k5Label, k5 && multiline && "top-[27px]")}
          >
            {filledLabel ? (
              <>
                <span className="le">{label}</span>
                <span className="lf">{filledLabel}</span>
              </>
            ) : (
              label
            )}
            {required && <RequiredAsterisk className="ml-1" />}
          </label>
        )}
        {trailing}
        {!trailing && status && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {status === "valid" ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
          </span>
        )}
      </div>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
