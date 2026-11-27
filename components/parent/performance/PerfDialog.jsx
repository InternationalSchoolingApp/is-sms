"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parentFont } from "@/components/parent/picker/parentFont";
import "@/components/parent/theme/parentDashboard.css";
import "@/components/parent/performance/performance.css";

/** A course popup in the parent theme. Dialogs render outside the page's `.pdash` root, so the content brings its own. */
export function PerfDialog({ title, onClose, wide = false, children }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto rounded-[24px] bg-white p-0 ${wide ? "sm:max-w-6xl" : "sm:max-w-4xl"}`}>
        <div className={`pdash pdash-pop ${parentFont.className}`}>
          <DialogHeader>
            <DialogTitle className="pop-title">{title}</DialogTitle>
          </DialogHeader>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
