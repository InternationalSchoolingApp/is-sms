"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * Logout confirmation: a white rounded card with the ghost mascot popping out of its top edge, the
 * question and a short explanation, then Yes / No side by side. The card is not clipped (no overflow
 * hidden) so the mascot can sit half outside it; the dialog can only be closed with No or by clicking
 * outside, there is no close button.
 */
export function LogoutConfirmDialog({ open, busy, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 max-w-[calc(100%-3rem)] rounded-3xl bg-white px-4 pb-4 pt-10 text-center text-slate-800 shadow-2xl ring-0 sm:max-w-[360px] sm:px-5 sm:pb-6 sm:pt-12"
      >
        <Image
          src="/images/logout_ghost.png"
          alt=""
          width={435}
          height={510}
          priority
          className="pointer-events-none absolute -top-9 left-1/2 h-[80px] w-auto sm:-top-14 sm:h-[104px] -translate-x-1/2"
        />
        <DialogTitle className="text-base font-extrabold leading-snug text-black sm:text-lg">
          Are you sure you want to Log off?
        </DialogTitle>
        <DialogDescription className="mx-auto mt-1.5 max-w-[16rem] text-xs leading-relaxed text-black-800 sm:mt-2 sm:max-w-[17rem] sm:text-sm">
          You will be signed out of your account and redirected to the login page.
        </DialogDescription>
        <div className="mt-4 flex justify-center gap-2.5 sm:mt-5 sm:gap-3">
          <Button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-8 min-w-[64px] cursor-pointer rounded-xl bg-primary px-4 text-sm sm:h-9 sm:min-w-[72px] sm:px-5 font-semibold text-white hover:bg-primary/90"
          >
            {busy ? "Logging out…" : "Yes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
            className="h-8 min-w-[64px] cursor-pointer rounded-xl border-slate-200 bg-slate-100 px-4 text-sm sm:h-9 sm:min-w-[72px] sm:px-5 font-semibold text-slate-800 hover:bg-slate-200"
          >
            No
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
