"use client";

import { useState } from "react";
import { openLmsLink } from "@/utils/lmsCourseLink";
import { normalizeWebsite } from "@/constant/SchoolConstants";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, LogOut, ChevronDown, User, KeyRound, UserPlus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { LogoutConfirmDialog } from "@/components/student-enroll/wizard/LogoutConfirmDialog";
import { logoutEverywhere } from "@/utils/logout";
import { ChangePasswordModal } from "@/components/dashboard/ChangePasswordModal";
import { useAddSiblings } from "@/hooks/useAddSiblings";
import { CartHeaderButton } from "@/components/student/cart/CartHeaderButton";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";

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
export function DashboardTopHeader({ schoolName, logoUrl, schoolWebsite, session, userName, onHamburger, hideMenuButton = false, choosingChild = false, lmsProviderURL, isPayLmsPaymentPending }) {
  const router = useRouter();
  const siblings = useAddSiblings();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const role = String(session?.role ?? session?.userRole ?? "").toLowerCase();
  const isParent = role === "parent";
  // My Profile is the signed-in user's own page: student/my-profile, or parent/my-profile (built with the
  // parent profile module; until then the parent catch-all placeholder shows).
  const openProfile = () => {
    if ((role === "student" || isParent) && session?.schoolUUID) router.push(`/${session.schoolUUID}/${role}/my-profile`);
    else toast("My Profile — coming soon", { icon: "🚧" });
  };
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [lms, setLms] = useState(false);

  const displayName = userName || (isParent ? "Parent" : "Student");
  // Parent theme (design: Parents-Dashboard-Web): the parent's initial on a blue avatar, a pill LMS switch, a plain menu.
  const parentInitial = (String(displayName).trim()[0] || "P").toUpperCase();

  return (
    <header
      className={`fixed inset-x-0 top-[var(--maintenance-banner-h,0px)] z-50 flex h-[56px] items-center justify-between gap-3 border-b px-3 sm:px-5 ${
        isParent ? "border-[#e3e7ed] bg-white" : "border-slate-200 bg-white"
      }`}
    >
      {/* Left: hamburger + logo */}
      <div className="flex min-w-0 items-center gap-2">
        {!hideMenuButton && (
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={onHamburger}
            className="rounded-md p-1.5 text-black hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {/* Legacy header: the logo opens the school's website in a new tab (schoolSettingsLinks.schoolWebsite). */}
        {(() => {
          const logo = logoUrl ? (
            <Image src={logoUrl} alt={schoolName || ""} width={170} height={34} className="h-8 w-auto max-w-[140px] sm:max-w-[200px] object-contain" unoptimized />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">IS</div>
              <span className="hidden text-sm font-bold text-black sm:inline">{schoolName}</span>
            </div>
          );
          const site = normalizeWebsite(schoolWebsite);
          return site ? (
            <a href={site} target="_blank" rel="noopener noreferrer" aria-label={`${schoolName || "School"} website`} title={site} className="flex flex-none items-center no-underline">
              {logo}
            </a>
          ) : (
            logo
          );
        })()}
      </div>

      {/* Center: the LMS switch; on the parent dashboard the page title, with the LMS switch only when the parent has an LMS user */}
      <div className="flex min-w-0 items-center gap-3">
      {/* On the child picker the banner carries the title (parent design), so the header leaves it out. */}
      {isParent && !choosingChild && <h1 className="truncate text-base font-extrabold text-primary sm:text-2xl">Parent Dashboard</h1>}
      {isParent && lmsProviderURL && (
        <button
          type="button"
          role="switch"
          aria-checked={lms}
          aria-label="Switch to LMS"
          onClick={() => {
            if (isPayLmsPaymentPending) {
              toast(isPayLmsPaymentPending, { icon: "⚠️" });
            } else {
              openLmsLink(lmsProviderURL);
            }
          }}
          className={`relative inline-flex h-7 w-[66px] shrink-0 items-center rounded-full border text-[10px] font-bold tracking-[.06em] transition-[background,color,border-color,padding] duration-200 sm:h-8 sm:w-[78px] sm:text-[11px] ${
            lms ? "border-[#027ffe] bg-[#027ffe] pl-2.5 pr-8 text-white sm:pl-3 sm:pr-[34px]" : "border-[#e3e7ed] bg-[#f4f6f9] pl-[30px] pr-2 text-[#5b6577] sm:pl-[34px] sm:pr-2.5"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(16,24,40,.18)] transition-[left] duration-200 sm:h-6 sm:w-6 ${lms ? "left-[calc(100%-24px)] sm:left-[calc(100%-28px)]" : "left-1"}`}
          />
          LMS
        </button>
      )}
      {!isParent && (
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-black">LMS</span>
        <button
          type="button"
          role="switch"
          aria-checked={lms}
          aria-label="Switch to LMS"
          onClick={() => {
            if (isPayLmsPaymentPending) {
              toast(isPayLmsPaymentPending, { icon: "⚠️" });
            } else if (lmsProviderURL) {
              openLmsLink(lmsProviderURL);
            }
          }}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${lms ? "bg-primary" : "bg-slate-300"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${lms ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      )}
      </div>

      {/* Right: cart + Add More Siblings + profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isParent && <ChildSwitcher />}
        <CartHeaderButton />
        {/* Student's "Add More Siblings". A parent gets its own Add Another Child button (parent dashboard Phase D). */}
        {siblings.visible && !isParent && (
          <button
            type="button"
            onClick={siblings.handleClick}
            disabled={siblings.busy}
            className="hidden items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 sm:inline-flex"
          >
            {siblings.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {siblings.label}
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={isParent ? "flex items-center gap-2.5 rounded-full p-0.5 hover:bg-[#f4f6f9] sm:py-1 sm:pl-1 sm:pr-1.5" : "flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100"}
          >
            {isParent ? (
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-[#027ffe] to-[#0057b8] text-sm font-medium text-white sm:h-[38px] sm:w-[38px] sm:text-[15px]">
                {parentInitial}
              </span>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-black">
                <User className="h-5 w-5" />
              </span>
            )}
            {isParent && <ChevronDown className={`hidden h-3.5 w-3.5 text-[#5b6577] transition-transform sm:block ${menuOpen ? "rotate-180" : ""}`} />}
            <span className={`hidden leading-tight sm:block ${isParent ? "whitespace-nowrap text-left" : "text-right"}`}>
              <span className={`block ${isParent ? "text-xs text-[#5b6577]" : "text-[11px] text-black/60"}`}>Welcome back,</span>
              <span className={`block text-sm ${isParent ? "font-medium text-[#1b2130]" : "font-bold text-black"}`}>{displayName}</span>
            </span>
            {!isParent && <ChevronDown className="h-4 w-4 text-black" />}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setMenuOpen(false)} />
              {isParent ? (
                <div role="menu" className="absolute right-0 z-50 mt-2.5 min-w-[220px] rounded-xl border border-[#e3e7ed] bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(10,35,80,.25)]">
                  {[
                    { label: "Profile", onSelect: openProfile },
                    { label: "Change Password", onSelect: () => setChangePwOpen(true) },
                    siblings.visible && { label: siblings.label, onSelect: siblings.handleClick, disabled: siblings.busy },
                  ]
                    .filter(Boolean)
                    .map((item) => (
                      <button key={item.label} type="button" role="menuitem" disabled={item.disabled} onClick={() => { setMenuOpen(false); item.onSelect(); }}
                        className="block w-full rounded-lg px-3 py-[9px] text-left text-[13px] text-[#1b2130] hover:bg-[#e6f2ff] hover:text-[#0057b8] disabled:opacity-60">
                        {item.label}
                      </button>
                    ))}
                  <hr className="mx-1 my-1.5 border-0 border-t border-[#e3e7ed]" />
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setConfirmLogout(true); }}
                    className="block w-full rounded-lg px-3 py-[9px] text-left text-[13px] text-[#1b2130] hover:bg-[#e6f2ff] hover:text-[#0057b8]">
                    Log out
                  </button>
                </div>
              ) : (
                <div role="menu" className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="bg-primary px-4 py-3 text-white">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                        <User className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-bold">{displayName}</span>
                    </div>
                  </div>
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); openProfile(); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-black hover:bg-slate-100">
                    <User className="h-4 w-4" /> My Profile
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setChangePwOpen(true); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-black hover:bg-slate-100">
                    <KeyRound className="h-4 w-4" /> Change Password
                  </button>
                  {siblings.visible && (
                    <button type="button" role="menuitem" disabled={siblings.busy} onClick={() => { setMenuOpen(false); siblings.handleClick(); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-black hover:bg-slate-100 disabled:opacity-60">
                      {siblings.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} {siblings.label}
                    </button>
                  )}
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setConfirmLogout(true); }}
                    className="flex w-full items-center gap-3 border-t border-slate-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {changePwOpen && <ChangePasswordModal onClose={() => setChangePwOpen(false)} />}
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
