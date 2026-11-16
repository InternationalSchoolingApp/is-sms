"use client";

/**
 * Floating-label textarea, the multi-line sibling of FloatingLabelInput (same CSS-only float: `:focus` and
 * `:not(:placeholder-shown)` via `peer-*`, never React state, so autofill and paste float the label correctly; it
 * therefore needs `placeholder=" "`). `counter` ("12/200") is shown under the field when given.
 */
export function FloatingLabelTextarea({ label, error, counter, className = "", textareaClassName = "", rows = 3, ...textareaProps }) {
  const hasError = Boolean(error);

  return (
    <div className={className}>
      <div className="relative">
        <textarea
          placeholder=" "
          rows={rows}
          className={`peer block w-full resize-none rounded-md border bg-white px-3.5 pt-4 pb-2 text-[17px] text-black outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-100 ${
            hasError
              ? "border-2 border-red-500 focus:!border-red-500"
              : "border-slate-300 focus:border-2 focus:!border-primary [&:not(:placeholder-shown):not(:focus):not(:disabled)]:border-2 [&:not(:placeholder-shown):not(:focus):not(:disabled)]:border-emerald-500"
          } ${textareaClassName}`}
          {...textareaProps}
        />
        {label && (
          <label
            className={`pointer-events-none absolute left-3.5 top-5 z-0 -translate-y-1/2 bg-white px-1 text-sm transition-all peer-focus:left-3 peer-focus:top-0 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:left-3 peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-xs ${
              hasError
                ? "text-red-500 opacity-0 peer-focus:opacity-100 peer-[&:not(:placeholder-shown)]:opacity-100"
                : "text-slate-500 peer-focus:text-primary peer-[&:not(:placeholder-shown)]:text-primary"
            }`}
          >
            {label}
          </label>
        )}
      </div>
      <div className="mt-1 flex justify-between gap-2 px-2 text-xs">
        <p className="text-red-600">{error || ""}</p>
        {counter && <p className="shrink-0 text-slate-500">{counter}</p>}
      </div>
    </div>
  );
}
