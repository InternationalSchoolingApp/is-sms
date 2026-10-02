"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IoIosLogOut } from "react-icons/io";

/** Logout confirmation styled to match the enrollment information dialogs. */
export function LogoutConfirmDialog({ open, busy, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden rounded-lg p-0 text-slate-800 shadow-2xl sm:max-w-lg">
        <div className="flex items-center justify-end px-4 pt-4 sm:px-5">
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close" className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white transition hover:bg-rose-600 disabled:opacity-50">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="w-[70px] h-[70px] rounded-full bg-primary text-white flex mx-auto items-center justify-center">
          <IoIosLogOut className="text-5xl mx-atuo"/>
        </div>
        <DialogTitle className="px-5 pb-6 pt-1 text-center text-lg font-normal leading-7 text-black sm:px-8">
          Are you sure you want to log out?
        </DialogTitle>
        <div className="flex justify-center gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <Button type="button" onClick={onConfirm} disabled={busy} className="rounded-lg bg-primary text-base text-white hover:bg-sky-600">{busy ? "Logging out…" : "Yes"}</Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy} className="rounded-lg border-slate-300 bg-white text-base  text-dark">No</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
