"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Check, Info, Lock, X, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { FullScreenLoader } from "@/components/common/Loader";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { useCartCheckout } from "@/hooks/useCartCheckout";
import { usePicoLive } from "@/components/k5/pico/picoEvents";
import { acceptReserveSeat, getReserveSeatEligibility } from "@/services/reserveSeatApi";
import { expireSession } from "@/utils/logout";

/**
 * Re-enroll / reserve a seat for the next grade on the dashboard — legacy reserveSeat.js + reserveSeatContent.js,
 * called by rendereDashboardContent for a student who is not graduating (studentGraduate "N"), never in dummy mode.
 *
 *  - On load: eligible-for-ras-for-next-grade. Status "3" logs out; "0" / "2" show nothing; a "1" + S001 answer adds
 *    the side button ("Enroll in Next Grade" / "Enroll for {year} Group Learning" / "Reserve Seat") and opens the
 *    Enroll / Reserve popup straight away unless a class is live (CAN_SHOW_ENROLL_RESERVE_MODAL = !IS_CLASS_LIVE).
 *  - Re-Enroll / Reserve a Seat Now: accept-ras-for-next-grade, then the fee popup; Proceed to Pay is the common
 *    checkPayment chain (useCartCheckout) on its userPaymentDetailsId. A "0" / "3" answer reloads the page, "2" says
 *    the message.
 *  - eligible "Y" (the school's Need Any Help timing is set): the Need Any Help panel slides in after durationTime
 *    seconds, stays durationTime seconds, and comes back every timeInterval minutes (it hides the side button
 *    while it is out).
 */

const NOTHING = "$0.00";
const hasAmount = (value) => Boolean(value) && value !== 0 && value !== "0" && value !== NOTHING;
const pad2 = (n) => String(n).padStart(2, "0");

// The Need Any Help picture by grade (legacy needHelpSlideContent, student only).
function helpPicture(standardId) {
  const id = Number(standardId);
  if ((id >= 11 && id <= 16) || id === 19) return { src: "/images/reserve-seat/needHelpSlideImgEleGirl.png", w: "w-[75px]" };
  if ((id >= 1 && id <= 3) || id === 9) return { src: "/images/reserve-seat/needHelpSlideImgMiddleBoy.png", w: "w-[75px]" };
  if ((id >= 4 && id <= 7) || id === 10 || id === 8) return { src: "/images/reserve-seat/needHelpSlideImgHighGirl.png", w: "w-[50px]" };
  return { src: "/images/reserve-seat/needHelpSlideImgMiddleGirl.png", w: "w-[100px]" };
}

function sideButtonText(details) {
  if (details.eligibleFor === "ADV") return details.monthName ? `Enroll for ${details.activeSessionYear} Group Learning` : "Enroll in Next Grade";
  if (details.eligibleFor === "BAE") return "Reserve Seat";
  return "";
}

const acceptText = (details) => (details.eligibleFor === "ADV" ? "Re-Enroll Now For The Next Grade" : "Reserve a Seat Now For Next Grade");

// Is a class live right now? K–5 / Grade 6–8 / High: what the planner tells the buddy. Standard home: a live event
// drawn by the calendar (the same signals the contact-check popup uses).
function useClassLive() {
  const { isK5 } = useDashboardContext();
  const picoLive = usePicoLive();
  if (isK5) return { known: picoLive.ready, live: Boolean(picoLive.name) };
  return { known: true, live: null };
}

/** "This offer is valid for a limited time only!" — a countdown of progressionDiscountDueDate days that starts again. */
function OfferCountdown({ days }) {
  const cycle = Math.max(1, Number.parseInt(days, 10) || 0) * 24 * 60 * 60 * 1000;
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  // Counts down from the popup's opening; when it reaches zero it starts the same span again (legacy).
  const distance = cycle - ((now - start) % cycle);
  const parts = [
    [Math.floor(distance / 86400000), "Days"],
    [Math.floor((distance % 86400000) / 3600000), "Hours"],
    [Math.floor((distance % 3600000) / 60000), "Minutes"],
    [Math.floor((distance % 60000) / 1000), "Seconds"],
  ];
  return (
    <div className="mb-3 grid overflow-hidden rounded-[10px] border border-amber-400 bg-[#fffaf0] md:grid-cols-2">
      <div className="flex items-center justify-center gap-2 px-2 py-2 md:justify-start">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-[#ffd778] bg-[#fff7df] text-amber-500">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-left text-sm font-semibold text-black">This offer is valid for a limited time only!</span>
      </div>
      <div className="flex min-w-0 items-center justify-center px-2 py-2" aria-live="off">
        {parts.map(([value, label], i) => (
          <span key={label} className="inline-flex items-center">
            <span className="inline-flex min-w-[50px] flex-col rounded border bg-white px-1 py-1 font-bold text-black">
              <span className="text-xl leading-5 text-red-600">{pad2(value)}</span>
              <span className="text-center text-[10px] font-semibold">{label}</span>
            </span>
            {i < parts.length - 1 && <span className="px-1 pb-1 text-base font-bold text-black">:</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Legacy enrollReserveModalContent: "Congratulations!" with the offer when there is one, else "Awesome!". */
function EnrollReserveDialog({ open, onOpenChange, details, nextGrade, studentName, busy, onAccept }) {
  const offer = details.eligibleFor === "ADV" && (hasAmount(details.progressionDiscount) || hasAmount(details.planDiscount));
  const offerAmount = hasAmount(details.progressionDiscount) ? details.progressionDiscount : details.planDiscount;
  const accept = (
    <button
      type="button"
      disabled={busy}
      onClick={onAccept}
      className="flex-1 animate-[ras-pulse_1.5s_ease-in-out_infinite] group-data-[ending-style]:animate-none group-data-[closed]:animate-none cursor-pointer rounded-[10px] border-none bg-primary px-4 py-2.5 text-lg font-bold text-white shadow-md disabled:cursor-default disabled:opacity-60"
    >
      {acceptText(details)}
    </button>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={`group gap-0 overflow-hidden rounded-[15px] border-0 p-0 text-center ${offer ? "sm:max-w-[600px]" : "sm:max-w-[400px]"}`}>
        <div className="relative flex items-center justify-center bg-primary px-4 py-3 text-white">
          <DialogTitle className="m-0 text-xl font-bold text-white">{offer ? "Congratulations!" : "Awesome!"}</DialogTitle>
          <button type="button" aria-label="Close" onClick={() => onOpenChange(false)} className="absolute right-3.5 cursor-pointer border-none bg-transparent text-white">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-4 pb-4 pt-2">
          {!offer && (
            <span className="mx-auto my-3 flex h-[55px] w-[55px] items-center justify-center rounded-full bg-primary text-white">
              <Check className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
            </span>
          )}
          <h4 className="m-0 text-2xl font-medium text-black">Hi {studentName}!</h4>
          <DialogDescription className="mt-2 text-base text-black">Now you are eligible for re-enrollment for the next grade</DialogDescription>
          {offer ? (
            <>
              <div className="mb-4 mt-2 rounded-[10px] bg-primary/10 p-3">
                <div className="flex flex-wrap items-center justify-center">
                  <span className="px-2 text-center">
                    <Image src="/images/reserve-seat/reenrollement.png" alt="" width={90} height={90} className="h-auto w-[90px]" />
                  </span>
                  <div className="ml-3 grow border-l pl-4 text-center">
                    <span className="mb-2 inline-block rounded bg-[#417ec4] px-3 py-1 text-xs font-bold text-white">
                      {hasAmount(details.progressionDiscount) ? "EXCLUSIVE RE-ENROLLMENT OFFER" : "EXCLUSIVE ONE-TIME OFFER"}
                    </span>
                    <p className="m-0 text-sm text-black">You get a special discount of</p>
                    <div className="text-[44px] font-extrabold text-primary">
                      {String(offerAmount).split(".")[0]}
                      <span> OFF</span>
                    </div>
                  </div>
                </div>
              </div>
              {details.progressionDiscountDueDate ? <OfferCountdown days={details.progressionDiscountDueDate} /> : null}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 cursor-pointer rounded-[10px] border-none bg-primary/10 px-4 py-2.5 text-base font-bold text-primary"
                >
                  Maybe Later
                </button>
                {accept}
              </div>
            </>
          ) : (
            <>
              <div className="mx-0 mb-4 mt-2 rounded-[10px] bg-primary/10 p-1 text-lg font-bold text-primary">Ready for {nextGrade}?</div>
              <div className="flex">{accept}</div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Legacy getReserveSeatModal: the fee, the discounts, the payable fee and Proceed to Pay. */
function ReserveFeeDialog({ open, onOpenChange, details, busy, onPay }) {
  const title =
    details.eligibleFor === "ADV"
      ? details.monthName
        ? `Enroll for ${details.activeSessionYear} Group Learning Now`
        : `Pay Course Fee For ${details.grade}`
      : "Reserve A Seat For Next Grade";
  const totalFee = details.eligibleFor === "BAE" ? details.payableFee : details.courseFee;
  const line = (label, value) => (
    <div className="flex justify-between rounded-[10px] px-3 py-2 text-base font-semibold text-green-600">
      <span>{label}</span>
      <span className="text-lg">- {value}</span>
    </div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden rounded-[15px] border-0 p-0 sm:max-w-[500px]">
        <div className="relative flex items-center border-b border-[#eee] bg-white px-4 py-3">
          <DialogTitle className="m-0 max-w-[75%] text-base font-bold text-black">{title}</DialogTitle>
          <button type="button" aria-label="Close" onClick={() => onOpenChange(false)} className="absolute right-3.5 cursor-pointer border-none bg-transparent text-black/60">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-4">
          <div className="flex justify-between rounded-[10px] px-3 py-2 text-lg font-semibold text-black">
            <span>Total Fee</span>
            <span className="text-[22px]">{totalFee}</span>
          </div>
          {details.planDiscount && details.planDiscount !== NOTHING && line("One Time Discount", details.planDiscount)}
          {details.eligibleForProgressionDiscount === "Y" && details.progressionDiscount && line("Progression Discount", details.progressionDiscount)}
          {details.addtionalDiscount && details.addtionalDiscount !== NOTHING && line("Additional Discount", details.addtionalDiscount)}
          <div className="my-2 flex items-center justify-between rounded-[10px] bg-primary/10 px-3 py-2">
            <span className="mb-1 text-left text-sm text-black">Payable Fee (USD)</span>
            <span className="text-right text-lg font-bold text-black">{details.payableFee}</span>
          </div>
          <div className="flex items-start gap-1 rounded-[10px] border border-amber-400 bg-amber-50 px-3 py-2 text-left text-xs text-black">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
            <DialogDescription className="m-0 text-xs text-black">
              {details.eligibleFor === "ADV"
                ? `*This payable fee is for ${details.grade}${details.learningProgram === "DUAL_DIPLOMA" || details.learningProgram === "ONE_TO_ONE_FLEX" ? "" : ` for ${details.credits} regular credits.`}`
                : "*This fee will be deducted from your Course Fee at the time of re-enrollment"}
            </DialogDescription>
          </div>
        </div>
        <div className="flex justify-center px-6 pb-6">
          <button
            type="button"
            disabled={busy}
            onClick={onPay}
            className="flex w-[170px] cursor-pointer items-center justify-center gap-2 rounded-[10px] border-none bg-primary py-2.5 text-base font-bold text-white shadow-md disabled:cursor-default disabled:opacity-60"
          >
            <Lock className="h-4 w-4" aria-hidden="true" /> Proceed to Pay
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Legacy needHelpSlideContent as it renders: "Need Any Help?" and a grade picture. Its Yes / No buttons never reach
 * the page (the string building stops at an `if`), so there are none here either; the panel just slides in and out.
 */
function NeedHelpPanel({ shown, standardId }) {
  const picture = helpPicture(standardId);
  return (
    <div
      aria-hidden={!shown}
      className={`fixed bottom-[20%] right-0 z-[999] w-full max-w-[350px] transition-transform duration-500 ease-in-out ${shown ? "translate-x-0" : "translate-x-[400px]"}`}
    >
      <div data-need-help="" className="flex w-full max-w-[350px] items-center">
        <div className="mr-3">
          <div className="max-w-[250px] rounded-[10px] bg-primary p-3 text-white">
            <h6 className="m-0 text-sm font-semibold">Need Any Help?</h6>
          </div>
          <div className="mt-2 flex text-center" />
        </div>
        <Image src={picture.src} alt="" width={100} height={140} className={`h-auto max-w-[100px] ${picture.w}`} />
      </div>
    </div>
  );
}

export function ReserveSeatForNextGrade() {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const classLive = useClassLive();

  // Legacy: only on the regular (non-graduate) student dashboard, never in dummy mode.
  const wanted =
    Boolean(context?.userId) &&
    (context?.role || "student") === "student" &&
    dummy.settled &&
    !dummy.enabled &&
    !dashboardData.isLoading &&
    !dashboardData.studentGraduate;

  const query = useQuery({
    queryKey: ["reserve-seat-next-grade", context?.schoolUUID, context?.userId],
    queryFn: () => getReserveSeatEligibility(),
    enabled: wanted,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const answer = query.data;
  const loggedOut = answer?.status === "3";
  const details = answer && !["0", "2", "3"].includes(String(answer.status)) && answer.statusCode === "S001" ? answer.details : null;
  const offerReady = Boolean(details && sideButtonText(details));

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [fee, setFee] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const autoOpened = useRef(false);

  useEffect(() => {
    if (loggedOut && context?.schoolUUID) expireSession(context.schoolUUID);
  }, [loggedOut, context?.schoolUUID]);

  // CAN_SHOW_ENROLL_RESERVE_MODAL = !IS_CLASS_LIVE: the popup opens by itself once, unless a class is live.
  useEffect(() => {
    if (!offerReady || autoOpened.current || !classLive.known) return undefined;
    const id = setTimeout(() => {
      const live = classLive.live ?? Boolean(document.querySelector(".calendar-live-dashed"));
      autoOpened.current = true;
      if (!live) setEnrollOpen(true);
    }, 1500);
    return () => clearTimeout(id);
  }, [offerReady, classLive.known, classLive.live]);

  // Need Any Help: in after durationTime s, out after durationTime s, again every timeInterval min + durationTime s.
  const [helpShown, setHelpShown] = useState(false);
  const helpOn = answer?.eligible === "Y" && !loggedOut;
  const durationMs = Number(answer?.durationTime) * 1000 || 0;
  const intervalMs = Number(answer?.timeInterval) * 60 * 1000 || 0;
  useEffect(() => {
    if (!helpOn || !durationMs) return undefined;
    const timers = [];
    const cycle = () => {
      setHelpShown(true);
      timers.push(setTimeout(() => setHelpShown(false), durationMs));
    };
    let repeat = null;
    timers.push(
      setTimeout(() => {
        cycle();
        repeat = setInterval(cycle, intervalMs + durationMs);
      }, durationMs),
    );
    return () => {
      timers.forEach(clearTimeout);
      if (repeat) clearInterval(repeat);
    };
  }, [helpOn, durationMs, intervalMs]);

  const checkout = useCartCheckout({
    context,
    onPaid: () => {
      toast.success("Payment received.");
      setFee(null);
      window.location.reload();
    },
  });

  async function accept() {
    if (accepting) return;
    setAccepting(true);
    setEnrollOpen(false);
    const result = await acceptReserveSeat();
    setAccepting(false);
    const status = String(result?.status ?? "0");
    if (["0", "2", "3", "E001"].includes(status)) {
      if (status === "2") toast.error(result?.message || "Something went wrong");
      else window.location.reload();
      return;
    }
    setTimeout(() => setFee(result.details), 300);
  }

  if (!wanted || !answer || loggedOut) return null;


  return (
    <>
      {offerReady && (
        <div className="fixed bottom-[20%] right-0 z-[998]">
          <button
            type="button"
            onClick={() => setEnrollOpen(true)}
            className={`mr-1 cursor-pointer whitespace-nowrap rounded-md border border-white bg-secondary px-3 py-1.5 text-sm font-semibold text-white transition-transform duration-500 ease-in-out ${helpShown ? "translate-x-[400px]" : "translate-x-0"}`}
          >
            {sideButtonText(details)}
          </button>
        </div>
      )}
      {helpOn && <NeedHelpPanel shown={helpShown} standardId={answer.standardId} />}
      {offerReady && (
        <EnrollReserveDialog
          open={enrollOpen}
          onOpenChange={setEnrollOpen}
          details={details}
          nextGrade={dashboardData.nextGrade}
          studentName={context?.userName || ""}
          busy={accepting}
          onAccept={accept}
        />
      )}
      {fee && <ReserveFeeDialog open onOpenChange={(open) => !open && setFee(null)} details={fee} busy={checkout.preparing} onPay={() => checkout.start(fee.userPaymentDetailsId)} />}
      <PaymentGatewayPickerModal
        open={Boolean(checkout.picker)}
        onOpenChange={(open) => !open && checkout.closePicker()}
        details={checkout.picker?.details}
        airwallexMethods={checkout.picker?.methods}
        payerCountryCode={checkout.picker?.countryCode}
        schoolNumericId={context?.schoolNumericId}
        schoolName={context?.schoolName}
        busy={checkout.launching}
        onPay={checkout.launchGateway}
        onUploadProof={checkout.uploadProof}
        onSubmitOffline={checkout.submitOffline}
      />
      {(accepting || checkout.preparing || checkout.processing) && <FullScreenLoader message={checkout.processing ? "Payment is under process..." : undefined} />}
      <Dialog open={checkout.incomplete} onOpenChange={(open) => !open && checkout.dismissIncomplete()}>
        <DialogContent className="text-center">
          <DialogTitle className="text-2xl">Oops!</DialogTitle>
          <DialogDescription className="text-lg font-semibold text-red-600">Payment Incomplete</DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog open={checkout.underReview} onOpenChange={(open) => !open && checkout.dismissUnderReview()}>
        <DialogContent className="text-center">
          <DialogTitle>Your payment is under review.</DialogTitle>
          <DialogDescription className="text-black/70">Your fee status will be updated once the payment is received.</DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}
