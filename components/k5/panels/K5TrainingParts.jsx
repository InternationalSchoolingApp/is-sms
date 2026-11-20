"use client";

import { useEffect } from "react";
import Link from "next/link";
import { format, isValid } from "date-fns";
import { CalendarDays, Clock, Hourglass, MessageSquare, RefreshCw, Video, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { Calendar } from "@/components/ui/calendar";

/**
 * The grade looks' (K–5 / Grade 6–8 / High) version of the School System Training popups, from the mockup (Playful.dc.html:
 * the training popup, Reschedule, "Yes, reschedule" and "used your free reschedule" dialogs). DESIGN ONLY: the callers
 * (components/dashboard/SystemTrainingPopup.jsx and K5SystemTrainingReschedule.jsx) keep every rule, call and text of their own
 * flow and hand the same data and handlers to these pieces.
 */

export const SUPPORT_EMAIL = "admin.support@internationalschooling.org";

/** "Nov 17, 2026 09:30 AM" -> { date: "Nov 17, 2026", time: "09:30 AM" }. */
export function splitTrainingDateTime(value) {
  const m = /^(.+\d{4})\s+(.+)$/.exec(String(value || "").trim());
  return m ? { date: m[1], time: m[2] } : { date: String(value || ""), time: "" };
}

const PILL_BTN = "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-full font-k5-display font-semibold no-underline";
const SOLID_BTN = `${PILL_BTN} border-none bg-k5-ac text-white shadow-[0_5px_0_var(--k5-acd)]`;
const OUTLINE_BTN = `${PILL_BTN} border-[3px] border-k5-line bg-white text-k5-ink shadow-[0_4px_0_var(--k5-line)]`;
const NOTE = "rounded-[18px] border-[3px] border-[#FFE08A] bg-[#FFF4D6] px-4 py-3 text-center font-extrabold leading-normal text-k5-ink";

/** The red round close button. Absolute (placed with `className`) over a dialog's header, or `inline` in a bar of its own. */
export function K5RedClose({ onClick, className = "", inline = false }) {
  const tc = useTranslations("common");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tc("actions.close")}
      title={tc("actions.close")}
      className={`${inline ? "relative" : "absolute"} z-[2] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-[#E5243B] p-0 shadow-[0_4px_0_#B3172B] ${className}`}
    >
      <X className="h-[18px] w-[18px] text-white" strokeWidth={3.4} aria-hidden="true" />
    </button>
  );
}

/** Accent-coloured header of a dialog: a rounded icon tile and the title. */
function CardHeader({ id, icon: Icon, title, size = "text-[26px]", pad = "pr-[70px]" }) {
  return (
    <div className={`relative flex items-center gap-3 bg-k5-ac py-[22px] pl-[26px] text-white ${pad}`}>
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-white/20">
        <Icon className="h-[22px] w-[22px] flex-none" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <h2 id={id} className={`m-0 font-k5-display font-semibold leading-[1.15] ${size}`}>
        {title}
      </h2>
    </div>
  );
}

/**
 * The popup frame of the mockup (.st-card): dark backdrop, a 4px bordered card with a chunky shadow and a red round close
 * button. Escape closes it (as the dialog it replaces did); clicking outside does not. `training` marks the popup as the
 * System Training's own, so the popup queue does not wait for it (see SystemTrainingPopup.otherPopupOpen).
 * `closeBar`: a dialog without a coloured header gets the close button in a bar of its own ABOVE the scrolling part, so the
 * content never slides under it (the dialogs with a coloured header keep the button over that header).
 */
export function K5DialogShell({ labelledBy, width = "max-w-[600px]", onClose, closeBar, layer = "z-[92]", training = false, alert = false, header, children }) {
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div data-blocking-popup="" data-system-training={training ? "" : undefined} className={`fixed inset-0 ${layer} flex items-center justify-center bg-[rgba(10,16,34,0.55)] p-2 sm:p-4`}>
      {/* The card never grows past the screen: its content scrolls inside it, and the close button stays in view. */}
      <div
        role={alert ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative flex max-h-[calc(100dvh-1rem)] w-full flex-col sm:max-h-[calc(100dvh-2rem)] ${width} overflow-hidden rounded-[32px] border-4 border-k5-line bg-k5-card shadow-[0_10px_0_var(--k5-line)]`}
      >
        {closeBar && !header && (
          <div className="flex shrink-0 justify-end px-3 pt-3">
            <K5RedClose inline onClick={closeBar} className="!h-10 !w-10" />
          </div>
        )}
        {/* `header`: heading fixed at the top of the dialog (never scrolls away) with the close button beside it. */}
        {header && (
          <div className="relative shrink-0 border-b-2 border-k5-line flex min-h-[64px] items-center justify-center px-14 py-3 sm:px-16">
            {header}
            {closeBar && <K5RedClose inline onClick={closeBar} className="!absolute !right-3 !top-1/2 !h-10 !w-10 !-translate-y-1/2" />}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

function WhenCard({ value }) {
  const t = useTranslations("k5Panels.training");
  const locale = useDateFnsLocale();
  const { date, time } = splitTrainingDateTime(value);
  const parsed = date ? new Date(`${date} 12:00`) : null;
  const known = parsed && isValid(parsed);
  return (
    <div className="flex items-center gap-4 rounded-[22px] border-[3px] border-k5-acl bg-k5-act px-[18px] py-4">
      {known && (
        <div aria-hidden="true" className="w-[82px] flex-none overflow-hidden rounded-2xl border-[3px] border-k5-ac bg-white text-center shadow-[0_4px_0_var(--k5-acl)]">
          <div className="bg-k5-ac py-0.5 font-k5-display text-[15px] font-semibold text-white">{format(parsed, "MMM", { locale }).toUpperCase()}</div>
          <div className="font-k5-display text-[32px] font-bold leading-[1.1] text-k5-ink">{format(parsed, "d", { locale })}</div>
          <div className="pb-1 text-[13px] font-extrabold text-k5-mut">{format(parsed, "EEE", { locale })}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-extrabold text-k5-mut">{t("isOn")}</span>
        <span className="font-k5-display text-[23px] font-bold leading-[1.2] text-k5-ink">{value || `${date} ${time}`}</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-k5-ink">
          <Clock className="h-5 w-5 flex-none" strokeWidth={2.4} aria-hidden="true" />
          {t("durationZoom")}
        </span>
      </div>
    </div>
  );
}

/**
 * The dashboard's School System Training popup (mockup stOn): what the training is, when it is, Join Training, Reschedule
 * (opens the reschedule dialog over it, `onReschedule`) and Talk to us. A training the student missed ("RESCHEDULE") shows
 * its message and Reschedule.
 */
export function K5TrainingDialog({ data, chatHref, onReschedule, onJoin, onClose }) {
  const t = useTranslations("k5Panels.training");
  const rescheduled = data.orientStatus === "RESCHEDULE";
  return (
    <K5DialogShell labelledBy="k5-st-title" onClose={onClose} layer="z-[90]" training>
      <K5RedClose onClick={onClose} className="right-3.5 top-3.5" />
      <CardHeader id="k5-st-title" icon={Video} title={t("title")} />
      <div className="flex flex-col gap-4 px-5 sm:px-[26px] pb-6 pt-[22px]">
        <p className="m-0 text-[17px] font-extrabold leading-[1.45] text-k5-mut">{t("intro")}</p>
        {rescheduled ? (
          <>
            <div className="flex flex-col gap-2 rounded-[22px] border-[3px] border-k5-acl bg-k5-act px-[18px] py-4 text-k5-ink">
              <p className="m-0 font-k5-display text-xl font-semibold">{t("rescheduledTitle")}</p>
              <p className="m-0 text-base font-extrabold">{t("rescheduledText")}</p>
            </div>
            <button type="button" onClick={onReschedule} className={`${SOLID_BTN} min-h-[58px] w-full text-xl`}>
              <RefreshCw className="h-5 w-5 flex-none" strokeWidth={2.4} aria-hidden="true" />
              {t("reschedule")}
            </button>
          </>
        ) : (
          <>
            <WhenCard value={data.orientationdateTimeInStudentTimeZone} />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onJoin} className={`${SOLID_BTN} min-h-[58px] flex-[1_1_200px] border-none text-[21px]`}>
                <Video className="h-[22px] w-[22px] flex-none" strokeWidth={2.4} aria-hidden="true" />
                {t("join")}
              </button>
              <button type="button" onClick={onReschedule} className={`${PILL_BTN} min-h-[58px] flex-[1_1_200px] border-[3px] border-dashed border-k5-ac bg-white text-xl text-k5-acx`}>
                <RefreshCw className="h-5 w-5 flex-none" strokeWidth={2.4} aria-hidden="true" />
                {t("reschedule")}
              </button>
            </div>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <span className="text-sm font-extrabold text-k5-mut">{t("firstFreeOnly")}</span>
          {chatHref && (
            <a href={chatHref} target="_blank" rel="noopener noreferrer" className={`${OUTLINE_BTN} min-h-[42px] gap-2 px-4 text-base shadow-none`}>
              <MessageSquare className="h-5 w-5 flex-none" strokeWidth={2.4} aria-hidden="true" />
              {t("talkToUs")}
            </a>
          )}
        </div>
      </div>
    </K5DialogShell>
  );
}

function Chip({ icon: Icon, children, className = "border-k5-line bg-white" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-[5px] text-sm font-extrabold text-k5-ink ${className}`}>
      {Icon && <Icon className="h-5 w-5 flex-none" strokeWidth={2.4} aria-hidden="true" />}
      {children}
    </span>
  );
}

const NAV_BTN =
  "flex size-[38px] cursor-pointer items-center justify-center rounded-full border-none bg-k5-ac p-0 text-white select-none aria-disabled:cursor-default aria-disabled:bg-[#C9D3E3]";
const DAY_BTN =
  "h-9 w-full min-w-0 rounded-xl border-2 border-k5-line bg-k5-card p-0 text-sm font-black text-k5-ink hover:bg-k5-act data-[selected-single=true]:border-k5-ac data-[selected-single=true]:bg-k5-ac data-[selected-single=true]:text-white disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-k5-mut/50 disabled:hover:bg-transparent";

/**
 * The date and time step of the reschedule (mockup rsOn): the options chips, the month calendar and the open times side by
 * side, the chosen time, Confirm and the fee note. Same state and calls as the page: the calendar starts tomorrow, picking a
 * day loads its free times (`slots`), Confirm saves.
 */
/** Heading only: this is what stays fixed at the top of the dialog (with the close button); the rest scrolls. */
export function K5RescheduleHeader({ titleId }) {
  const t = useTranslations("k5Panels.training");
  return <h2 id={titleId} className="m-0 text-center font-k5-display text-xl font-semibold text-k5-ink sm:text-[28px]">{t("rescheduleTitle")}</h2>;
}

function RescheduleIntro({ firstFree }) {
  const t = useTranslations("k5Panels.training");
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="m-0 text-sm font-extrabold text-k5-mut sm:text-base">{t("scheduleOn")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Chip icon={Clock}>{t("minutes30")}</Chip>
        <Chip icon={Video}>{t("zoomCall")}</Chip>
        {firstFree && <Chip className="border-k5-grn/40 bg-k5-gt">{t("firstFree")}</Chip>}
      </div>
    </div>
  );
}

export function K5ReschedulePicker({ hideHeader = false, minDate, endDate, date, onPickDate, slotsLoading, slots, slotsMessage, slot, onPickSlot, onConfirm, saving, firstFree, titleId }) {
  const t = useTranslations("k5Panels.training");
  const tc = useTranslations("common");
  const locale = useDateFnsLocale();
  const picked = slots.find((s) => s.stTime === slot);
  const pickedLine = date && picked ? `${format(date, "MMM d, yyyy", { locale })} ${picked.label}` : "";
  return (
    <div className="flex flex-col gap-3">
      <div className="px-4 pb-2 sm:px-7">
        {!hideHeader && <K5RescheduleHeader titleId={titleId} />}
        <div className={hideHeader ? "pt-3" : "pt-2"}>
          <RescheduleIntro firstFree={firstFree} />
        </div>
      </div>
      <div className="grid items-start gap-[22px] px-4 sm:px-7 pb-2 pt-4 md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2 rounded-[22px] border-[3px] border-k5-line p-3">
          <Calendar
            mode="single"
            required
            selected={date || undefined}
            onSelect={(picked) => picked && onPickDate(picked)}
            disabled={minDate ? { before: minDate } : undefined}
            defaultMonth={minDate}
            startMonth={minDate}
            endMonth={endDate}
            showOutsideDays={false}
            className="w-full bg-transparent p-0"
            classNames={{
              root: "w-full",
              months: "relative flex w-full flex-col",
              month: "flex w-full flex-col gap-2",
              nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between",
              button_previous: NAV_BTN,
              button_next: NAV_BTN,
              month_caption: "flex h-[38px] w-full items-center justify-center",
              caption_label: "font-k5-display text-[19px] font-semibold text-k5-ink",
              month_grid: "w-full border-collapse",
              weekdays: "flex",
              weekday: "flex-1 text-center text-[13px] font-black text-k5-mut",
              week: "mt-1 flex w-full gap-1",
              day: "flex-1 p-0",
              day_button: DAY_BTN,
              today: "",
              outside: "",
              disabled: "",
              hidden: "invisible",
            }}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="m-0 font-k5-display text-xl font-semibold text-k5-ink">{date ? format(date, "EEEE, MMM d", { locale }) : t("pickTime")}</h3>
          {!date ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[20px] border-[3px] border-dashed border-k5-line p-[18px] text-center text-[15px] font-extrabold text-k5-mut">
              <CalendarDays className="h-[22px] w-[22px] flex-none" strokeWidth={2.4} aria-hidden="true" />
              {t("pickDay")}
            </div>
          ) : slotsLoading ? (
            <K5Loading label={t("loadingTimes")} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <K5Sk key={i} className="h-[52px] w-full rounded-[14px]" />
              ))}
            </K5Loading>
          ) : slots.length === 0 ? (
            <div role="status" className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[20px] border-[3px] border-[#F5C2C7] bg-k5-rt p-[18px] text-center text-k5-ink">
              <span className="font-k5-display text-xl font-semibold">{slotsMessage || t("noSlot")}</span>
              {!slotsMessage && <span className="text-[15px] font-extrabold">{t("pickAnother")}</span>}
            </div>
          ) : (
            // A day can have many times (every half hour): on a wide screen the list scrolls in its own box so Confirm stays near.
            <div role="radiogroup" aria-label={t("pickTime")} className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:max-h-[240px] md:overflow-y-auto md:py-1 md:pr-1">
              {slots.map((s) => {
                const on = slot === s.stTime;
                return (
                  <button
                    key={s.stTime}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onPickSlot(s.stTime)}
                    className={`min-h-[52px] cursor-pointer rounded-[14px] border-2 font-k5-display text-[17px] font-semibold ${on ? "border-k5-ac bg-k5-ac text-white" : "border-k5-line bg-k5-card text-k5-ink"}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Confirm stays at the bottom of the dialog while a long list of times is scrolled (every half hour is a lot on a phone). */}
      <div className="sticky bottom-0 z-[1] flex flex-col items-center gap-3 bg-k5-card px-4 pb-3 pt-3.5 max-md:border-t-2 max-md:border-k5-line sm:px-7">
        {pickedLine && (
          <div className="flex items-center gap-3 rounded-2xl border-[3px] border-k5-grn/40 bg-k5-gt px-[18px] py-2.5 text-k5-ink">
            <CalendarDays className="h-[22px] w-[22px] flex-none" strokeWidth={2.4} aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-[13px] font-extrabold">{t("newTime")}</span>
              <span className="font-k5-display text-lg font-semibold">{pickedLine}</span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          aria-disabled={!slot}
          className={`${PILL_BTN} min-h-[56px] border-none px-10 text-xl text-white ${slot ? "bg-k5-grn shadow-[0_5px_0_var(--k5-grnd)]" : "bg-[#C9D3E3] shadow-[0_5px_0_#AEB8CA]"} disabled:cursor-default disabled:opacity-60`}
        >
          {saving ? tc("status.saving") : tc("actions.confirm")}
        </button>
      </div>
      {firstFree && (
        <div className="flex justify-center px-4 pb-5 pt-1 sm:px-7">
          <p className={`${NOTE} m-0 max-w-[620px] !rounded-[14px] !border-2 !py-2.5 text-sm`}>
            {t("feeNote")}
          </p>
        </div>
      )}
    </div>
  );
}

/** The "Yes, reschedule" warning before the last free reschedule (mockup rsAskOn). */
export function K5RescheduleConfirm({ newTime, saving, onYes, onNo }) {
  const t = useTranslations("k5Panels.training");
  const tc = useTranslations("common");
  return (
    <K5DialogShell labelledBy="k5-rsa-title" width="max-w-[560px]" layer="z-[94]" alert onClose={saving ? undefined : onNo}>
      <CardHeader id="k5-rsa-title" icon={RefreshCw} title={t("rescheduleTitle")} size="text-[23px]" pad="pr-16" />
      <K5RedClose onClick={saving ? undefined : onNo} className="right-4 top-[18px] !h-10 !w-10" />
      <div className="flex flex-col items-center gap-4 px-5 sm:px-[26px] pb-6 pt-[22px] text-center">
        <p className="m-0 text-lg font-extrabold leading-normal text-k5-ink">
          {t("confirmText")}
        </p>
        {newTime && (
          <div role="note" className={`${NOTE} w-full !rounded-2xl !border-2 !py-2.5 text-[15px]`}>
            {t.rich("newTimeLine", { time: newTime, b: (chunks) => <b>{chunks}</b> })}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onNo} disabled={saving} className={`${OUTLINE_BTN} min-h-[52px] px-[34px] text-[19px] disabled:opacity-60`}>
            {tc("actions.no")}
          </button>
          <button type="button" onClick={onYes} disabled={saving} className={`${PILL_BTN} min-h-[52px] border-none bg-[#1FA855] px-[38px] text-[19px] text-white shadow-[0_5px_0_#157A3D] disabled:opacity-60`}>
            {saving ? tc("status.saving") : t("yesReschedule")}
          </button>
        </div>
      </div>
    </K5DialogShell>
  );
}

/**
 * Every free reschedule is used (mockup rsUsedOn): the hourglass card with the training time, the note, who to ask, and
 * OK / Talk to School Administration.
 */
export function K5RescheduleUsed({ userName, trainingLine, dashboardHref, onOk, chatHref, titleId }) {
  const t = useTranslations("k5Panels.training");
  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-3 px-4 sm:px-7 py-[30px] text-center">
      <span className="flex h-[76px] w-[76px] items-center justify-center rounded-3xl bg-k5-ac shadow-[0_5px_0_var(--k5-acd)]">
        <Hourglass className="h-11 w-11 text-white" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <h2 id={titleId} className="mb-0 mt-1 font-k5-display text-[28px] font-semibold text-k5-ink">{t("hello", { name: userName })}</h2>
      <p className="m-0 text-lg font-extrabold leading-snug text-k5-ink">
        {t.rich("isOnLine", { line: trainingLine, b: (chunks) => <b className="text-k5-acx">{chunks}</b> })}
      </p>
      <div role="note" className={`${NOTE} w-full text-base`}>
        {t("usedFree")}
      </div>
      <p className="m-0 text-base font-extrabold leading-normal text-k5-mut">
        {t.rich("essential", {
          email: SUPPORT_EMAIL,
          link: (chunks) => (
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-black text-k5-acx">
              {chunks}
            </a>
          ),
        })}
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-3">
        {onOk ? (
          <button type="button" onClick={onOk} className={`${OUTLINE_BTN} min-h-[52px] px-[30px] text-lg`}>
            {t("okGotIt")}
          </button>
        ) : (
          <Link href={dashboardHref} className={`${OUTLINE_BTN} min-h-[52px] px-[30px] text-lg`}>
            {t("okGotIt")}
          </Link>
        )}
        {chatHref && (
          <a href={chatHref} target="_blank" rel="noopener noreferrer" className={`${SOLID_BTN} min-h-[52px] px-4 sm:px-7 text-lg`}>
            {t("talkToAdmin")}
          </a>
        )}
      </div>
    </div>
  );
}
