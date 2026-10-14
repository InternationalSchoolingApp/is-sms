"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Mirrors flaggedModalContent() in signupCommon.js — shown when the
 * enrollment/stage-1 response has statusCode "FLAGGED" (seats full /
 * "Red Flag" lead match, confirmed at source in SignupStudentUtil.java).
 */
export function FlaggedSeatsModal({ open, onOpenChange, schoolName, sessionName }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle>Information</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Thank you for your interest in {schoolName}.
          <br />
          Seats for the Academic Year {sessionName} are currently full. We have saved your details, and if any
          seat becomes available due to a cancellation or withdrawal, we will reach out to you right away.
        </p>
        <Button className="mx-auto mt-2" onClick={() => onOpenChange(false)}>
          OK
        </Button>
      </DialogContent>
    </Dialog>
  );
}
