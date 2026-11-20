"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Mirrors flaggedModalContent() in signupCommon.js — shown when the
 * enrollment/stage-1 response has statusCode "FLAGGED" (seats full /
 * "Red Flag" lead match, confirmed at source in SignupStudentUtil.java).
 */
export function FlaggedSeatsModal({ open, onOpenChange, schoolName, sessionName }) {
  const t = useTranslations("shared.flaggedSeats");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          {t("thanks", { schoolName: schoolName ?? "" })}
          <br />
          {t("seatsFull", { sessionName: sessionName ?? "" })}
        </p>
        <Button className="mx-auto mt-2" onClick={() => onOpenChange(false)}>
          {t("ok")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
