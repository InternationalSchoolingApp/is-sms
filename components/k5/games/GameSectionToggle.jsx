"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

export function GameSectionToggle({ open, onToggle, titleId, panelId, titleClassName = "", children }) {
  const t = useTranslations("k5Games");
  return (
    <>
      <button
        id={titleId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={`flex motion-none min-h-12 w-full cursor-pointer items-center justify-between rounded-xl border-0 bg-transparent p-0 text-left text-k5-ink ${titleClassName}`}>
        <span>{t("yourGames")}</span>
        <ChevronDown className={`h-5 w-5 flex-none transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div
        id={panelId}
        aria-hidden={!open}
        inert={!open || undefined}
        data-collapsed={!open || undefined}
        className="k5-games-slide"
      >
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">{children}</div>
      </div>
    </>
  );
}
