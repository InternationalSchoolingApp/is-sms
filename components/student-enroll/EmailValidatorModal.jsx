"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Mirrors `.emailValidatorModal` from SignupCommon.jsp + callEmailCheck()'s
 * `!data.emailVerified && data.status == "1"` branch in
 * jquery.commonFunction.js: shown when is-user-available confirms the email
 * is available (statusCode "0002") but the deliverability check could not
 * verify it — the student is syntactically-valid-but-unconfirmed, not
 * "already registered" (that's InfoModal/getWelcomeBackMessage, a separate
 * flow). Legacy has no icon here; `valid-email.png` is this migration's own
 * illustration for the same confirm prompt.
 *
 * `onContinue` keeps the typed email as-is (legacy's validMailPermission(true)
 * — just marks the field valid). `onChangeEmail` mirrors
 * validMailPermission(false) ("I want to change student email"): clears
 * email/confirmEmail so the student re-enters a different address.
 */
export function EmailValidatorModal({ open, onOpenChange, email, onContinue, onChangeEmail }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Information</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-4 py-2">
          <Image
            src="/images/valid-email.png"
            alt=""
            width={120}
            height={120}
            unoptimized
            className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28"
          />
          <p className="text-sm text-slate-700 sm:text-base">
            The email <span className="font-semibold text-primary">{email}</span> appears to be invalid.
            <br />
            Do you want to continue with it?
          </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <div className="flex flex-wrap justify-center gap-3">
            <Button type="button" variant="outline" onClick={onChangeEmail}>
              I want to change student email
            </Button>
            <Button type="button" onClick={onContinue} className="bg-primary hover:bg-primary/90">
              Yes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
