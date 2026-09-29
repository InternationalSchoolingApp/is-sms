"use client";

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
 * Icons are rendered filled/solid (see the icons passed from AccountForm)
 * in near-black, matching the signup-new design.
 *
 * This stays separate from the shared `FloatingLabelInput` (used by Stage
 * 1–4, offline B2B, the DOB picker) so the account card can be tuned
 * without touching the project-wide field styling.
 */
export function AccountInput({
  icon: Icon,
  label,
  trailing,
  error,
  className = "",
  inputClassName = "",
  onChange,
  ...inputProps
}) {
  const hasError = Boolean(error);

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
              : "border-slate-200 hover:border-slate-300 focus:border-2 focus:border-primary"
          } ${inputClassName}`}
          {...inputProps}
        />

        {Icon && (
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 fill-slate-900 text-slate-900"
          />
        )}

        {label && (
          <label
            className={`pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 bg-white px-1 text-[15px] transition-all peer-focus:top-0 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-xs peer-autofill:top-0 peer-autofill:text-xs peer-[:-internal-autofill-selected]:top-0 peer-[:-internal-autofill-selected]:text-xs ${
              Icon
                ? "left-11 peer-focus:left-3 peer-[&:not(:placeholder-shown)]:left-3 peer-autofill:left-3 peer-[:-internal-autofill-selected]:left-3"
                : "left-4 peer-focus:left-3 peer-[&:not(:placeholder-shown)]:left-3 peer-autofill:left-3 peer-[:-internal-autofill-selected]:left-3"
            } ${
              hasError
                ? "text-red-500"
                : "text-slate-400 peer-focus:font-semibold peer-focus:text-primary peer-[&:not(:placeholder-shown)]:text-primary peer-autofill:text-primary peer-[:-internal-autofill-selected]:text-primary"
            }`}
          >
            {label}
          </label>
        )}

        {trailing}
      </div>
      {error && <p className="mt-1 pl-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
