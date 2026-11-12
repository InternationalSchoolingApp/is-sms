"use client";

import { useState } from "react";
import { Smartphone, UserRound } from "lucide-react";
import { ParentAppInstallPrompt } from "@/components/parent/profile/ParentAppInstallPrompt";
import { ParentProfileDetails } from "@/components/parent/profile/ParentProfileDetails";
import { ParentWithdrawal } from "@/components/parent/profile/ParentWithdrawal";

/**
 * Parent "My Profile" (header link, route /parent/my-profile; legacy callInneraction('1a') > adminProfileContent.js): the
 * signed-in parent's own details, with the Withdrawal Request section (it replaces the profile card until "Back", as
 * legacy) and the app-install prompt. This page is about the parent, not a child, so it does not need a selected child.
 */
export function ParentProfile() {
  const [view, setView] = useState("profile"); // profile | withdrawal
  const [appOpen, setAppOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-lg font-bold text-black sm:text-xl">{view === "withdrawal" ? "Withdrawal Request" : "Profile"}</h1>
        </div>
        {view === "profile" && (
          <button type="button" onClick={() => setAppOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary/5">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Get App
          </button>
        )}
      </div>

      {view === "withdrawal" ? <ParentWithdrawal onBack={() => setView("profile")} /> : <ParentProfileDetails onWithdrawal={() => setView("withdrawal")} />}

      <ParentAppInstallPrompt open={appOpen} onClose={() => setAppOpen(false)} />
    </div>
  );
}
