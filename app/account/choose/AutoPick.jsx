"use client";

import { useEffect } from "react";

/**
 * Picks the account for the page without asking (SMS plan section 27: a seamless experience with several
 * users in one browser). A full page load (refresh, a hard redirect, coming back from a payment gateway)
 * cannot say which user its tab works for, so proxy.js sends it here; this tab remembers its user in
 * sessionStorage (components/auth/TabAccount.jsx), so that user is picked. A tab with no user of its own
 * (a link opened in a new tab) gets the user who signed in most recently. The list is shown only when
 * script cannot run.
 */
export function AutoPick({ accounts, pickUrlBase }) {
  const nobody = accounts.length === 0;

  useEffect(() => {
    if (accounts.length === 0) return;
    let tabAccount = null;
    try {
      tabAccount = window.sessionStorage.getItem("isx-account");
    } catch {
      tabAccount = null;
    }
    const known = accounts.find((a) => a.account === tabAccount);
    const newest = [...accounts].sort((a, b) => (b.signedInAt || 0) - (a.signedInAt || 0))[0];
    const chosen = known || newest;
    try {
      window.sessionStorage.setItem("isx-account", chosen.account);
    } catch {
      // the pick still applies to this page load
    }
    window.location.replace(`${pickUrlBase}&account=${encodeURIComponent(chosen.account)}`);
  }, [accounts, pickUrlBase]);

  if (nobody) {
    return <p className="text-sm text-slate-600">Your sign-in has ended. Please log in again.</p>;
  }
  return (
    <div className="flex items-center justify-center py-10" aria-busy="true" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
