"use client";

import { useState } from "react";
import { CheckCircle2, Palette, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { AppearanceSettingsPanel } from "@/components/appearance/AppearanceSettingsPanel";
import { useSpeech } from "@/components/k5/pico/useSpeech";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { BUDDIES } from "@/constant/appearance";

/**
 * "Make it yours!" (mockup look dialog) — the K–5 wrapper around AppearanceSettingsPanel.
 * Changes preview instantly and save on their own; the footer shows "Saved" only after a
 * real save, an error + Retry when the device refuses, and Reset asks for confirmation.
 */
export function AppearanceDialog({ open, onClose }) {
  const { preferences, updatePreference, resetPreferences, canCustomize, savedAt, error, retry } = useAppearance();
  const { speak } = useSpeech();
  const themeProps = useK5ThemeProps(
    "max-h-[calc(100vh-32px)] gap-5 overflow-y-auto rounded-[32px] border-[3px] border-k5-ink bg-k5-card p-[26px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[640px] max-[480px]:p-4",
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const buddyName = BUDDIES[preferences.buddy]?.name || "Pico";

  const hearVoice = (voice) => {
    updatePreference("voice", voice);
    speak(`Hi! This is my voice!`, { force: true, voice });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setConfirmReset(false);
          onClose();
        }
      }}
    >
      <DialogContent showCloseButton={false} {...themeProps}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card text-k5-mut"
        >
          <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3.5 pr-[52px]">
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded-[20px] bg-k5-yt">
            <Palette className="h-9 w-9 text-k5-yi" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="m-0 font-k5-display text-[30px] font-semibold leading-[1.1]">Make it yours!</DialogTitle>
            <DialogDescription className="m-0 text-base font-bold text-k5-mut">
              {canCustomize ? "Pick your look. It changes right away!" : "Your school picked this look for you."}
            </DialogDescription>
          </div>
        </div>

        <AppearanceSettingsPanel withBuddy onHear={hearVoice} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {confirmReset ? (
            <span className="flex flex-wrap items-center gap-2 text-base font-extrabold">
              Reset everything?
              <button
                type="button"
                onClick={() => {
                  resetPreferences();
                  setConfirmReset(false);
                  speak(`Hi! I'm ${BUDDIES.pico.name} again!`);
                }}
                className="min-h-11 cursor-pointer rounded-full border-none bg-k5-red px-4 font-black text-white"
              >
                Yes, reset
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="min-h-11 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-4 font-black text-k5-ink">
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={!canCustomize}
              onClick={() => setConfirmReset(true)}
              className="min-h-12 cursor-pointer rounded-full border-none bg-transparent px-4 text-base font-extrabold text-k5-mut underline disabled:hidden"
            >
              Reset to default
            </button>
          )}

          <span aria-live="polite" className="flex items-center gap-2 text-[15px] font-black">
            {error ? (
              <>
                <span className="text-k5-ri">{error}</span>
                <button type="button" onClick={retry} className="min-h-11 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-3 font-black text-k5-ink">
                  Retry
                </button>
              </>
            ) : savedAt ? (
              <span className="flex items-center gap-1 text-k5-gx">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                Saved
              </span>
            ) : null}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[54px] cursor-pointer rounded-full border-none bg-[#FFC531] px-8 font-k5-display text-[21px] font-semibold text-[#1C2640] shadow-[0_5px_0_#C9930A]"
          >
            Looks great!
          </button>
        </div>
        <span className="sr-only">{buddyName} is your buddy.</span>
      </DialogContent>
    </Dialog>
  );
}
