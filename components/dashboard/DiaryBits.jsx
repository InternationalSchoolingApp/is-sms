"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { splitDiaryMentions, diaryInitials } from "@/utils/diaryChat";

/** A message's text with its @mentions in green (legacy parentSchoolDiaryHighlightMentions). Line breaks are kept by the caller's CSS. */
export function DiaryMessageText({ text, mentions, className = "", mentionClassName = "font-bold text-green-600" }) {
  const parts = splitDiaryMentions(text, mentions);
  return (
    <p className={className}>
      {parts.map((part, index) =>
        part.mention ? (
          <span key={index} className={mentionClassName}>
            {part.text}
          </span>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

/**
 * Round avatar of a diary thread: the person's photo when there is one, else the initials (legacy: profilePic, else
 * getUserInitialsCommon). A photo that does not load falls back to the initials. The photo URL comes from the server, so it
 * is not run through the image optimizer.
 */
export function DiaryAvatar({ name, src, className = "", initialsClassName = "" }) {
  const [failed, setFailed] = useState(false);
  const url = typeof src === "string" ? src.trim() : "";
  return (
    <span aria-hidden="true" className={`relative flex flex-none items-center justify-center overflow-hidden rounded-full ${className}`}>
      {url && !failed ? (
        <Image src={url} alt="" fill sizes="48px" unoptimized className="object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className={initialsClassName}>{diaryInitials(name, "?")}</span>
      )}
    </span>
  );
}

/** The day label that floats at the top of a chat while it is scrolled (legacy #floating-date). Put it first inside the scrolling area. */
export function FloatingDateChip({ label, visible, className = "" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none sticky top-2 z-10 flex justify-center">
      <span className={`-rotate-2 bg-[rgba(232,218,255,0.92)] px-4 py-1 text-[13px] font-black text-[#4E2C9A] shadow-[0_1px_0_rgba(0,0,0,0.06)] ${visible && label ? "opacity-100" : "opacity-0"} `}>
        {label}
      </span>
    </div>
  );
}

/** The diary could not be loaded (server unreachable or refused) - with a retry, instead of looking like an empty diary. */
export function DiaryLoadError({ onRetry, className = "", buttonClassName = "" }) {
  const t = useTranslations("diary");
  const tc = useTranslations("common");
  return (
    <div role="alert" className={`flex flex-col items-center gap-3 p-5 text-center ${className}`}>
      <p className="m-0 text-sm font-semibold">{t("loadError")}</p>
      <button type="button" onClick={onRetry} className={`cursor-pointer rounded-full px-5 py-1.5 text-sm font-bold ${buttonClassName}`}>
        {tc("actions.tryAgain")}
      </button>
    </div>
  );
}
