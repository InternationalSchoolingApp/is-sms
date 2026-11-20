"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { LOCALES, LOCALE_NAMES, normalizeLocale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/actions";
import { saveLanguagePreference } from "@/services/languagePreferenceApi";

const VARIANTS = {
  // Dashboard top bar (DashboardTopHeader): same look as its other header buttons.
  default: {
    button: "flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-black hover:bg-slate-100",
    menu: "rounded-xl border border-slate-200 bg-white shadow-lg",
    item: "text-sm font-semibold text-black hover:bg-slate-100",
    active: "bg-slate-50 text-primary",
  },
  // Grade K–5 header (K5Header): rounded chip in the K5 theme colours.
  k5: {
    button: "k5h-hdbtn flex min-h-12 cursor-pointer items-center gap-1.5 rounded-full border-[3px] border-k5-line bg-k5-card px-3 font-k5-display text-[17px] font-semibold text-k5-ink shadow-k5-btn",
    menu: "rounded-2xl border-[3px] border-k5-line bg-k5-card shadow-lg",
    item: "font-k5-display text-base font-semibold text-k5-ink hover:bg-k5-soft",
    active: "bg-k5-soft text-k5-acx",
  },
};

/**
 * The dashboard language picker (EN / FR / PT / 中文 / ES). Choosing one stores it in the NEXT_LOCALE cookie
 * (server action), re-renders the dashboard layout with that language's messages (router.refresh keeps all client
 * state) and saves it as the student's preference on SMS so their other devices follow (best effort).
 */
export function LanguageSwitcher({ variant = "default", className = "" }) {
  const t = useTranslations("common.language");
  const locale = normalizeLocale(useLocale());
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const styles = VARIANTS[variant] || VARIANTS.default;

  const choose = (next) => {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
    saveLanguagePreference(next).catch(() => {});
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("label")}
        title={t("label")}
        className={styles.button}
        disabled={pending}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
        <span className="uppercase">{locale}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div role="menu" aria-label={t("label")} className={`absolute right-0 z-50 mt-2 w-44 overflow-hidden ${styles.menu}`}>
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={code === locale}
                lang={code}
                onClick={() => choose(code)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${styles.item} ${code === locale ? styles.active : ""}`}
              >
                <span>{LOCALE_NAMES[code]}</span>
                {code === locale && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
