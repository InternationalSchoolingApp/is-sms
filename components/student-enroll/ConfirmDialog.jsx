"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Yes/No confirmation shared by the course-selection warnings (extra fee,
 * AP course, no live classes, remove all, upgrade). `request` is
 * { title, message, confirmLabel, cancelLabel } or null when closed;
 * `onResolve(true|false)` is called exactly once per request, including
 * when the dialog is dismissed.
 */
export function ConfirmDialog({ request, onResolve }) {
  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onResolve(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{request?.title || "Please confirm"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm text-slate-700">{request?.message}</div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onResolve(false)}>
            {request?.cancelLabel || "No"}
          </Button>
          <Button type="button" onClick={() => onResolve(true)}>
            {request?.confirmLabel || "I understand and agree"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
