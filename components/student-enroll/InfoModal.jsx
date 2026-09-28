"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Generic "Information" dialog — mirrors the .emailVerify panel driven by
 * showWrapper() in signupCommon.js (welcome-back / already-registered /
 * account-deactivated / enrollment-in-progress messages). Distinct from
 * FlaggedSeatsModal, which has its own fixed "seats full" copy.
 */
export function InfoModal({ open, onOpenChange, children }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-xl">Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm text-slate-700">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Builds the message mirroring showWrapper(needToShow, msgFlag, extra1) in
 * signupCommon.js exactly: extra1 "U" is checked first regardless of
 * msgFlag, then msgFlag 0/1/else.
 */
export function getWelcomeBackMessage({ msgFlag, extra1, loginHref }) {
  if (extra1 === "U") {
    return (
      <>
        <h4 className="text-primary text-sm md:text-base lg:text-xl font-bold">Welcome back! 😊</h4>
        <p className="text-sm md:text-base lg:text-xl">
          You are an existing user.{" "}
          <a href={loginHref} className="text-primary">
            Log in
          </a>{" "}
          to Continue.
        </p>
      </>
    );
  }
  if (msgFlag === 0) {
    return (
      <>
        <h4 className="text-primary text-sm md:text-base lg:text-xl font-bold">Welcome back! 😊</h4>
        <p>
          <a href={loginHref} className="text-primary">
            Log in
          </a>{" "}
          to Continue Your Studies.
        </p>
      </>
    );
  }
  if (msgFlag === 1) {
    return <p>Your account is deactivated.</p>;
  }
  return (
    <>
      <h4 className="text-primary text-sm md:text-base lg:text-xl font-bold">Welcome back! 😊</h4>
      <p>
        Your enrollment is almost complete{" "}
        <a href={loginHref} className="text-primary">
          Log in
        </a>{" "}
        to complete it today.
      </p>
    </>
  );
}
