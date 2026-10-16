"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, LogOut, ChevronDown, User, KeyRound, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { LogoutConfirmDialog } from "@/components/student-enroll/wizard/LogoutConfirmDialog";
import { logoutEverywhere } from "@/utils/logout";

/**
 * Fixed top header — mirrors the legacy Java Dashboard.jsp top bar:
 * hamburger (toggles sidebar) + logo, an LMS switch, "Add More Siblings",
 * and a profile dropdown (My Profile / Change Password / Log out).
 *
 * LMS switch, Add More Siblings, My Profile and Change Password are
 * data/route-driven in the legacy app; they are rendered to match the
 * reference and wired as "coming soon" toasts until their target pages/SSO are
 * built (profile/change-password = Phase C; LMS = LMS SSO). Log out is live.
 */
export function DashboardTopHeader({ schoolName, logoUrl, session, userName, onHamburger }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lms, setLms] = useState(false);

  const displayName = userName || "Student";

  return (
    <header className="fixed inset-x-0 top-[var(--maintenance-banner-h,0px)] z-50 flex h-[56px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
      {/* Left: hamburger + logo */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={onHamburger}
          className="rounded-md p-1.5 text-black hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        {logoUrl ? (
          <Image src={logoUrl} alt={schoolName || ""} width={170} height={34} className="h-8 w-auto max-w-[140px] sm:max-w-[200px] object-contain" unoptimized />
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">IS</div>
            <span className="hidden text-sm font-bold text-black sm:inline">{schoolName || "International Schooling"}</span>
          </div>
        )}
      </div>

      {/* Center: LMS switch */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-black">LMS</span>
        <button
          type="button"
          role="switch"
          aria-checked={lms}
          aria-label="Switch to LMS"
          onClick={() => {
            setLms((v) => !v);
            toast("LMS — coming soon", { icon: "🚧" });
          }}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${lms ? "bg-primary" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${lms ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Right: Add More Siblings + profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => toast("Add More Siblings — coming soon", { icon: "🚧" })}
          className="hidden items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 sm:inline-flex"
        >
          <UserPlus className="h-4 w-4" /> Add More Siblings
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-black">
              <User className="h-5 w-5" />
            </span>
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-[11px] text-black/60">Welcome back,</span>
              <span className="block text-sm font-bold text-black">{displayName}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-black" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="bg-primary px-4 py-3 text-white">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                      <User className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-bold">{displayName}</span>
                  </div>
                </div>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); toast("My Profile — coming soon", { icon: "🚧" }); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-black hover:bg-slate-100">
                  <User className="h-4 w-4" /> My Profile
                </button>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); toast("Change Password — coming soon", { icon: "🚧" }); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-black hover:bg-slate-100">
                  <KeyRound className="h-4 w-4" /> Change Password
                </button>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setConfirmLogout(true); }}
                  className="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

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
