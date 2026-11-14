"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarDays, Clock, MessagesSquare, NotebookText, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/constant/appLinks";

const FEATURES = [
  [Bell, "All updates in one place", "bg-k5-yt", "text-k5-yx"],
  [Clock, "Class reminders", "bg-k5-pt", "text-k5-pi"],
  [CalendarDays, "Class calendar", "bg-k5-bt", "text-k5-bi"],
  [NotebookText, "Student\u2019s Diary", "bg-k5-ot", "text-k5-oi"],
  [MessagesSquare, "Chat with teachers", "bg-k5-gt", "text-k5-gx"],
];

const STEPS = ["Open your phone camera", "Scan the code", "Tap the link and install"];

function PlayBadge() {
  return (
    <>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
        <path d="M6 3.5v17l14-8.5z" fill="#FFFFFF" />
      </svg>
      <span className="flex flex-col whitespace-nowrap leading-[1.1]">
        <span className="text-[10px] font-extrabold opacity-90">GET IT ON</span>
        <span className="font-k5-display text-lg font-semibold">Google Play</span>
      </span>
    </>
  );
}

function AppStoreBadge() {
  return (
    <>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="flex-none">
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="12" cy="18" r="1" fill="#FFFFFF" />
      </svg>
      <span className="flex flex-col whitespace-nowrap leading-[1.1]">
        <span className="text-[10px] font-extrabold opacity-90">Download on the</span>
        <span className="font-k5-display text-lg font-semibold">App Store</span>
      </span>
    </>
  );
}

// Android first, like the mockup. The QR code is dark on white so every phone camera can read it.
const STORES = [
  { key: "android", name: "Android", url: PLAY_STORE_URL, label: "Get it on Google Play", Badge: PlayBadge, look: "bg-[#1F7A3A] shadow-[0_4px_0_#145A29]" },
  { key: "ios", name: "iOS", url: APP_STORE_URL, label: "Download on the App Store", Badge: AppStoreBadge, look: "bg-black shadow-[0_4px_0_#3B4663]" },
];

function StoreCard({ store }) {
  const { Badge } = store;
  return (
    <div className="flex items-center gap-3.5 rounded-3xl border-[3px] border-k5-line bg-k5-soft px-3.5 pb-[30px] pt-3.5 max-[760px]:pb-3.5">
      <div className="relative flex-none rounded-[18px] bg-white p-1.5 max-[760px]:hidden">
        <QRCodeSVG value={store.url} size={96} level="M" bgColor="#FFFFFF" fgColor="#1C2640" marginSize={0} role="img" title={"QR code for " + store.name} className="block" />
        <span className="absolute bottom-[-24px] left-1/2 -translate-x-1/2 -rotate-3 whitespace-nowrap rounded-full bg-[#FFC531] px-2.5 py-0.5 font-k5-display text-[13px] font-semibold text-[#1C2640] shadow-[0_2px_0_#C9930A]">
          Scan me!
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="font-k5-display text-xl font-semibold text-k5-ink">{store.name}</span>
        <a
          href={store.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={store.label}
          className={"flex min-h-[54px] items-center gap-2 rounded-2xl px-3 py-1.5 text-white no-underline " + store.look}
        >
          <Badge />
        </a>
      </div>
    </div>
  );
}

/** The animated "phone scans, downloads, installs" picture next to the steps (mockup demo). */
function StepsDemo() {
  return (
    <div className="ms-auto flex flex-none flex-col items-center gap-1.5">
      <svg width="150" height="150" viewBox="92 0 150 150" role="img" aria-label="A phone scans the code, downloads the app and installs it" className="block max-w-full">
        <rect x="92" y="0" width="150" height="150" rx="18" className="fill-k5-card" />
        <g className="k5-demo-phone">
          <rect x="134" y="14" width="66" height="122" rx="13" fill="#1C2640" />
          <rect x="139" y="24" width="56" height="100" rx="7" fill="#EAF2FF" />
          <g className="k5-demo-s1">
            <path d="M146 40v-6h6M188 40v-6h-6M146 106v6h6M188 106v6h-6" fill="none" stroke="#2F7BF5" strokeWidth="2.4" strokeLinecap="round" />
            <g fill="#1C2640">
              <path fillRule="evenodd" d="M156 56h14v14h-14zM159 59h8v8h-8zM178 56h14v14h-14zM181 59h8v8h-8zM156 78h14v14h-14zM159 81h8v8h-8z" />
              <path d="M178 78h4v4h-4zM186 78h4v4h-4zM182 82h4v4h-4zM178 86h4v4h-4zM186 88h4v4h-4z" />
            </g>
            <rect className="k5-demo-scan" x="144" y="42" width="46" height="3" rx="1.5" fill="#1F9E5A" />
          </g>
          <g className="k5-demo-s2" style={{ opacity: 0 }}>
            <circle cx="167" cy="74" r="18" fill="#1F9E5A" />
            <path d="M159 74l6 6 11-12" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="k5-demo-s3" style={{ opacity: 0 }}>
            <g className="k5-demo-arrow">
              <path d="M167 52v24M158 68l9 9 9-9" fill="none" stroke="#2F7BF5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <rect x="148" y="94" width="38" height="7" rx="3.5" fill="#C9D8F2" />
            <rect className="k5-demo-bar" x="148" y="94" width="38" height="7" rx="3.5" fill="#2F7BF5" />
          </g>
          <g className="k5-demo-s4" style={{ opacity: 0 }}>
            <rect x="150" y="54" width="34" height="34" rx="9" fill="#1E66E0" />
            <path d="M167 60c-4.4 0-8 3.4-8 7.6 0 5.8 8 12.4 8 12.4s8-6.6 8-12.4c0-4.2-3.6-7.6-8-7.6z" fill="#FFFFFF" />
            <circle cx="167" cy="67.5" r="3" fill="#1E66E0" />
            <path d="M150 100l2 4 4 .6-3 2.8.7 4.2-3.7-2-3.7 2 .7-4.2-3-2.8 4-.6z" fill="#FFC531" />
            <path d="M184 98l1.5 3 3.2.5-2.3 2.2.6 3.2-3-1.6-3 1.6.6-3.2-2.3-2.2 3.2-.5z" fill="#FFC531" />
          </g>
          <rect x="160" y="17" width="14" height="3" rx="1.5" fill="#3B4663" />
        </g>
      </svg>
      <div className="grid justify-items-center font-k5-display text-[15px] font-semibold">
        <span className="k5-demo-c1 text-k5-gx [grid-area:1/1]">Scanning…</span>
        <span className="k5-demo-c2 text-k5-acx opacity-0 [grid-area:1/1]">Downloading…</span>
        <span className="k5-demo-c3 text-k5-yx opacity-0 [grid-area:1/1]">Installed! Yay!</span>
      </div>
    </div>
  );
}

function SchoolPin({ schoolName }) {
  return (
    <svg width="64" height="78" viewBox="0 0 64 78" role="img" aria-label={schoolName || "School"} className="k5-pico-idle flex-none max-[480px]:hidden">
      <ellipse cx="32" cy="75" rx="12" ry="2.5" fill="#1C2640" opacity="0.12" />
      <path d="M32 2C16 2 4 14 4 29.5 4 49 32 73 32 73s28-24 28-43.5C60 14 48 2 32 2z" fill="#2F7BF5" />
      <path d="M32 2C16 2 4 14 4 29.5c0 3 .6 6 1.6 9C8 22 18 11 32 11s24 11 26.4 27.5c1-3 1.6-6 1.6-9C60 14 48 2 32 2z" fill="#5C9BFF" opacity="0.6" />
      <circle cx="32" cy="30" r="17" fill="#FFFFFF" />
      <circle cx="32" cy="30" r="13.5" fill="none" stroke="#DDEBFF" strokeWidth="2" />
      <path d="M32 19.5v2.5M32 38v2.5M21.5 30h2.5M40 30h2.5" stroke="#1F9E5A" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 30l-6.5-4.5M32 30l9-3" stroke="#1F9E5A" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="32" cy="30" r="2.2" fill="#1F9E5A" />
    </svg>
  );
}

function DancingPhone() {
  return (
    <svg width="24" height="34" viewBox="0 0 24 34" aria-hidden="true" className="k5-phone-dance flex-none">
      <rect x="2" y="2" width="20" height="30" rx="5" fill="#1C2640" />
      <rect x="4.5" y="6" width="15" height="21" rx="2" fill="#7CCBFF" />
      <circle cx="12" cy="29.5" r="1.2" fill="#FFFFFF" />
      <path d="M8 15l2.5 2.5L16 12" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Stay connected with our app (mockup Get the App): QR codes and badge links for the two
 * store pages of the school app. Plain links that open the store in a new tab; nothing about
 * the student is sent anywhere.
 */
export function AppDownloadDialog({ open, schoolName, onClose, lockSeconds = 0 }) {
  // lockSeconds: the automatic install popup cannot be closed until its countdown ends (legacy 10 s). The state
  // starts when the dialog mounts, so callers render it only while it is shown.
  const [left, setLeft] = useState(lockSeconds);
  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const locked = left > 0;
  const themeProps = useK5ThemeProps(
    "max-h-[calc(100vh-32px)] gap-[18px] overflow-y-auto rounded-[32px] border-[3px] border-k5-ink bg-k5-card p-6 pb-[22px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[720px] max-[480px]:p-4",
  );
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !locked && onClose()} disablePointerDismissal={lockSeconds > 0}>
      <DialogContent showCloseButton={false} {...themeProps}>
        <button
          type="button"
          onClick={onClose}
          disabled={locked}
          aria-label={locked ? `Close, available in ${left} seconds` : "Close"}
          className="absolute right-4 top-4 flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-red bg-k5-red shadow-[0_3px_0_#9E1B2C] disabled:cursor-default disabled:opacity-50"
        >
          <X className="h-[18px] w-[18px] text-white" strokeWidth={3} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3.5 pr-[52px]">
          <SchoolPin schoolName={schoolName} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-k5-vi">{schoolName ? `${schoolName} app` : "School app"}</span>
            <DialogTitle className="m-0 font-k5-display text-[28px] font-semibold leading-[1.1]">Stay connected with our app!</DialogTitle>
            <DialogDescription className="m-0 flex flex-wrap items-center gap-2 text-base font-extrabold text-k5-mut">
              <span>Everything for school, right on your phone.</span>
              <DancingPhone />
            </DialogDescription>
          </div>
        </div>

        <ul aria-label="What you get" className="m-0 flex list-none flex-wrap gap-2 p-0">
          {FEATURES.map(([Icon, label, bg, ink]) => (
            <li key={label} className={"flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 " + bg}>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-k5-card">
                <Icon className={"h-[18px] w-[18px] " + ink} strokeWidth={2.3} aria-hidden="true" />
              </span>
              <span className="text-sm font-black text-k5-ink">{label}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-3.5 pb-2">
          {STORES.map((store) => (
            <StoreCard key={store.key} store={store} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-[20px] bg-k5-act px-4 py-3.5 max-[760px]:hidden">
          <div className="flex flex-[1_1_220px] flex-col gap-3">
            <span className="font-k5-display text-xl font-semibold">Easy as 1, 2, 3</span>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-center gap-2.5">
                  <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-k5-ac font-k5-display text-[15px] font-semibold text-white">{i + 1}</span>
                  <span className="text-[15px] font-extrabold leading-tight text-k5-ink">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <StepsDemo />
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={locked}
          className="min-h-[52px] cursor-pointer self-end justify-self-end rounded-full border-none bg-[#FFC531] px-7 font-k5-display text-[19px] font-semibold text-[#1C2640] shadow-[0_5px_0_#C9930A] disabled:cursor-default disabled:opacity-60"
        >
          {locked ? `Close (${left}s)` : "All done"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
