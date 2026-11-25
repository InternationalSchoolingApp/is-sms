"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, Check, Info, Lock, PartyPopper, Wallet } from "lucide-react";
import { K5DialogShell, K5RedClose } from "@/components/k5/panels/K5TrainingParts";

/**
 * The grade looks' (Elementary / Middle / High) version of the Reserve a Seat / Re-Enroll popups of the dashboard home: the same
 * frame, header, pill buttons and note cards as the School System Training popups (K5TrainingParts), so the three looks follow the
 * student's colours, fonts and skin. DESIGN ONLY: components/dashboard/ReserveSeatForNextGrade.jsx keeps every rule, call and text
 * and hands the same data and handlers to these two pieces; the standard look keeps its own dialogs there.
 */

const PILL_BTN = "inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-full px-6 py-2 text-center font-k5-display text-lg font-semibold leading-tight no-underline disabled:cursor-default disabled:opacity-60";
const SOLID_BTN = `${PILL_BTN} border-none bg-k5-ac text-white shadow-[0_5px_0_var(--k5-acd)]`;
const OUTLINE_BTN = `${PILL_BTN} border-[3px] border-k5-line bg-white text-k5-ink shadow-[0_4px_0_var(--k5-line)]`;
const NOTE = "rounded-[18px] border-[3px] border-[#FFE08A] bg-[#FFF4D6] px-4 py-3 text-left font-extrabold leading-normal text-k5-ink";
const pad2 = (n) => String(n).padStart(2, "0");

/** Accent-coloured header: a rounded icon tile and the title, the red round close button on the right. */
function Header({ id, icon: Icon, title, onClose }) {
  return (
    <div className="relative flex items-center gap-3 bg-k5-ac py-[20px] pl-[24px] pr-[70px] text-white">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-white/20">
        <Icon className="h-[22px] w-[22px] flex-none" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <h2 id={id} className="m-0 font-k5-display text-[24px] font-semibold leading-[1.15]">
        {title}
      </h2>
      <K5RedClose onClick={onClose} className="right-3 top-1/2 -translate-y-1/2" />
    </div>
  );
}

/** "This offer is valid for a limited time only!" with a countdown of `days` days that starts again when it reaches zero. */
function OfferCountdown({ days }) {
  const cycle = Math.max(1, Number.parseInt(days, 10) || 0) * 24 * 60 * 60 * 1000;
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const distance = cycle - ((now - start) % cycle);
  const parts = [
    [Math.floor(distance / 86400000), "Days"],
    [Math.floor((distance % 86400000) / 3600000), "Hours"],
    [Math.floor((distance % 3600000) / 60000), "Min"],
    [Math.floor((distance % 60000) / 1000), "Sec"],
  ];
  return (
    <div className={`${NOTE} flex flex-wrap items-center justify-center gap-x-4 gap-y-3`}>
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-[#C27C00]">
          <CalendarDays className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </span>
        <span className="text-[15px]">This offer is valid for a limited time only!</span>
      </span>
      <span className="flex items-center gap-1.5" aria-live="off">
        {parts.map(([value, label]) => (
          <span key={label} className="flex min-w-[54px] flex-col items-center rounded-[14px] border-[3px] border-k5-line bg-white px-1.5 py-1">
            <span className="font-k5-display text-xl font-bold leading-[1.1] text-[#D7263D]">{pad2(value)}</span>
            <span className="text-[11px] font-extrabold text-k5-mut">{label}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

/** "Awesome!" / "Congratulations!" with the offer: Hi {name}, the next grade, Maybe Later and the accept button. */
export function K5EnrollReserveDialog({ offer, offerAmount, offerTag, countdownDays, nextGrade, studentName, acceptLabel, busy, onAccept, onMaybeLater, onClose }) {
  const accept = (
    <button type="button" disabled={busy} onClick={onAccept} className={`${SOLID_BTN} w-full animate-[ras-pulse_1.5s_ease-in-out_infinite] sm:w-auto sm:flex-1`}>
      {acceptLabel}
    </button>
  );
  return (
    <K5DialogShell labelledBy="ras-title" width={offer ? "max-w-[620px]" : "max-w-[460px]"} onClose={onClose} layer="z-[92]">
      <Header id="ras-title" icon={offer ? PartyPopper : Check} title={offer ? "Congratulations!" : "Awesome!"} onClose={onClose} />
      <div className="flex flex-col items-center gap-4 px-6 pb-7 pt-6 text-center">
        <div className="flex flex-col gap-1.5">
          <p className="m-0 font-k5-display text-[28px] font-semibold leading-[1.15] text-k5-ink">Hi {studentName}!</p>
          <p className="m-0 text-base font-extrabold text-k5-mut">Now you are eligible for re-enrollment for the next grade</p>
        </div>
        {offer ? (
          <>
            <div className="flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-[22px] border-[3px] border-k5-acl bg-k5-act px-4 py-3">
              <Image src="/images/reserve-seat/reenrollement.png" alt="" width={90} height={90} className="h-auto w-[90px] flex-none" />
              <div className="flex flex-col items-center gap-1">
                <span className="rounded-full bg-k5-ac px-3.5 py-1 text-xs font-black tracking-[0.04em] text-white">{offerTag}</span>
                <span className="text-sm font-extrabold text-k5-mut">You get a special discount of</span>
                <span className="font-k5-display text-[44px] font-bold leading-none text-k5-acx">
                  {String(offerAmount).split(".")[0]} <span className="text-[26px]">OFF</span>
                </span>
              </div>
            </div>
            {countdownDays ? <OfferCountdown days={countdownDays} /> : null}
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={onMaybeLater} className={`${OUTLINE_BTN} w-full sm:w-auto sm:flex-1`}>
                Maybe Later
              </button>
              {accept}
            </div>
          </>
        ) : (
          <>
            <div className="w-full rounded-[18px] border-[3px] border-k5-acl bg-k5-act px-4 py-3 font-k5-display text-[22px] font-semibold text-k5-acx">Ready for {nextGrade}?</div>
            <div className="flex w-full">{accept}</div>
          </>
        )}
      </div>
    </K5DialogShell>
  );
}

/** The fee, the discounts, the payable fee and Proceed to Pay. `lines`: [{ label, value }] of the discount rows. */
export function K5ReserveFeeDialog({ title, totalFee, lines, payableFee, note, busy, onPay, onClose }) {
  return (
    <K5DialogShell labelledBy="ras-fee-title" width="max-w-[500px]" onClose={onClose} layer="z-[92]">
      <Header id="ras-fee-title" icon={Wallet} title={title} onClose={onClose} />
      <div className="flex flex-col gap-3 px-6 pb-7 pt-6">
        <div className="flex items-center justify-between gap-3 rounded-[18px] px-3 py-1">
          <span className="font-k5-display text-lg font-semibold text-k5-ink">Total Fee</span>
          <span className="font-k5-display text-[26px] font-bold text-k5-ink">{totalFee}</span>
        </div>
        {lines.map((line) => (
          <div key={line.label} className="flex items-center justify-between gap-3 rounded-[18px] px-3 py-1 font-extrabold text-k5-gx">
            <span>{line.label}</span>
            <span className="font-k5-display text-lg font-semibold">- {line.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 rounded-[18px] border-[3px] border-k5-acl bg-k5-act px-4 py-3">
          <span className="text-sm font-extrabold text-k5-mut">Payable Fee (USD)</span>
          <span className="font-k5-display text-[26px] font-bold text-k5-acx">{payableFee}</span>
        </div>
        <div className={`${NOTE} flex items-start gap-2 text-sm`}>
          <Info className="mt-0.5 h-4 w-4 flex-none" strokeWidth={2.6} aria-hidden="true" />
          <p className="m-0">{note}</p>
        </div>
        <div className="flex justify-center pt-1">
          <button type="button" disabled={busy} onClick={onPay} className={`${SOLID_BTN} w-full max-w-[260px]`}>
            <Lock className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden="true" /> Proceed to Pay
          </button>
        </div>
      </div>
    </K5DialogShell>
  );
}
