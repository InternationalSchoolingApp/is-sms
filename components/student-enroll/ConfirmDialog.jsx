"use client";

import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Yes/No confirmation shared by the course-selection warnings (extra fee,
 * AP course, no live classes, remove all, upgrade). `request` is
 * { title, message, confirmLabel, cancelLabel } or null when closed;
 * `onResolve(true|false)` is called exactly once per request, including
 * when the dialog is dismissed. Title/labels are still whatever the caller
 * passed (unchanged) — only the visual chrome (info icon, spacing, button
 * styling) was restyled to match the reference design.
 */
export function ConfirmDialog({ request, onResolve }) {
  debugger
  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onResolve(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-2 space-y-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Info className="h-3.5 w-3.5" />
          </span>
          <DialogTitle className="text-lg">Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-center text-sm text-slate-700">{request?.message}</div>
        <DialogFooter className="sm:justify-center">
            <div className="flex justify-center gap-3">
              <Button type="button" variant="outline" onClick={() => onResolve(false)}>
                {request?.cancelLabel || "No"}
              </Button>
              <Button type="button" onClick={() => onResolve(true)} className="rounded-md bg-primary hover:bg-primary/90">
                {request?.confirmLabel || "I understand and agree"}
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
