"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cancelStudentClass } from "@/services/bookClassApi";

const LATE_CONFIRM = "LATE_CANCEL_CONFIRM";

/** A student cancels an upcoming 1:1 class with a reason; after the cut-off they must confirm the class will not be given back. */
export function CancelClassButton({ row, className = "" }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [lateMessage, setLateMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cancellableType = !row?.meetingType || ["STUDENT_DOUBT_SESSION", "PTM", "CUSTOM"].includes(String(row.meetingType).toUpperCase());
  const result = String(row?.meetingResult ?? "").trim();
  const noResultYet = result === "" || result.toUpperCase() === "N/A";
  if (!row?.meetingId || !noResultYet || !cancellableType || row.canCancel === false) return null;
  const late = row.cancelInsideCutoff === true;

  const close = () => {
    setOpen(false);
    setReason("");
    setLateMessage("");
    setError("");
  };


  const submit = async (confirmLate) => {
    if (!reason.trim()) {
      setError("Please enter the reason for cancelling the class.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await cancelStudentClass({ meetingId: row.meetingId, reason: reason.trim(), confirmLate });
    setBusy(false);
    if (!res) {
      setError("The class could not be cancelled. Please try again.");
      return;
    }
    if (res.code === LATE_CONFIRM) {
      setLateMessage(res.message);
      return;
    }
    if (res.status !== "1") {
      setError(res.message || "The class could not be cancelled.");
      return;
    }
    toast.success(res.message);
    close();
    queryClient.invalidateQueries({ queryKey: ["booked-classes"] });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (late) setLateMessage("Cancelling now will not return the class.");
          setOpen(true);
        }}
        className={
          late
            ? `mt-1 block cursor-pointer rounded border border-slate-400 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 ${className}`
            : `mt-1 block cursor-pointer rounded border border-red-600 bg-white px-2 py-0.5 text-xs font-bold text-red-700 hover:bg-red-600 hover:text-white ${className}`
        }
      >
        Cancel class
      </button>
      {late && <span className="mt-0.5 block text-[11px] font-semibold text-slate-600">Cancelling now will not return the class</span>}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel class</DialogTitle>
            <DialogDescription>
              {row.subjectName} · {row.meetingJoinDate} {row.startTime}
              {row.timezone ? ` (${row.timezone})` : ""}
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm font-bold text-black">
            Reason for cancelling
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal text-black"
            />
          </label>
          {lateMessage && <p className="rounded-lg bg-amber-100 p-3 text-sm font-bold text-black">{lateMessage}</p>}
          {error && <p className="text-sm font-bold text-red-700">{error}</p>}
          <DialogFooter>
            <button type="button" onClick={close} disabled={busy} className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-black">
              Keep class
            </button>
            <button
              type="button"
              onClick={() => submit(!!lateMessage)}
              disabled={busy}
              className="cursor-pointer rounded-lg border-none bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "Cancelling…" : lateMessage ? "Cancel anyway" : "Cancel class"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
