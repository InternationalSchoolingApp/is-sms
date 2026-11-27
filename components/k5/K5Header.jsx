"use client";

import { useEffect, useRef, useState } from "react";
import { openLmsLink } from "@/utils/lmsCourseLink";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, KeyRound, Loader2, LogOut, Menu, MessageCircle, MoreVertical, Palette, ShoppingCart, Smartphone, User, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { AppDownloadDialog } from "@/components/k5/AppDownloadDialog";
import { useQuery } from "@tanstack/react-query";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getUserShortProfile } from "@/services/dashboardApi";
import { viaTier1 } from "@/utils/dashboardBootstrap";
import { useCartCount } from "@/hooks/useStudentCart";
import { useNeedHelp } from "@/hooks/useNeedHelp";
import { useAddSiblings } from "@/hooks/useAddSiblings";
import { studentNavHref } from "@/utils/dashboardNav";
import { normalizeWebsite } from "@/constant/SchoolConstants";
import { picoSay } from "@/components/k5/pico/picoEvents";
import { TOUR_GET_APP_KEY, hasPicoModuleCookie } from "@/utils/picoCookies";
import { K5LogoutDialog } from "@/components/k5/K5LogoutDialog";
import { logoutEverywhere } from "@/utils/logout";
import { InboxBadge, isInboxMenuItem } from "@/components/student/inbox/InboxBadge";
import { K5ChangePasswordModal } from "@/components/k5/panels/K5ChangePasswordModal";

/**
 * Round avatar of the welcome chip / More menu: the student's profile photo, or the first letter when there is none
 * (or the picture cannot load). Keyed by the photo address so a new photo is tried again.
 */
function HeaderAvatar({ photo, initial, className, textClass }) {
  const [broken, setBroken] = useState(false);
  if (photo && !broken) {
    // A user-uploaded S3 photo of any size: a plain <img> (same as the My Profile hero), no remote image config needed.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" onError={() => setBroken(true)} className={`${className} bg-[#FFC531] object-cover`} />;
  }
  return <span className={`flex items-center justify-center rounded-full ${className} ${textClass}`}>{initial}</span>;
}

/**
 * Grade K–5 header (Playful.dc.html): menu button, school logo, LMS switch and the
 * "Welcome back" chip with the profile menu, plus the Appearance (palette) button that opens
 * "Make it yours!". Same actions as DashboardTopHeader — LMS, My Profile and Change Password
 * are still "coming soon"; Log out is live. "Get the App" opens the store links (constant/appLinks.js).
 */
export function K5Header({ userId, schoolUUID, schoolName, logoUrl, schoolWebsite, session, userName, menu, navOpen, onMenu, onAppearance, lmsProviderURL, isPayLmsPaymentPending }) {
  // The avatar photo comes from the short profile the dashboard already reads at start-up (Tier 1, shared cache with the
  // Appearance / Add Siblings / forced-password checks): its profileImagePath is the same backend value
  // (commonUtil.profilePicture) as the full profile's photo, so the header no longer loads the whole profile on every page.
  // A new photo saved on My Profile refreshes this query (hooks/useProfileActions.js). Dummy (demo) mode keeps the sample
  // profile's photo: the short profile is the signed-in account's own.
  const dummy = useDummyStudent();
  const { model: dummyProfile } = useStudentProfile({ schoolUUID, userId, dummyOnly: true });
  const shortProfile = useQuery({
    queryKey: ["user-short-profile", schoolUUID, userId],
    queryFn: () => viaTier1(userId, "shortProfile", (a) => a.shortProfile, () => getUserShortProfile({ schoolUUID, userId })),
    staleTime: 60_000,
    enabled: Boolean(schoolUUID && userId) && dummy.settled && !dummy.enabled,
  });
  const photo = (dummy.enabled ? dummyProfile?.header?.photo : shortProfile.data?.profileImagePath) || "";
  // Grade 9–12 (Mature) look: the "Welcome back" chip of High.dc.html (blue rim on the soft accent, blue avatar, 12 / 17px 500).
  // Sizes in rem so the Mature type map (app/k5-mature.css) leaves them as the mockup has them.
  // Grade 6–8 (Balanced) has the same blue chip (Middle.dc.html: 1.5px accent rim on the soft accent, blue avatar with a white 22 / 700
  // initial, 13 / 800 and 20 / 600 ink text); only Playful keeps the yellow one. isMiddle is true for Mature too, so isHigh is checked first.
  const { isHigh, isMiddle } = useDashboardContext();
  // Legacy cartCountContent(): the cart button shows only while the cart has items, with the count as a badge.
  const { school } = useParams();
  const { data: cartCount = 0 } = useCartCount(userId);
  const cartHref = studentNavHref(school, "cart");
  const needHelp = useNeedHelp();
  // "Add More Siblings" (same hook as the home card): shows in the profile menu right under Change Password.
  const siblings = useAddSiblings();
  // The Communication (Inbox) button shows only when the student's menu has the Inbox right; its count is the menu badge's.
  const hasInbox = (menu || []).some((item) => isInboxMenuItem(item));
  const inboxHref = hasInbox ? studentNavHref(school, "inbox") : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const [lms, setLms] = useState(false);
  // The LMS switch: it flips on first, a moment later the LMS opens in a new tab, then the switch goes back off.
  const lmsTimers = useRef([]);
  useEffect(() => () => lmsTimers.current.forEach(clearTimeout), []);
  const openLms = () => {
    if (isPayLmsPaymentPending) {
      toast(isPayLmsPaymentPending, { icon: "⚠️" });
      return;
    }
    if (!lmsProviderURL || lms) return;
    setLms(true);
    lmsTimers.current.push(
      setTimeout(() => {
        openLmsLink(lmsProviderURL);
        lmsTimers.current.push(setTimeout(() => setLms(false), 700));
      }, 350),
    );
  };
  // Mockup openApp(): the dialog opens and the buddy says it too.
  const openApp = () => {
    setAppOpen(true);
    // Not when the tour has already told the student about the app ("Download our app for a better experience!").
    if (!hasPicoModuleCookie(userId, TOUR_GET_APP_KEY)) picoSay("Get the app and take me with you on your phone!", null, { above: true });
  };
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  // My Profile is the signed-in student's own page (app/[school]/(dashboard)/student/my-profile).
  const openProfile = () => {
    const role = String(session?.role ?? session?.userRole ?? "").toLowerCase();
    if (role === "student" && session?.schoolUUID) router.push(`/${session.schoolUUID}/student/my-profile`);
    else toast("My Profile — coming soon", { icon: "🚧" });
  };
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = userName || "Student";
  const firstName = displayName.split(" ")[0];

  return (
    <header className="sticky top-[var(--maintenance-banner-h,0px)] z-30 border-b-4 border-k5-line bg-k5-card">
      <div className="mx-auto flex max-w-[100%] flex-wrap items-center gap-3 px-5 py-2.5 max-[760px]:flex-nowrap max-[760px]:px-3 in-data-[hand=left]:flex-row-reverse">
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

        {/* Mobile: a spacer on each side of the logo (the other one is below) puts it in the middle of the header. */}
        <div className="hidden flex-[1_1_20px] max-[760px]:block" aria-hidden="true" />

        {/* Legacy header: the logo opens the school's website in a new tab (schoolSettingsLinks.schoolWebsite). */}
        {(() => {
          const logo = logoUrl ? (
            <Image src={logoUrl} alt={schoolName || ""} width={220} height={44} className="h-11 w-auto max-w-[220px] object-contain max-[760px]:h-9 max-[760px]:max-w-[170px]" unoptimized />
          ) : (
            <span className="flex flex-col">
              <span className="font-k5-display text-[22px] font-semibold leading-tight text-k5-brand">{schoolName}</span>
              <span className="text-xs font-extrabold text-k5-gx max-[760px]:hidden">Your Location. Your School. Your Time.</span>
            </span>
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

        <div className="flex-[1_1_20px]" />

        {inboxHref && (
          <Link
            href={inboxHref}
            title="Communication"
            aria-label="Communication"
            data-pin="inbox"
            className="k5h-hdbtn k5-button-motion relative flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card p-0 text-k5-ac no-underline shadow-k5-btn max-[760px]:hidden"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="M3.5 7.5l8.5 6 8.5-6" />
            </svg>
            <InboxBadge className="absolute -right-1.5 -top-1.5 border-2 border-k5-card px-1.5 text-xs" />
          </Link>
        )}

        <button
          type="button"
          onClick={onAppearance}
          aria-haspopup="dialog"
          aria-label="Appearance"
          title="Appearance"
          data-pin="look"
          className="k5h-hdbtn flex h-[52px] w-[52px] cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card p-0 shadow-k5-btn max-[760px]:hidden"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z" fill="#FFC531" stroke="#A16207" strokeWidth="1.6" />
            <circle cx="7.5" cy="11" r="1.6" fill="#C92F6E" />
            <circle cx="10.5" cy="7" r="1.6" fill="#1E66E0" />
            <circle cx="15" cy="7.5" r="1.6" fill="#1F7A3A" />
          </svg>
        </button>

        {needHelp && (
          <a
            href={needHelp.href}
            target="_blank"
            rel="noreferrer"
            title="Need help?"
            className="flex min-h-12 items-center gap-2 rounded-full border-[3px] border-k5-line bg-k5-card py-0 pl-3 pr-[18px] font-k5-display text-[17px] font-semibold text-[#1F7A3A] no-underline shadow-k5-btn max-[760px]:hidden"
          >
            <MessageCircle className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
            Need help?
          </a>
        )}

        {cartCount > 0 && (
          <Link
            href={cartHref}
            title="Cart"
            aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
            className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card p-0 text-k5-acx no-underline shadow-k5-btn max-[760px]:hidden"
          >
            <ShoppingCart className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
            <span className="absolute -right-1.5 -top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-k5-card bg-k5-red px-1 text-xs font-black leading-none text-white">
              {cartCount}
            </span>
          </Link>
        )}

        <button
          type="button"
          onClick={openApp}
          aria-haspopup="dialog"
          data-pin="getApp"
          className="k5h-hdbtn flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-ac bg-k5-card py-0 pl-3 pr-[18px] font-k5-display text-[17px] font-semibold text-k5-acx shadow-[0_4px_0_var(--k5-acl)] max-[760px]:hidden"
        >
          <Smartphone className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
          Get the App
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={lms}
          data-pin="lms"
          onClick={openLms}
          className="k5h-hdbtn flex min-h-12 items-center gap-2.5 rounded-full border-[3px] border-k5-line bg-k5-card py-0 pl-2 pr-4 text-[15px] font-black text-k5-mut max-[760px]:hidden"
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
            data-pin="profile"
            className={
              isHigh
                ? "flex min-h-[3rem] items-center gap-2.5 rounded-full border-[0.09375rem] border-k5-ac bg-k5-act py-1 pl-1 pr-4 text-left"
                : isMiddle
                  ? "flex min-h-14 items-center gap-2.5 rounded-full border-[3px] border-k5-ac bg-k5-act py-1 pl-1 pr-4 text-left"
                  : "flex min-h-14 items-center gap-2.5 rounded-full border-[3px] border-k5-yb bg-k5-yt py-1 pl-1 pr-4 text-left"
            }
          >
            <HeaderAvatar
              key={photo}
              photo={photo}
              initial={firstName.charAt(0).toUpperCase()}
              className="block h-[46px] w-[46px] flex-none rounded-full"
              textClass={
                isHigh
                  ? "bg-k5-ac font-k5-display text-[1.125rem] font-medium text-white"
                  : isMiddle
                    ? "bg-k5-ac font-k5-display text-[22px] font-bold text-white"
                    : "bg-k5-hi font-k5-display text-[22px] font-bold text-[#1C2640]"
              }
            />
            <span className="hidden flex-col sm:flex">
              <span className={isHigh ? "text-[0.75rem] font-medium text-k5-ink" : isMiddle ? "text-[13px] font-extrabold text-k5-ink" : "text-[13px] font-extrabold text-k5-yx"}>Welcome back,</span>
              <span className={isHigh ? "font-k5-display text-[1.0625rem] font-medium leading-none text-k5-ink" : "font-k5-display text-xl font-semibold leading-none text-k5-ink"}>{firstName}!</span>
            </span>
            <ChevronDown className={`h-[18px] w-[18px] text-k5-ink ${isHigh ? `transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}` : ""}`} strokeWidth={2.6} aria-hidden="true" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="k5-zoom-in origin-top-right in-data-[hand=left]:origin-top-left absolute right-0 in-data-[hand=left]:right-auto in-data-[hand=left]:left-0 z-50 mt-2 w-60 overflow-hidden rounded-[22px] border-[3px] border-k5-line bg-k5-card shadow-k5-chunky">
                <div className="flex items-center gap-2 bg-k5-ac px-4 py-3 text-white">
                  <User className="h-5 w-5" aria-hidden="true" />
                  <span className="font-k5-display text-base font-semibold">{displayName}</span>
                </div>
                <MenuItem
                  Icon={User}
                  label="My Profile"
                  onClick={() => {
                    setMenuOpen(false);
                    openProfile();
                  }}
                />
                <MenuItem
                  Icon={KeyRound}
                  label="Change Password"
                  onClick={() => {
                    setMenuOpen(false);
                    setChangePwOpen(true);
                  }}
                />
                {siblings.visible && (
                  <MenuItem
                    Icon={siblings.busy ? Loader2 : UserPlus}
                    spin={siblings.busy}
                    label={siblings.label}
                    disabled={siblings.busy}
                    onClick={() => {
                      setMenuOpen(false);
                      siblings.handleClick();
                    }}
                  />
                )}
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
                className="k5-zoom-in origin-top-right in-data-[hand=left]:origin-top-left absolute end-0 in-data-[hand=left]:end-auto in-data-[hand=left]:start-0 top-[60px] z-[55] flex w-[250px] flex-col gap-0.5 rounded-[22px] border-[3px] border-k5-ink bg-k5-card p-2 shadow-[0_6px_0_var(--k5-ink)]"
              >
                <MoreItem
                  icon={<HeaderAvatar key={photo} photo={photo} initial={firstName.charAt(0).toUpperCase()} className="block h-10 w-10 flex-none rounded-full" textClass="bg-[#FFC531] font-k5-display text-xl font-bold text-[#1C2640]" />}
                  onClick={() => {
                    setMoreOpen(false);
                    openProfile();
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
                {needHelp && (
                  <MoreItem
                    icon={
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-k5-act">
                        <MessageCircle className="h-5 w-5 text-k5-acx" aria-hidden="true" />
                      </span>
                    }
                    onClick={() => {
                      setMoreOpen(false);
                      window.open(needHelp.href, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Need help?
                  </MoreItem>
                )}
                {cartCount > 0 && (
                  <MoreItem
                    icon={
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-k5-act">
                        <ShoppingCart className="h-5 w-5 text-k5-acx" aria-hidden="true" />
                      </span>
                    }
                    onClick={() => {
                      setMoreOpen(false);
                      router.push(cartHref);
                    }}
                  >
                    Cart ({cartCount})
                  </MoreItem>
                )}
                <MoreItem
                  icon={
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-k5-act">
                      <Smartphone className="h-5 w-5 text-k5-acx" aria-hidden="true" />
                    </span>
                  }
                  onClick={() => {
                    setMoreOpen(false);
                    openApp();
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

      {changePwOpen && <K5ChangePasswordModal onClose={() => setChangePwOpen(false)} />}

      <K5LogoutDialog
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

function MenuItem({ Icon, label, onClick, danger = false, disabled = false, spin = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-[15px] font-extrabold disabled:opacity-60 ${
        danger ? "border-t-[3px] border-k5-line text-k5-red hover:bg-k5-rt" : "text-k5-ink hover:bg-k5-soft"
      }`}
    >
      <Icon className={`h-5 w-5 ${spin ? "animate-spin" : ""}`} aria-hidden="true" />
      {label}
    </button>
  );
}
