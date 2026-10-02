"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Req } from "@/components/common/Req";
import { validateAge, getDobPickerBounds } from "@/utils/ageValidation";

/**
 * "Change Grade & Date of Birth" — mirrors changeSelectedGrade() /
 * saveSelectedGradeAndDob() in signupStudentStage3.js: a student can revise
 * their grade (and, since the valid DOB range depends on the grade, their
 * DOB) from Step 3 without going back to Step 1. Legacy blanks the DOB the
 * moment the grade changes (its age range moved), so this does the same.
 *
 * `open`/`onOpenChange`/`busy` follow the same shape as ConfirmDialog.
 * `initialStandardId`/`initialDob` seed the fields each time the dialog
 * opens (legacy re-seeds from Step 1's live DOM on every open/close);
 * `onSave(standardId, dob)` is only called once both are valid.
 */
export function ChangeGradeDialog({ open, onOpenChange, grades, courseProviderId, initialStandardId, initialDob, busy, onSave }) {
  const [standardId, setStandardId] = useState(initialStandardId || "");
  const [dob, setDob] = useState(initialDob || null);
  const [error, setError] = useState({});

  useEffect(() => {
    if (!open) return;
    setStandardId(initialStandardId || "");
    setDob(initialDob || null);
    setError({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dobBounds = getDobPickerBounds(courseProviderId);

  function handleGradeChange(value) {
    setStandardId(value);
    setDob(null); // legacy: age range depends on grade, so a stale DOB can't carry over
    setError((prev) => ({ ...prev, dob: undefined }));
  }

  function handleSave() {
    const nextError = {};
    if (!standardId) nextError.standardId = "Grade is required";
    const dobError = !standardId ? undefined : validateAge(dob, courseProviderId);
    if (dobError) nextError.dob = dobError;
    setError(nextError);
    if (nextError.standardId || nextError.dob) return;
    onSave(standardId, dob);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
            <RefreshCw className="h-6 w-6" />
          </span>
          <DialogTitle className="text-lg">Change Grade &amp; Date of Birth</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FloatingLabelSelect
            label={<Req label="Grade" required />}
            value={standardId}
            onValueChange={handleGradeChange}
            options={grades || []}
            error={error.standardId}
            searchable
          />
          <DatePicker
            label={<Req label={
              <>Date of Birth{" "} <span className="text-black text-[10px]">(Month Day, Year)</span></>
            } required />}
            value={dob}
            onChange={(v) => setDob(v)}
            fromDate={dobBounds.fromDate}
            toDate={dobBounds.toDate}
            error={error.dob}
          />
          
        </div>
        
        <DialogFooter className="flex flex-row justify-center">
          <div className="inline-flex gap-2 mx-auto">
            <Button type="button" className="w-fit" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" className="w-fit" onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
