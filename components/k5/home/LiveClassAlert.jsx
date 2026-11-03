"use client";

import { differenceInMinutes } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { SubjectIcon } from "@/components/k5/home/k5Bits";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { classTitle, timeRange } from "@/utils/k5Calendar";

function startedAgo(event, now) {
  if (!event.startZoned || !now) return "";
  const mins = Math.max(0, differenceInMinutes(now, event.startZoned));
  if (mins < 1) return "Started just now";
  if (mins < 60) return `Started ${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  return `Started ${hours} hour${hours === 1 ? "" : "s"} ago`;
}

/**
 * Live-class alert (Playful.dc.html "LIVE NOW" dialog): green LIVE NOW strip, the student's
 * buddy saying "Hurry, {name}!", the class card with how long ago it started, a big pulsing
 * "Join class now" and "Not now, show my calendar". Shown once per live class per browser
 * session. The dialog portals out of K5Shell, so it carries the .theme-k5 look itself.
 */
export function LiveClassAlert({ event, now, firstName, onJoin, onClose }) {
  const { preferences } = useAppearance();
  const themeProps = useK5ThemeProps(
    "gap-0 overflow-hidden rounded-[34px] border-[3px] border-k5-ink bg-k5-card p-0 text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[560px]",
  );
  const hurry = `Hurry${firstName ? `, ${firstName}` : ""}! Your class has started. Your teacher is waiting!`;

  return (
    <Dialog open={Boolean(event)} onOpenChange={(open) => !open && onClose()}>
      {event && (
        <DialogContent showCloseButton={false} {...themeProps}>
          <div className="flex items-center justify-center gap-2.5 bg-k5-grn px-6 py-3 font-k5-display text-xl font-semibold tracking-[0.06em] text-white">
            <span aria-hidden="true" className="block h-3.5 w-3.5 animate-pulse rounded-full bg-[#FFC531]" />
            LIVE NOW
          </div>

          <div className="flex flex-col gap-5 px-7 pb-7 pt-6 max-[480px]:px-4 max-[480px]:pb-5">
            <div className="flex items-center gap-3.5">
              <span className="flex-none">
                <PicoMascot buddy={preferences.buddy} width={76} full={false} wave={false} />
              </span>
              <div className="relative flex-1 rounded-[20px] bg-k5-vt px-4 py-3">
                <span aria-hidden="true" className="absolute -left-2 top-1/2 -mt-2 block h-4 w-4 rotate-45 bg-k5-vt" />
                <DialogDescription className="relative m-0 font-k5-display text-xl font-medium leading-[1.3] text-k5-ink">{hurry}</DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-[24px] border-[3px] border-dashed border-k5-pi bg-k5-pt px-[18px] py-4">
              <span className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-[22px] bg-k5-card">
                <SubjectIcon name={classTitle(event)} className="h-10 w-10 text-k5-pi" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <DialogTitle className="m-0 font-k5-display text-[28px] font-semibold leading-[1.1]">{classTitle(event)}</DialogTitle>
                <span className="text-lg font-extrabold text-k5-mut">{timeRange(event)}</span>
                <span className="text-[15px] font-extrabold text-[#8F1F4E] dark:text-[#FFB3D3]">{startedAgo(event, now)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onJoin(event)}
              className="k5-live-ring flex min-h-[76px] cursor-pointer items-center justify-center gap-3 rounded-full border-none bg-k5-grn font-k5-display text-[28px] font-semibold text-white shadow-[0_6px_0_var(--k5-grnD)]"
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Join class now
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 cursor-pointer self-center rounded-full border-none bg-transparent px-5 text-base font-extrabold text-k5-mut underline"
            >
              Not now, show my calendar
            </button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
