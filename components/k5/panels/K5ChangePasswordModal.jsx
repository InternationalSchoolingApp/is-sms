"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, X, Check, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { changePassword } from "@/services/dashboardApi";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";

const RULES = [
  { key: "length", label: "8–20 characters", test: (v) => v.length >= 8 && v.length <= 20 },
  { key: "upper", label: "At least 1 uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "At least 1 lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "number", label: "At least 1 number", test: (v) => /[0-9]/.test(v) },
  { key: "special", label: "At least 1 special character (! @ # $ % & *)", test: (v) => /[!@#$%&*]/.test(v) },
];

function K5PasswordInput({ id, label, value, onChange, show, onToggle, autoComplete }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-k5-display text-sm font-semibold text-k5-ink">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-2xl border-[3px] border-k5-line bg-white py-2.5 pl-3 pr-10 font-k5-display text-sm font-bold text-k5-ink outline-none transition-colors focus:border-k5-ac"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0 text-k5-mut hover:text-k5-ink"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function K5ChangePasswordModal({ onClose }) {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const ruleResults = RULES.map((r) => ({ ...r, pass: r.test(newPw) }));
  const allRulesPass = ruleResults.every((r) => r.pass);
  const matchOk = newPw === confirmPw && confirmPw.length > 0;
  const differentOk = newPw !== oldPw || newPw.length === 0;
  const canSubmit = oldPw.trim().length > 0 && allRulesPass && matchOk && differentOk && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    const result = dummy.enabled
      ? { status: "1", message: "Password changed successfully" }
      : await changePassword({
          schoolUUID: context.schoolUUID,
          uniqueId: context.uniqueId,
          oldpassword: oldPw.trim(),
          newpassword: newPw.trim(),
          confirmpassword: confirmPw.trim(),
        });
    setBusy(false);
    if (!result) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    if (result.status === "3" || result.status === 3) {
      toast.error("Session expired. Please log in again.");
      onClose();
      return;
    }
    if (String(result.status) !== "1") {
      toast.error(result.message || "Failed to change password.");
      return;
    }
    toast.success(result.message || "Password changed successfully!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-[26px] border-[3px] border-k5-ink bg-k5-card shadow-[0_6px_0_var(--k5-ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-k5-ac px-5 py-3.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/20">
            <KeyRound className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <h2 className="m-0 min-w-0 flex-1 font-k5-display text-lg font-semibold text-white">Change Password</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-xl border-none bg-k5-red text-white shadow-[0_3px_0_#B91C1C]"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          <K5PasswordInput id="k5-cp-old" label="Old Password" value={oldPw} onChange={setOldPw} show={showOld} onToggle={() => setShowOld((v) => !v)} autoComplete="current-password" />
          <K5PasswordInput id="k5-cp-new" label="New Password" value={newPw} onChange={setNewPw} show={showNew} onToggle={() => setShowNew((v) => !v)} autoComplete="new-password" />
          <K5PasswordInput id="k5-cp-confirm" label="Confirm Password" value={confirmPw} onChange={setConfirmPw} show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} autoComplete="new-password" />

          {/* Validation rules */}
          {newPw.length > 0 && (
            <div className="rounded-2xl border-[3px] border-k5-line bg-k5-act px-4 py-3">
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {ruleResults.map((r) => (
                  <li key={r.key} className={`flex items-center gap-2 font-k5-display text-xs font-bold ${r.pass ? "text-k5-green" : "text-k5-mut"}`}>
                    {r.pass ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {r.label}
                  </li>
                ))}
                <li className={`flex items-center gap-2 font-k5-display text-xs font-bold ${differentOk ? "text-k5-green" : "text-k5-red"}`}>
                  {differentOk ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  Different from old password
                </li>
              </ul>
            </div>
          )}

          {confirmPw.length > 0 && !matchOk && (
            <p className="m-0 font-k5-display text-xs font-bold text-k5-red">Passwords do not match.</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-1 w-full cursor-pointer rounded-full border-none bg-k5-ac py-3 font-k5-display text-[15px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Changing…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
