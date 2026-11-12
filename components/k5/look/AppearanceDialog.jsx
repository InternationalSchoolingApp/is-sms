"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Palette, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAppearance, AppearanceContext } from "@/components/appearance/AppearanceProvider";
import { sanitizeAppearance } from "@/constant/appearance";
import { AppearanceSettingsPanel } from "@/components/appearance/AppearanceSettingsPanel";
import { useSpeech } from "@/components/k5/pico/useSpeech";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { BUDDIES } from "@/constant/appearance";

/**
 * "Make it yours!" (mockup look dialog) — the K–5 wrapper around AppearanceSettingsPanel.
 * Changes are collected in a local draft; nothing applies until the user clicks Save.
 */
export function AppearanceDialog({ open, onClose }) {
  const appearance = useAppearance();
  const { preferences, updatePreferences, canCustomize } = appearance;
  const { speak, playClip } = useSpeech();
  const themeProps = useK5ThemeProps(
    "flex flex-col max-h-[calc(100vh-32px)] gap-0 overflow-hidden rounded-[32px] border-[3px] border-k5-ink bg-k5-card p-0 text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[1060px] max-[480px]:p-0",
  );

  // Draft state — starts as current preferences, resets when dialog opens.
  const [draft, setDraft] = useState(preferences);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) setDraft(preferences);
    wasOpen.current = open;
  }, [open, preferences]);

  const handleOpenChange = useCallback((next) => {
    if (!next) onClose();
  }, [onClose]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(preferences);

  // Draft context value — intercepts updatePreference/updatePreferences to write to draft, not real store.
  const draftValue = useMemo(() => ({
    ...appearance,
    preferences: draft,
    updatePreference: (name, value) => {
      setDraft((prev) => sanitizeAppearance({ ...prev, [name]: value }));
    },
    updatePreferences: (patch) => {
      setDraft((prev) => sanitizeAppearance({ ...prev, ...patch }));
    },
    resetPreferences: () => setDraft(sanitizeAppearance({})),
  }), [appearance, draft]);

  const handleSave = useCallback(() => {
    updatePreferences(draft);
    onClose();
  }, [draft, updatePreferences, onClose]);

  const hearVoice = useCallback((voice) => {
    setDraft((prev) => sanitizeAppearance({ ...prev, voice }));
    if (voice === "emma") { playClip(); return; }
    speak("Hi! This is my voice!", { force: true, voice });
  }, [speak, playClip]);

  const buddyName = BUDDIES[draft.buddy]?.name || "Pico";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} {...themeProps}>
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center gap-3.5 rounded-t-[28px] bg-k5-card px-[26px] pb-3 pt-[26px] pr-[78px] max-[480px]:px-4 max-[480px]:pt-4">
          <span className="flex h-16 w-16 flex-none items-center justify-center rounded-[20px] bg-k5-yt">
            <Palette className="h-9 w-9 text-k5-yi" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="m-0 font-k5-display text-[30px] font-semibold leading-[1.1]">Make it yours!</DialogTitle>
            <DialogDescription className="m-0 text-base font-bold text-k5-mut">
              {canCustomize ? "Pick your look. It changes right away!" : "Your school picked this look for you."}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-full border-[3px] border-[#D7263D] bg-[#D7263D] text-white shadow-[0_3px_0_#9E1B2C]"
          >
            <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-[26px] py-[22px] max-[480px]:px-4">
          <AppearanceContext.Provider value={draftValue}>
            <AppearanceSettingsPanel withBuddy onHear={hearVoice} />
          </AppearanceContext.Provider>
        </div>

        {/* Sticky footer with Reset + Save */}
        <div className="sticky bottom-0 flex items-center justify-between rounded-b-[28px] bg-k5-card px-[26px] pb-[26px] pt-3 max-[480px]:px-4 max-[480px]:pb-4">
          <button
            type="button"
            disabled={!canCustomize}
            onClick={() => setDraft(sanitizeAppearance({}))}
            className="min-h-12 cursor-pointer rounded-full border-none bg-transparent px-4 text-base font-extrabold text-k5-mut underline disabled:hidden"
          >
            Reset to default
          </button>
          <button
            type="button"
            disabled={!dirty || !canCustomize}
            onClick={handleSave}
            className="min-h-[54px] cursor-pointer rounded-full border-none bg-[#13802B] px-8 font-k5-display text-[21px] font-semibold text-white shadow-[0_5px_0_#0E5C1F] disabled:cursor-default disabled:opacity-40 disabled:shadow-none"
          >
            Save
          </button>
        </div>
        <span className="sr-only">{buddyName} is your buddy.</span>
      </DialogContent>
    </Dialog>
  );
}
