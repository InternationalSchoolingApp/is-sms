"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { LogoutConfirmDialog } from "@/components/student-enroll/wizard/LogoutConfirmDialog";
import { ChangePasswordModal } from "@/components/dashboard/ChangePasswordModal";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";
import { useAddSiblings } from "@/hooks/useAddSiblings";
import { normalizeWebsite } from "@/constant/SchoolConstants";
import { openLmsLink } from "@/utils/lmsCourseLink";
import { logoutEverywhere } from "@/utils/logout";

/**
 * The parent header in the parent theme (design board .hd): burger (not while choosing a child), the school logo, the
 * LMS switch (only when the parent has an LMS user), the child dropdown, and "Welcome back" with the profile menu
 * (Profile, Change Password, Add More Siblings, Log out). Same actions as before; only the look changed.
 */
export function ParentHeader({
  schoolName,
  logoUrl,
  schoolWebsite,
  session,
  userName,
  choosing,
  menuOpen,
  onBurger,
  lmsProviderURL,
  isPayLmsPaymentPending,
}) {
  const router = useRouter();
  const siblings = useAddSiblings();
  const [menuShown, setMenuShown] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = userName || "Parent";
  const initial = (String(displayName).trim()[0] || "P").toUpperCase();
  const site = normalizeWebsite(schoolWebsite);

  const openProfile = () => {
    if (session?.schoolUUID)
      router.push(`/${session.schoolUUID}/parent/my-profile`);
    else toast("My Profile - coming soon", { icon: "🚧" });
  };

  const logo = logoUrl ? (
    <Image
      src={logoUrl}
      alt={schoolName || ""}
      width={170}
      height={38}
      className="block h-[clamp(26px,4.2vw,38px)] w-auto max-w-[180px] object-contain"
      unoptimized
    />
  ) : (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#027ffe] text-xs font-bold text-white">
        IS
      </span>
      <span className="hidden text-sm font-bold sm:inline">{schoolName}</span>
    </span>
  );

  const items = [
    { label: "Profile", onSelect: openProfile },
    { label: "Change Password", onSelect: () => setChangePwOpen(true) },
    siblings.visible && {
      label: siblings.label,
      onSelect: siblings.handleClick,
      disabled: siblings.busy,
    },
  ].filter(Boolean);

  return (
    <>
      <header
        className="hd"
        style={{ top: "var(--maintenance-banner-h, 0px)" }}
      >
        <div className="hd-in">
          {!choosing && (
            <button
              className="burger"
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="parent-side"
              onClick={onBurger}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          )}
          {site ? (
            <a
              className="logo"
              href={site}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${schoolName || "School"} website`}
              title={site}
            >
              {logo}
            </a>
          ) : (
            <span className="logo">{logo}</span>
          )}

          <div className="hd-r">
            {lmsProviderURL && (
              <button
                className="lms"
                type="button"
                role="switch"
                aria-checked="false"
                aria-label="Switch to LMS"
                onClick={() =>
                  isPayLmsPaymentPending
                    ? toast(isPayLmsPaymentPending, { icon: "⚠️" })
                    : openLmsLink(lmsProviderURL)
                }
              >
                <span className="knob" />
                LMS
              </button>
            )}
            {!choosing && <ChildSwitcher />}
            <span className="sep" aria-hidden="true" />
            <div className="relative">
              <button
                className="me-btn cursor-pointer border-0 bg-transparent hover:bg-[#f4f6fa]"
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuShown}
                onClick={() => setMenuShown((v) => !v)}
              >
                <span className="me-av">{initial}</span>
                <svg
                  className={`hidden h-3.5 w-3.5 text-[#6b7280] transition-transform sm:block ${menuShown ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
                <span className="me-txt max-sm:hidden">
                  <small>Welcome back,</small>
                  <b className="whitespace-nowrap">{displayName}</b>
                </span>
              </button>
              {menuShown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setMenuShown(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2.5 min-w-[220px] rounded-xl border border-[#ecedf2] bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(10,35,80,.25)]"
                  >
                    {items.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        role="menuitem"
                        disabled={item.disabled}
                        onClick={() => {
                          setMenuShown(false);
                          item.onSelect();
                        }}
                        className="block w-full cursor-pointer rounded-lg border-0 bg-transparent px-3 py-[9px] text-left text-[13px] text-[#1b2130] hover:bg-[#e6f2ff] hover:text-[#0057b8] disabled:opacity-60"
                      >
                        {item.label}
                      </button>
                    ))}
                    <hr className="mx-1 my-1.5 border-0 border-t border-[#ecedf2]" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuShown(false);
                        setConfirmLogout(true);
                      }}
                      className="block w-full cursor-pointer rounded-lg border-0 bg-transparent px-3 py-[9px] text-left text-[13px] text-[#1b2130] hover:bg-[#e6f2ff] hover:text-[#0057b8]"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {changePwOpen && (
        <ChangePasswordModal onClose={() => setChangePwOpen(false)} />
      )}
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
    </>
  );
}
