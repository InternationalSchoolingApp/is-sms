"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowRight, Info, Loader2, Lock, LockOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getVideoSubscriptionOptions, startVideoSubscriptionCheckout } from "@/services/videoLibraryApi";
import { isVideoLibrarySuccess } from "@/hooks/useStudentVideoLibrary";
import { choosePlan, fmtDate, money, startsLaterText, pickKey, pickNeed, pickTotal, pickValid, pickedPlan, planCards } from "@/utils/videoLibrary";

const EMPTY_PICK = { planCode: "", count: 0, subjectIds: [] };

function PlanCard({ card, options, active, onPick }) {
  const plan = card.plan;
  const custom = plan.planCode === "CUSTOM";
  const only = options.courses.length === 1 ? options.courses[0].courseTitle : null;
  const name = custom ? (card.count === 1 ? "1 course" : `${card.count} courses`) : plan.name;
  const what = plan.lifetime
    ? `${only ? `${only}, until your course ends` : "All your courses, until your course ends"}${plan.untilDate ? ` (${fmtDate(plan.untilDate)})` : ""}`
    : plan.planCode === "ALL"
      ? `All ${options.courses.length} of your courses`
      : plan.planCode === "THREE_COURSES"
        ? "Choose any 3 of your courses"
        : only || `Choose ${card.count} of your courses`;

  return (
    <label
      className={`relative flex cursor-pointer flex-col gap-0.5 rounded-xl border-[1.5px] px-3.5 py-3 transition ${
        active ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50"
      }`}
    >
      <input type="radio" name="svlPlan" value={card.key} checked={active} onChange={() => onPick(card.key)} className="absolute opacity-0" />
      <span className="text-sm font-extrabold text-slate-800">{name}</span>
      <span className="text-lg font-extrabold text-primary">
        ${custom ? money((Number(plan.fee) || 0) * card.count) : money(plan.fee)}{" "}
        <small className="text-[11px] font-semibold text-slate-400">
          {custom ? `/ month${card.count > 1 ? ` · $${money(plan.fee)} per course` : ""}` : plan.lifetime ? "one-time" : "/ month"}
        </small>
      </span>
      <span className="text-xs text-slate-500">{what}</span>
    </label>
  );
}

/**
 * Subscribe to course videos — legacy svlOpenSubscribe() / renderStudentSubscribeBody / Footer: the plans
 * for the student's grade, the course choice, a live total (the server prices it), then
 * student/subscription/checkout and `onCheckout(userPaymentDetailsId)` (the shared gateway chooser).
 * Mounted while open.
 */
export function SubscribeModal({ onClose, onCheckout }) {
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");
  const [pick, setPick] = useState(EMPTY_PICK);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVideoSubscriptionOptions()
      .then((response) => {
        if (cancelled) return;
        if (!isVideoLibrarySuccess(response) || !response.details) {
          setError(response?.message || "Plans could not be loaded.");
          return;
        }
        const o = response.details;
        o.courses = o.courses ?? [];
        const cards = o.canBuy ? planCards(o) : [];
        setOptions(o);
        if (cards.length === 1) setPick(choosePlan(o, EMPTY_PICK, cards[0].key)); // one card only -> pick it
      })
      .catch(() => {
        if (!cancelled) setError("Plans could not be loaded. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleCourse(subjectId, on) {
    setPick((current) => ({
      ...current,
      subjectIds: on ? [...current.subjectIds, subjectId] : current.subjectIds.filter((id) => id !== subjectId),
    }));
  }

  async function checkout() {
    if (busy || !pickValid(options, pick)) return;
    setBusy(true);
    try {
      const response = await startVideoSubscriptionCheckout({ planCode: pick.planCode, subjectIds: pick.subjectIds });
      const upid = response?.details?.userPaymentDetailsId;
      if (isVideoLibrarySuccess(response) && upid) {
        onCheckout(upid);
        return;
      }
      toast.error(response?.message || "The payment could not be started.");
    } catch {
      toast.error("The payment could not be started. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const canBuy = Boolean(options?.canBuy);
  const need = canBuy ? pickNeed(options, pick) : 0;
  const plan = canBuy ? pickedPlan(options, pick) : null;
  const valid = canBuy && pickValid(options, pick);
  const startsLater = startsLaterText(options?.startsAt);

  let body;
  if (error) {
    body = <div className="rounded-xl bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-800">{error}</div>;
  } else if (!options) {
    body = <div className="px-1 py-4 text-sm text-slate-500">Loading plans…</div>;
  } else if (!canBuy) {
    body = (
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" /> {options.blockedReason || "Subscriptions are not available right now."}
      </div>
    );
  } else {
    const picked = pickKey(pick);
    body = (
      <>
        <div className="mb-2.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Choose a plan
          {options.standardName && <span className="rounded-full bg-slate-100 px-2 py-0.5 normal-case tracking-normal">{options.standardName}</span>}
        </div>
        <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {planCards(options).map((card) => (
            <PlanCard key={card.key} card={card} options={options} active={picked === card.key} onPick={(key) => setPick((p) => choosePlan(options, p, key))} />
          ))}
        </div>
        {need > 0 && need < options.courses.length && (
          <>
            <div className="mb-2.5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Choose {need} course{need === 1 ? "" : "s"}
              <span className={`rounded-full px-2 py-0.5 normal-case tracking-normal ${valid ? "bg-emerald-50 text-emerald-700" : "bg-slate-100"}`}>
                {pick.subjectIds.length} of {need}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {options.courses.map((course) => {
                const on = pick.subjectIds.includes(course.subjectId);
                const full = !on && pick.subjectIds.length >= need;
                return (
                  <label
                    key={course.subjectId}
                    className={`flex items-center gap-2 rounded-lg border-[1.5px] px-3 py-2 text-sm font-semibold text-slate-800 ${
                      on ? "border-primary bg-primary/5" : "border-slate-200"
                    } ${full ? "cursor-default opacity-50" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={full}
                      onChange={(e) => toggleCourse(course.subjectId, e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span>{course.courseTitle}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="bg-primary px-5 py-4 text-white">
          <DialogTitle className="flex items-center gap-2 text-white">
            <LockOpen className="h-5 w-5" /> Subscribe to course videos
          </DialogTitle>
        </DialogHeader>
        <div className="p-5">{body}</div>
        <div className="flex flex-col gap-2.5 border-t border-slate-100 px-5 py-4">
          {canBuy ? (
            <>
              {plan ? (
                <div className="flex flex-wrap items-baseline gap-2 text-sm text-slate-500">
                  <span>Total</span>
                  <b className="text-2xl text-slate-800">${money(pickTotal(options, pick))}</b>
                  <small>
                    {plan.lifetime ? "one-time · until your course ends" : "1 month"}
                    {startsLater}
                  </small>
                </div>
              ) : (
                <div className="text-sm text-slate-400">Choose a plan</div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" /> Secure online payment · the payment link is also emailed to you
                </span>
                <button
                  type="button"
                  disabled={!valid || busy}
                  onClick={checkout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 sm:w-auto"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing payment…
                    </>
                  ) : (
                    <>
                      Continue to payment <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <button type="button" onClick={onClose} className="self-end rounded-lg border-[1.5px] border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">
              Close
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
