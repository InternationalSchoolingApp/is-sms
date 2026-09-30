"use client";

import { Ghost } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * "Are you sure you want to Log out?" popup — #logoutSignupModal in signupStudentContent.js.
 * Yes -> onConfirm (logs out); No / dismiss -> onCancel (only closes the popup).
 */
export function LogoutConfirmDialog({ open, busy, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent showCloseButton={false} className="items-center text-center sm:max-w-md">
        <div className="mx-auto flex w-full flex-col items-center gap-4 rounded-lg border-2 border-primary px-4 pb-6 pt-2">
          <Ghost className="h-16 w-16 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <DialogTitle className="text-xl font-medium leading-snug text-primary">
            Are you sure you want to Log out?
          </DialogTitle>
          <div className="flex items-center justify-center gap-2">
            <Button type="button" onClick={onConfirm} disabled={busy} className="min-w-20">
              {busy ? "Logging out…" : "Yes"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy} className="min-w-20">
              No
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
