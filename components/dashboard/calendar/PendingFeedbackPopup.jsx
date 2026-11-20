"use client";

import { BookOpen, CalendarDays, Clock, MessageSquareHeart, User, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { useLabelTranslator } from "@/i18n/labels";
import { feedbackDateText, feedbackTimeText } from "@/utils/classFeedback";

function Stat({ value, label }) {
  return (
    <div className="rounded-lg bg-white py-2 text-center">
      <div className="text-lg font-bold leading-tight text-primary">{value}</div>
      <div className="text-xs text-primary">{label}</div>
    </div>
  );
}

/**
 * The weekly "Pending Feedback" popup (legacy showPendingFeedbackPopup): how many of last week's classes / activities are
 * still to rate (Total / Activities / Classes) and one card per session with its "Rate this class / activity" button.
 */
export function PendingFeedbackPopup({ pending, onRate, onClose }) {
  const t = useTranslations("feedback");
  const tc = useTranslations("common");
  const dateLocale = useDateFnsLocale();
  // The backend's category ("CLASS", "ACTIVITY", "BATCH"...) in the dashboard language.
  const tCategory = useLabelTranslator("feedback.category");
  return (
    <div data-blocking-popup="" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("pending.title")}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[22px] bg-white shadow-2xl"
      >
        <div className="bg-primary px-4 py-3 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-white text-primary">
                <MessageSquareHeart className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <h2 className="m-0 mb-1 text-xl font-bold">{t("pending.title")}</h2>
                <p className="m-0 text-[15px]">{t("pending.subtitle")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={tc("actions.close")}
              className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat value={pending.total} label={t("pending.total")} />
            <Stat value={pending.activities} label={t("pending.activities")} />
            <Stat value={pending.classes} label={t("pending.classes")} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {pending.items.map((item) => (
              <li key={item.id} className="rounded-2xl border bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded bg-slate-100 text-primary">
                      {item.isActivity ? <Users className="h-5 w-5" aria-hidden="true" /> : <BookOpen className="h-5 w-5" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="m-0 mb-1 text-base font-bold text-black">{item.courseName}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-semibold text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-0.5 text-primary">{tCategory(item.category)}</span>
                        {item.teacher && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" aria-hidden="true" />
                            {item.teacher === "N/A" ? tc("status.na") : item.teacher}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          {item.startZoned ? feedbackDateText(item.startZoned, dateLocale) : item.dateText === "N/A" ? tc("status.na") : item.dateText}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {item.startZoned && item.endZoned ? feedbackTimeText(item.startZoned, item.endZoned, dateLocale) : item.timeText === "N/A" ? tc("status.na") : item.timeText}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRate(item.info)}
                    className="cursor-pointer whitespace-nowrap rounded-full border-none bg-primary px-4 py-1.5 text-sm font-bold text-white shadow-sm"
                  >
                    {item.isActivity ? t("rate.activity") : t("rate.class")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
