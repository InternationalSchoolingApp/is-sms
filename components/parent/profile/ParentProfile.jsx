"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
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

  const withdrawal = view === "withdrawal";

  return (
    <section className="sch on" aria-label="My profile">
      <div className="sc-hero">
        <div>
          <h2>{withdrawal ? "Withdrawal Request" : "My Profile"}</h2>
          <p>{withdrawal ? "Request a withdrawal for your child." : "Your own details, kept up to date."}</p>
        </div>
        {!withdrawal && (
          <button type="button" onClick={() => setAppOpen(true)} className="inline-flex h-[42px] items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[var(--brand)] shadow-sm hover:bg-white/90">
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Get App
          </button>
        )}
      </div>

      {withdrawal ? <ParentWithdrawal onBack={() => setView("profile")} /> : <ParentProfileDetails onWithdrawal={() => setView("withdrawal")} />}

      <ParentAppInstallPrompt open={appOpen} onClose={() => setAppOpen(false)} />
    </section>
  );
}
