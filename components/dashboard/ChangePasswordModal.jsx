"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, X, Check, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { changePassword } from "@/services/dashboardApi";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";

// The label of each rule is header.changePasswordModal.rules.<key>.
const RULES = [
  { key: "length", test: (v) => v.length >= 8 && v.length <= 20 },
  { key: "upper", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", test: (v) => /[a-z]/.test(v) },
  { key: "number", test: (v) => /[0-9]/.test(v) },
  { key: "special", test: (v) => /[!@#$%&*]/.test(v) },
];

function PasswordInput({ id, label, value, onChange, show, onToggle, autoComplete }) {
  const t = useTranslations("header.changePasswordModal");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-3 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0 text-slate-400 hover:text-slate-600"
          aria-label={show ? t("hidePassword") : t("showPassword")}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/**
 * forced: the dashboard's "you must change your password" prompt (legacy changed-password-request with
 * showChancle=No): no X and no closing by clicking outside, but the Cancel button is there (asked for later on);
 * it goes away once the password is changed or Cancel is pressed, and comes back on the next visit while the password is due.
 */
export function ChangePasswordModal({ onClose, forced = false }) {
  const { context } = useDashboardContext();
  const t = useTranslations("header.changePasswordModal");
  const tc = useTranslations("common");
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
      ? { status: "1", message: t("changedDemo") }
      : await changePassword({
          schoolUUID: context.schoolUUID,
          uniqueId: context.uniqueId,
          oldpassword: oldPw.trim(),
          newpassword: newPw.trim(),
          confirmpassword: confirmPw.trim(),
        });
    setBusy(false);
    if (!result) {
      toast.error(tc("status.somethingWentWrong"));
      return;
    }
    if (result.status === "3" || result.status === 3) {
      toast.error(t("sessionExpired"));
      onClose();
      return;
    }
    if (String(result.status) !== "1") {
      toast.error(result.message || t("failed"));
      return;
    }
    toast.success(result.message || t("changed"));
    onClose();
  };

  return (
    <div data-blocking-popup="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={forced ? undefined : onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between bg-primary px-5 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-5 w-5" />
            <h2 className="m-0 text-base font-bold">{t("title")}</h2>
          </div>
          {!forced && (
            <button type="button" onClick={onClose} aria-label={tc("actions.close")} className="cursor-pointer border-none bg-transparent p-0 text-white hover:text-white/80">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
          <PasswordInput id="cp-old" label={t("oldPassword")} value={oldPw} onChange={setOldPw} show={showOld} onToggle={() => setShowOld((v) => !v)} autoComplete="current-password" />
          <PasswordInput id="cp-new" label={t("newPassword")} value={newPw} onChange={setNewPw} show={showNew} onToggle={() => setShowNew((v) => !v)} autoComplete="new-password" />
          <PasswordInput id="cp-confirm" label={t("confirmPassword")} value={confirmPw} onChange={setConfirmPw} show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} autoComplete="new-password" />

          {/* Validation rules */}
          {newPw.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {ruleResults.map((r) => (
                  <li key={r.key} className={`flex items-center gap-2 text-xs font-medium ${r.pass ? "text-green-600" : "text-slate-500"}`}>
                    {r.pass ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {t(`rules.${r.key}`)}
                  </li>
                ))}
                <li className={`flex items-center gap-2 text-xs font-medium ${differentOk ? "text-green-600" : "text-red-500"}`}>
                  {differentOk ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {t("differentFromOld")}
                </li>
              </ul>
            </div>
          )}

          {confirmPw.length > 0 && !matchOk && (
            <p className="m-0 text-xs font-medium text-red-500">{t("mismatch")}</p>
          )}

          {/* Legacy changed-password form: Change (green) and Cancel (red), then the note about the SMS / LMS passwords. */}
          <div className="mt-1 flex justify-end gap-1.5">
            <button
              type="submit"
              disabled={!canSubmit}
              className="cursor-pointer rounded-[4px] border-none bg-green-700 px-3 py-1.5 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? t("changing") : t("change")}
            </button>
            <button type="button" onClick={onClose} className="cursor-pointer rounded-[4px] border-none bg-[#dc2f54] px-3 py-1.5 text-sm font-bold text-white">
              {tc("actions.cancel")}
            </button>
          </div>
          <p className="m-0 text-center text-sm leading-snug text-slate-900">
            {t.rich("note", { b: (chunks) => <b>{chunks}</b> })}
          </p>
        </form>
      </div>
    </div>
  );
}
