"use client";

import { Check, X } from "lucide-react";
import { getPasswordStrength } from "@/utils/studentSignupValidation";

const RULES = [
  { key: "case", label: "1 UPPER and lower case letter (A-Z, a-z)" },
  { key: "digitAndSpecial", label: "1 number and 1 special character (! @ # $ % & *)" },
  { key: "length", label: "Minimum 8 to 20 characters" },
  { key: "noSequence", label: "No back-to-back patterns (123, abc, zyx)" },
];

/** Live checklist mirroring the existing app's password-suggestion popup (jquery.commonFunction.js). */
export function PasswordStrengthChecklist({ password, confirmPassword, showConfirmRule = false }) {
  const strength = getPasswordStrength(password, confirmPassword);
  // Nothing typed yet: every rule stays gray until the first keystroke, then it turns green / red.
  const untouched = !password;

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
      <p className="mb-2 font-semibold text-slate-700">Password must include at least:</p>
      <ul className="space-y-1">
        {RULES.map((rule) => (
          <RuleRow key={rule.key} passed={strength[rule.key]} untouched={untouched} label={rule.label} />
        ))}
        {showConfirmRule && (
          <RuleRow passed={strength.matchesConfirm} label="Password and confirm password should be same" />
        )}
      </ul>
    </div>
  );
}

function RuleRow({ passed, label, untouched = false }) {
  if (untouched) {
    return (
      <li className="flex items-center gap-2">
        <Check className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-slate-500">{label}</span>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2">
      {passed ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : (
        <X className="h-3.5 w-3.5 shrink-0 text-red-500" />
      )}
      <span className={passed ? "text-emerald-900" : "text-red-600"}>{label}</span>
    </li>
  );
}
