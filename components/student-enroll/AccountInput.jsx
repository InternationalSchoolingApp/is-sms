"use client";

import { RequiredAsterisk } from "@/components/common/RequiredAsterisk";

/**
 * Presentational input for the Account Creation card.
 *
 * Floating label: the floated/not-floated state is driven ENTIRELY by CSS
 * (`:focus` and `:not(:placeholder-shown)` on the input, read via `peer-*`
 * on the label) — NOT React state — for the exact reason documented in
 * `components/ui/floating-label-input.jsx`: browser/WebView autofill sets
 * the native value without firing an input event, so a JS-tracked float
 * would break on autofill. This requires `placeholder=" "` (a single
 * space) so `:placeholder-shown` toggles off the moment there's any value.
 *
 * Icons use the same outline Lucide style as the student-details fields.
 *
 * This stays separate from the shared `FloatingLabelInput` (used by Stage
 * 1–4, offline B2B, the DOB picker) so the account card can be tuned
 * without touching the project-wide field styling.
 */
export function AccountInput({
  icon: Icon,
  label,
  filledLabel,
  required = false,
  trailing,
  error,
  status,
  className = "",
  inputClassName = "",
  onChange,
  ...inputProps
}) {
  const hasError = Boolean(error);
  const isValid = !hasError && status === "valid";

  return (
    <div className={className}>
      <div className="relative">
        <input
          placeholder=" "
          onChange={onChange}
          onAnimationStart={(e) => {
            if (e.animationName === "onAutoFillStart") onChange?.({ target: e.target });
          }}
          className={`peer h-[52px] w-full rounded-xl border bg-white text-[15px] text-slate-800 outline-none transition-colors ${
            Icon ? "pl-11" : "pl-4"
          } ${trailing ? "pr-11" : "pr-4"} ${
            hasError
              ? "border-red-400 focus:border-red-500"
              : isValid
                ? "border-emerald-500 focus:border-emerald-500 border-2"
                : "border-slate-200 hover:border-slate-300 focus:border-2 focus:border-primary"
          } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:opacity-80 ${inputClassName}`}
          {...inputProps}
        />

        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
        )}

        {label && (
          <label
            className={`${filledLabel ? "[&>.lf]:hidden peer-[&:not(:placeholder-shown)]:[&>.le]:hidden peer-[&:not(:placeholder-shown)]:[&>.lf]:inline peer-autofill:[&>.le]:hidden peer-autofill:[&>.lf]:inline " : ""}pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 bg-white px-1 text-[15px] transition-all peer-focus:top-0 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-xs peer-autofill:top-0 peer-autofill:text-xs peer-[:-internal-autofill-selected]:top-0 peer-[:-internal-autofill-selected]:text-xs ${
              Icon
                ? "left-11 peer-focus:left-3 peer-[&:not(:placeholder-shown)]:left-3 peer-autofill:left-3 peer-[:-internal-autofill-selected]:left-3"
                : "left-4 peer-focus:left-3 peer-[&:not(:placeholder-shown)]:left-3 peer-autofill:left-3 peer-[:-internal-autofill-selected]:left-3"
            } ${
              hasError
                ? "text-red-500"
                : isValid
                  ? "text-emerald-600 peer-focus:font-semibold"
                  : "text-slate-400 peer-focus:font-semibold peer-focus:text-primary peer-[&:not(:placeholder-shown)]:text-primary peer-autofill:text-primary peer-[:-internal-autofill-selected]:text-primary"
            }`}
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
      </div>
      {error && <p className="mt-1 pl-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
