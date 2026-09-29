"use client";

import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

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
 */
export function FloatingLabelInput({
  icon: Icon,
  label,
  status,
  error,
  trailing,
  onChange,
  className = "",
  inputClassName = "",
  ...inputProps
}) {
  const hasError = status === "invalid" || Boolean(error);

  return (
    <div className={className}>
      <div className="relative">
        <Input
          placeholder=" "
          onChange={onChange}
          // Best-effort ONLY: resyncs React state a little sooner than the
          // FormData-on-submit fallback (AccountForm.jsx), so status icons
          // etc. can react before the user hits submit. The float itself
          // never depends on this — see the component doc comment above.
          onAnimationStart={(e) => {
            if (e.animationName === "onAutoFillStart") onChange?.({ target: e.target });
          }}
          className={`peer h-12 rounded-md bg-white  border pt-1 transition-colors ${Icon ? "pl-10" : "pl-3.5"} ${
            trailing ? "pr-10" : status ? "pr-10" : "pr-3.5"
          } ${
            hasError
              ? "border-2 border-red-500"
              : "border-slate-300 focus:border-2 focus:!border-slate-900"
          } focus-visible:ring-0 ${inputClassName}`}
          {...inputProps}
        />
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-1 h-4 w-4 -translate-y-1/2 text-slate-500" />
        )}
        {label && (
          <label
            className={`pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 bg-white px-1 text-sm transition-all peer-focus:top-0 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-xs peer-autofill:top-0 peer-autofill:text-xs peer-[:-internal-autofill-selected]:top-0 peer-[:-internal-autofill-selected]:text-xs ${
              Icon
                ? "left-10 peer-focus:left-3 peer-[&:not(:placeholder-shown)]:left-3 peer-autofill:left-3 peer-[:-internal-autofill-selected]:left-3"
                : "left-3.5 peer-focus:left-3 peer-[&:not(:placeholder-shown)]:left-3 peer-autofill:left-3 peer-[:-internal-autofill-selected]:left-3"
            } ${
              hasError
                ? "text-red-500"
                : "text-slate-500 peer-focus:text-primary peer-[&:not(:placeholder-shown)]:text-primary peer-autofill:text-primary peer-[:-internal-autofill-selected]:text-primary"
            }`}
          >
            {label}
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
