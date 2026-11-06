"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, KeyRound, LogOut, Menu, MoreVertical, Palette, Smartphone, User } from "lucide-react";
import toast from "react-hot-toast";
import { AppDownloadDialog } from "@/components/k5/AppDownloadDialog";
import { LogoutConfirmDialog } from "@/components/student-enroll/wizard/LogoutConfirmDialog";
import { logoutEverywhere } from "@/utils/logout";

/**
 * Grade K–5 header (Playful.dc.html): menu button, school logo, LMS switch and the
 * "Welcome back" chip with the profile menu, plus the Appearance (palette) button that opens
 * "Make it yours!". Same actions as DashboardTopHeader — LMS, My Profile and Change Password
 * are still "coming soon"; Log out is live. "Get the App" opens the store links (constant/appLinks.js).
 */
export function K5Header({ schoolName, logoUrl, session, userName, navOpen, onMenu, onAppearance }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const [lms, setLms] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = userName || "Student";
  const firstName = displayName.split(" ")[0];

  return (
    <header className="sticky top-[var(--maintenance-banner-h,0px)] z-30 border-b-4 border-k5-line bg-k5-card">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-5 py-2.5 max-[760px]:flex-nowrap max-[760px]:px-3">
        <button
          type="button"
          aria-label="Menu"
          aria-controls="k5-sidenav"
          aria-expanded={navOpen}
          onClick={onMenu}
          className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl border-[3px] border-k5-line bg-k5-card text-k5-ac"
        >
          <Menu className="h-6 w-6" strokeWidth={2.8} aria-hidden="true" />
        </button>

        {logoUrl ? (
          <Image src={logoUrl} alt={schoolName || ""} width={220} height={44} className="h-11 w-auto max-w-[220px] object-contain max-[760px]:h-9 max-[760px]:max-w-[170px]" unoptimized />
        ) : (
          <span className="flex flex-col">
            <span className="font-k5-display text-[22px] font-semibold leading-tight text-k5-brand">{schoolName}</span>
            <span className="text-xs font-extrabold text-k5-gx max-[760px]:hidden">Your Location. Your School. Your Time.</span>
          </span>
        )}

        <div className="flex-[1_1_20px]" />

        <button
          type="button"
          onClick={onAppearance}
          aria-haspopup="dialog"
          aria-label="Appearance"
          title="Appearance"
          data-pin="look"
          className="flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card p-0 shadow-k5-btn max-[760px]:hidden"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z" fill="#FFC531" stroke="#A16207" strokeWidth="1.6" />
            <circle cx="7.5" cy="11" r="1.6" fill="#C92F6E" />
            <circle cx="10.5" cy="7" r="1.6" fill="#1E66E0" />
            <circle cx="15" cy="7.5" r="1.6" fill="#1F7A3A" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setAppOpen(true)}
          aria-haspopup="dialog"
          className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-ac bg-k5-card py-0 pl-3 pr-[18px] font-k5-display text-[17px] font-semibold text-k5-acx shadow-[0_4px_0_var(--k5-acl)] max-[760px]:hidden"
        >
          <Smartphone className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
          Get the App
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={lms}
          onClick={() => {
            setLms((v) => !v);
            toast("LMS — coming soon", { icon: "🚧" });
          }}
          className="flex min-h-12 items-center gap-2.5 rounded-full border-[3px] border-k5-line bg-k5-card py-0 pl-2 pr-4 text-[15px] font-black text-k5-mut max-[760px]:hidden"
        >
          <span className={`relative block h-7 w-12 rounded-full transition-colors ${lms ? "bg-k5-ac" : "bg-k5-line"}`}>
            <span className={`absolute top-[3px] block h-[22px] w-[22px] rounded-full bg-white transition-transform ${lms ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
          </span>
          LMS
        </button>


        {/* Below 760px the palette, LMS and the welcome chip move into the More menu (mockup .hd-more). */}
        <div className="relative max-[760px]:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex min-h-14 items-center gap-2.5 rounded-full border-[3px] border-k5-yb bg-k5-yt py-1 pl-1 pr-4 text-left"
          >
            <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-k5-hi font-k5-display text-[22px] font-bold text-[#1C2640]">
              {firstName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden flex-col sm:flex">
              <span className="text-[13px] font-extrabold text-k5-yx">Welcome back,</span>
              <span className="font-k5-display text-xl font-semibold leading-none text-k5-ink">{firstName}!</span>
            </span>
            <ChevronDown className="h-[18px] w-[18px] text-k5-ink" strokeWidth={2.6} aria-hidden="true" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-[22px] border-[3px] border-k5-line bg-k5-card shadow-k5-chunky">
                <div className="flex items-center gap-2 bg-k5-ac px-4 py-3 text-white">
                  <User className="h-5 w-5" aria-hidden="true" />
                  <span className="font-k5-display text-base font-semibold">{displayName}</span>
                </div>
                <MenuItem
                  Icon={User}
                  label="My Profile"
                  onClick={() => {
                    setMenuOpen(false);
                    toast("My Profile — coming soon", { icon: "🚧" });
                  }}
                />
                <MenuItem
                  Icon={KeyRound}
                  label="Change Password"
                  onClick={() => {
                    setMenuOpen(false);
                    toast("Change Password — coming soon", { icon: "🚧" });
                  }}
                />
                <MenuItem
                  Icon={LogOut}
                  label="Log out"
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmLogout(true);
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Mobile (mockup .hd-more): one "More" button holding profile, look and log out. */}
        <div className="relative hidden max-[760px]:flex">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            aria-label="More options"
            className="flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-2xl border-[3px] border-k5-line bg-k5-card text-k5-ink"
          >
            <MoreVertical className="h-6 w-6" strokeWidth={2.8} aria-hidden="true" />
          </button>
          {moreOpen && (
            <>
              <button type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)} className="fixed inset-0 z-[54] cursor-pointer border-none bg-[rgba(10,16,34,0.25)] p-0" />
              <div
                role="menu"
                className="absolute end-0 top-[60px] z-[55] flex w-[250px] flex-col gap-0.5 rounded-[22px] border-[3px] border-k5-ink bg-k5-card p-2 shadow-[0_6px_0_var(--k5-ink)]"
              >
                <MoreItem
                  icon={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFC531] font-k5-display text-xl font-bold text-[#1C2640]">{firstName.charAt(0).toUpperCase()}</span>}
                  onClick={() => {
                    setMoreOpen(false);
                    toast("My Profile — coming soon", { icon: "🚧" });
                  }}
                >
                  <span className="flex flex-col leading-tight">
                    <span>{firstName}</span>
                    <span className="text-[13px] font-extrabold text-k5-mut">My profile</span>
                  </span>
                </MoreItem>
                <MoreItem
                  icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-k5-yt">
                      <Palette className="h-5 w-5 text-k5-yi" aria-hidden="true" />
                    </span>
                  }
                  onClick={() => {
                    setMoreOpen(false);
                    onAppearance();
                  }}
                >
                  Theme &amp; look
                </MoreItem>
                <MoreItem
                  icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-k5-act">
                      <Smartphone className="h-5 w-5 text-k5-acx" aria-hidden="true" />
                    </span>
                  }
                  onClick={() => {
                    setMoreOpen(false);
                    setAppOpen(true);
                  }}
                >
                  Get the App
                </MoreItem>
                <span aria-hidden="true" className="mx-1.5 my-1 block h-0.5 bg-k5-line" />
                <MoreItem
                  danger
                  icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-k5-rt">
                      <LogOut className="h-5 w-5" aria-hidden="true" />
                    </span>
                  }
                  onClick={() => {
                    setMoreOpen(false);
                    setConfirmLogout(true);
                  }}
                >
                  Log out
                </MoreItem>
              </div>
            </>
          )}
        </div>
      </div>

      <AppDownloadDialog open={appOpen} schoolName={schoolName} onClose={() => setAppOpen(false)} />

      <LogoutConfirmDialog
        open={confirmLogout}
        busy={loggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setLoggingOut(true);
          try {
            await logoutEverywhere(session);
          } finally {
            setLoggingOut(false);
            setConfirmLogout(false);
          }
        }}
      />
    </header>
  );
}

function MoreItem({ icon, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-[14px] border-none bg-transparent px-2.5 py-1.5 text-start text-[17px] font-black hover:bg-k5-soft ${
        danger ? "text-k5-ri" : "text-k5-ink"
      }`}
    >
      <span className="flex-none">{icon}</span>
      {children}
    </button>
  );
}

function MenuItem({ Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-[15px] font-extrabold ${
        danger ? "border-t-[3px] border-k5-line text-k5-red hover:bg-k5-rt" : "text-k5-ink hover:bg-k5-soft"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      {label}
    </button>
  );
}
