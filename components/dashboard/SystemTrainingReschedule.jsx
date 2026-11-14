"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CalendarDays, CalendarClock } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getSystemTrainingDetails } from "@/services/systemTrainingApi";
import { getTrainingSlots, rescheduleSystemTraining } from "@/services/onboardingGateApi";
import { pickerDateToYmd, todayYmd, ymdToPickerDate } from "@/utils/attendanceDates";
import { studentNavHref } from "@/utils/dashboardNav";
import { expireSession } from "@/utils/logout";

/**
 * Reschedule Your School System Training — legacy /join-orientation?clickFrom=RESCHEDULE (Orientation.jsp,
 * saveType RESH), opened from the dashboard's School System Training popup.
 *
 * Legacy rules (checkMeetingStatus / rescheduleSystemTraining / the date picker's changeDate):
 *  - COMPLETED: "Congratulations on your successful completion of the School System Training!".
 *  - RESCHEDULE (the student missed it): the missed-training text (a one-time free reschedule when none was used yet)
 *    and a "Reschedule Your System Training" button that opens the date / time step.
 *  - otherwise (PENDING): the date / time step straight away.
 *  - every free reschedule used (rescheduleNumber == totalRescheduleNumber): no date / time step, only the "you have
 *    used your one-time free reschedule ... Talk to School Administration" message.
 *  - the date picker starts tomorrow (in the student's time zone); picking a date loads its free times
 *    ("No slot available. Please pick another date" when none). Confirm saves; on the last free reschedule
 *    (rescheduleNumber == totalRescheduleNumber - 1) a Yes / No warning comes first ("a fee will be charged").
 *  - "Please keep in mind, only the first reschedule is free ..." shows while no reschedule was used yet.
 * Each look (K–5, Grade 6–8, High) comes from the student's dashboard theme (the K5 skin classes); other students get
 * the standard dashboard look.
 */

const SUPPORT_EMAIL = "admin.support@internationalschooling.org";

// "Nov 17, 2026 09:30 AM" -> { date: "Nov 17, 2026", time: "09:30 AM" }.
function splitDateTime(value) {
  const m = /^(.+\d{4})\s+(.+)$/.exec(String(value || "").trim());
  return m ? { date: m[1], time: m[2] } : { date: String(value || ""), time: "" };
}

// The next day of a "yyyy-MM-dd" date.
function nextDay(ymd) {
  const d = ymdToPickerDate(ymd);
  if (!d) return undefined;
  d.setDate(d.getDate() + 1);
  return d;
}

function useLook() {
  const { isK5, isMiddle } = useDashboardContext();
  if (isK5) {
    // K–5: the title row in its own card with an 84px tile (like My Attendance); Grade 6–8 / High: no card, a 62px tile.
    return {
      headerWrap: isMiddle ? "flex flex-wrap items-center gap-4" : `${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`,
      card: `${K5_CARD} overflow-hidden`,
      title: `m-0 font-k5-display font-semibold leading-[1.05] text-k5-ink ${isMiddle ? "text-[30px]" : "text-4xl"}`,
      sub: `m-0 font-extrabold text-k5-mut ${isMiddle ? "text-base" : "text-lg"}`,
      tile: isMiddle
        ? "k5h-r10 flex h-[62px] w-[62px] flex-none items-center justify-center rounded-[0.875rem] bg-k5-act text-k5-ac"
        : "flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-bt text-k5-bi",
      panel: "bg-k5-act text-k5-ink",
      heading: "m-0 font-k5-display text-2xl font-semibold text-k5-ink",
      text: "text-lg font-extrabold text-k5-ink",
      muted: "text-base font-extrabold text-k5-mut",
      link: "font-black text-k5-acx underline",
      btn: "min-h-12 cursor-pointer rounded-2xl border-none bg-k5-ac px-6 font-k5-display text-lg font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] disabled:cursor-default disabled:opacity-50",
      ghost: "min-h-12 cursor-pointer rounded-2xl border-[3px] border-k5-ac bg-k5-card px-6 font-k5-display text-lg font-semibold text-k5-acx",
      slot: (on) =>
        `flex min-h-12 w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-2xl border-[3px] px-3.5 font-k5-display text-[17px] font-semibold ${on ? "border-k5-ac bg-k5-ac text-white" : "border-k5-line bg-k5-card text-k5-ink"}`,
      warn: "rounded-2xl border-[3px] border-k5-yb bg-k5-yt px-4 py-3 text-base font-extrabold text-k5-yx",
    };
  }
  return {
    headerWrap: "flex flex-wrap items-center gap-4",
    card: "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
    title: "m-0 text-xl font-bold text-black",
    sub: "m-0 text-sm text-slate-600",
    tile: "flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary",
    panel: "bg-[radial-gradient(140%_140%_at_101%_97%,rgba(11,101,255,0.99)_32.81%,rgba(102,178,255,0.8)_100%)] text-white",
    heading: "m-0 text-2xl font-semibold text-white",
    text: "text-lg font-semibold text-white",
    muted: "text-base font-semibold text-white/90",
    link: "font-semibold text-white underline",
    btn: "cursor-pointer rounded-md border-none bg-green-700 px-8 py-2 text-base font-semibold text-white disabled:cursor-default disabled:opacity-50",
    ghost: "cursor-pointer rounded-md border-none bg-white px-4 py-2 text-sm font-semibold text-primary",
    slot: (on) =>
      `flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-md border px-3 py-3 text-sm font-semibold ${on ? "border-white bg-white text-primary ring-2 ring-white" : "border-primary bg-white text-primary"}`,
    warn: "text-lg font-semibold text-white",
  };
}

export function SystemTrainingReschedule() {
  const { context } = useDashboardContext();
  const { school } = useParams();
  const queryClient = useQueryClient();
  const look = useLook();
  const query = useQuery({
    queryKey: ["system-training-details", context?.schoolUUID, context?.userId],
    queryFn: () => getSystemTrainingDetails(),
    enabled: Boolean(context?.userId),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const data = query.data;

  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState("");
  const [warnOpen, setWarnOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const slotsQuery = useQuery({
    queryKey: ["system-training-slots", context?.userId, date],
    queryFn: () => getTrainingSlots(date),
    enabled: Boolean(date),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const slots = slotsQuery.data?.ok ? slotsQuery.data.data.slots : [];

  const header = (
    <div className={look.headerWrap}>
      <span aria-hidden="true" className={look.tile}>
        <CalendarClock className="h-8 w-8" strokeWidth={2.2} />
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h1 className={look.title}>Student&apos;s School System Training</h1>
        <p className={look.sub}>Reschedule your School System Training.</p>
      </div>
      <Link href={studentNavHref(school, "")} className={`${look.ghost} inline-flex items-center no-underline`}>
        Back to Dashboard
      </Link>
    </div>
  );

  // The page skeleton while its data loads (first open, and again after Confirm while the new state comes back).
  if (query.isFetching || !context?.userId) {
    return (
      <K5Loading label="Loading your School System Training" className="flex flex-col gap-4">
        {header}
        <div className={`${look.card} grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_280px]`}>
          <div className="flex flex-col items-center gap-3">
            <K5Sk className="h-8 w-80 max-w-full" />
            <K5Sk className="h-5 w-64 max-w-full" />
            <K5Sk className="h-11 w-72 max-w-full rounded-xl" />
            <div className="grid w-full max-w-[600px] grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <K5Sk key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <K5Sk className="mx-auto h-56 w-56 rounded-2xl max-md:hidden" />
        </div>
      </K5Loading>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className={`${look.card} p-8 text-center`}>
          <p className="m-0 text-lg font-semibold">Your School System Training could not be loaded right now. Please try again shortly.</p>
        </div>
      </div>
    );
  }

  const userName = data.studentName || context?.userName || "";
  const status = data.orientStatus;
  const used = Number(data.orientationRescheduleNumber || 0);
  const total = Number(data.orientationTotalRescheduleNumber || 1);
  const limitReached = used === total;
  const lastFree = used === total - 1;
  const { date: trainingDate, time: trainingTime } = splitDateTime(data.orientationdateTimeInStudentTimeZone);
  const minDate = nextDay(todayYmd(data.userTimezone));
  const chatHref = context?.chatUrl && context?.uniqueId ? `${context.chatUrl}/onboarding-support?uuid=${context.uniqueId}` : "";
  // PENDING (or anything not RESCHEDULE / COMPLETED): the date / time step straight away (legacy clickFrom RESCHEDULE).
  const showPicker = !limitReached && status !== "COMPLETED" && (status !== "RESCHEDULE" || picking);

  async function save() {
    if (!date) {
      toast.error("Please select your system training date.");
      return;
    }
    if (!slot) {
      toast.error("Please select your system training time.");
      return;
    }
    setSaving(true);
    const result = await rescheduleSystemTraining({ date, stTime: slot });
    setSaving(false);
    setWarnOpen(false);
    if (result?.sessionExpired) {
      expireSession(context.schoolUUID);
      return;
    }
    if (!result?.ok) {
      toast.error(result?.message || "Your training could not be rescheduled.");
      return;
    }
    toast.success(result.data?.message || "Your School System Training has been rescheduled.");
    // Legacy: location.reload() - the page shows the new state (one more reschedule used).
    setDate(null);
    setSlot("");
    setPicking(false);
    queryClient.invalidateQueries({ queryKey: ["system-training-details"] });
    queryClient.invalidateQueries({ queryKey: ["system-training-popup"] });
  }

  function confirm() {
    if (!slot) {
      toast.error("Please choose a slot");
      return;
    }
    if (lastFree) setWarnOpen(true);
    else save();
  }

  const limitMessage = (
    <div className={`flex flex-col gap-2 ${look.text}`}>
      <h2 className={look.heading}>Hello, {userName}</h2>
      <p className="m-0">
        Your School System Training is on {trainingDate} at {trainingTime}.
      </p>
      <p className="m-0">You now have used your one-time free reschedule for School System Training.</p>
      <p className="m-0">
        Attending this training is essential to start your schooling.
        <br />
        For any queries or rescheduling, please{" "}
        {chatHref ? (
          <a href={chatHref} target="_blank" rel="noopener noreferrer" className={look.link}>
            Talk to School Administration
          </a>
        ) : null}
        {chatHref ? " or " : ""}write to us at {SUPPORT_EMAIL}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {header}
      <div className={`${look.card} grid md:grid-cols-[minmax(0,1fr)_300px]`}>
        <div className={`flex flex-col items-center gap-4 px-5 py-8 text-center ${look.panel}`}>
          {status === "COMPLETED" ? (
            <p className={`m-0 max-w-[720px] ${look.text}`}>
              Hello, {userName}!
              <br />
              Congratulations on your successful completion of the School System Training!
              <br />
              You are now ready to start an exciting journey full of learning and new experiences with {context?.schoolName || "your school"}. We wish you all the
              very best for your academic journey ahead.
              <br />
              <br />
              If you have any questions or need guidance, feel free to reach out to us at {SUPPORT_EMAIL} or WhatsApp +1 5854990662. We&apos;re always here to support
              you.
            </p>
          ) : limitReached ? (
            limitMessage
          ) : showPicker ? (
            <div className="flex w-full max-w-[640px] flex-col items-center gap-4">
              <h2 className={look.heading}>Reschedule Your School System Training</h2>
              <div className="flex w-full max-w-[400px] flex-col items-center gap-1.5">
                <span className={look.muted}>I want to schedule my school system training on</span>
                <div className="w-full max-w-[300px] text-left text-black">
                  <DatePicker
                    icon={CalendarDays}
                    placeholder="Select Training Date"
                    value={ymdToPickerDate(date)}
                    fromDate={minDate}
                    toDate={new Date(minDate ? minDate.getFullYear() + 2 : new Date().getFullYear() + 2, 11, 31)}
                    defaultMonth={minDate}
                    onChange={(picked) => {
                      setDate(pickerDateToYmd(picked));
                      setSlot("");
                    }}
                  />
                </div>
              </div>
              {date && (
                <div className="max-h-[260px] w-full overflow-y-auto pr-1">
                  {slotsQuery.isLoading ? (
                    <K5Loading label="Loading the free times" className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3">
                      {Array.from({ length: 6 }, (_, i) => (
                        <K5Sk key={i} className="h-12 w-full rounded-xl" />
                      ))}
                    </K5Loading>
                  ) : slots.length === 0 ? (
                    <p className={`m-0 ${look.muted}`}>{slotsQuery.data?.ok === false ? slotsQuery.data.message : "No slot available. Please pick another date"}</p>
                  ) : (
                    <div role="radiogroup" aria-label="Training time" className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-3">
                      {slots.map((s) => (
                        <label key={s.stTime} className={look.slot(slot === s.stTime)}>
                          <input type="radio" name="training-slot" value={s.stTime} checked={slot === s.stTime} onChange={() => setSlot(s.stTime)} className="h-4 w-4 accent-current" />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {date && (
                <button type="button" onClick={confirm} disabled={saving} className={look.btn}>
                  {saving ? "Saving…" : "Confirm"}
                </button>
              )}
              {used === 0 && <p className={`m-0 ${look.warn}`}>Please keep in mind, only the first reschedule is free, but after that, the School System Training will be paid.</p>}
            </div>
          ) : (
            // RESCHEDULE: the student missed the training.
            <div className={`flex max-w-[720px] flex-col items-center gap-3 ${look.text}`}>
              {used === 0 ? (
                <>
                  <p className="m-0">
                    Missed your School System Training? <br />
                    Don&apos;t worry at all! We offer you a one-time opportunity to reschedule your training for free.
                  </p>
                  <p className="m-0">Please note, this is your last chance to reschedule your School System Training without any additional charges.</p>
                  <p className="m-0">In future rescheduling requests will be chargeable.</p>
                  <p className="m-0">
                    Rescheduling again kindly contact {SUPPORT_EMAIL} or <br />
                    {chatHref && (
                      <a href={chatHref} target="_blank" rel="noopener noreferrer" className={look.link}>
                        Talk to School Administration
                      </a>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="m-0">
                    Hello, {userName}! <br />
                    You have missed your System Training scheduled for {trainingDate} at {trainingTime}.<br />
                    It is essential that you finish the training before commencing your classes/ studies as soon as possible.
                  </p>
                  <p className="m-0">You can reschedule your School System Training by clicking below.</p>
                </>
              )}
              <button type="button" onClick={() => setPicking(true)} className={look.ghost}>
                Reschedule Your System Training
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center bg-white p-6 max-md:hidden">
          {/* Animated GIF (legacy timer.gif): served as is. */}
          <Image src="/images/system-training/timer.gif" alt="" width={240} height={240} unoptimized className="h-auto w-[240px] max-w-full" />
        </div>
      </div>

      <Dialog open={warnOpen} onOpenChange={(next) => !next && !saving && setWarnOpen(false)} disablePointerDismissal>
        <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-[500px]">
          <div className="bg-primary px-4 py-2">
            <DialogTitle className="m-0 text-center text-lg font-medium text-white">Reschedule Your School System Training</DialogTitle>
          </div>
          <DialogDescription className="m-0 px-5 py-4 text-center text-lg font-bold text-primary">
            You are about to reschedule your school system training. Please keep in mind that if the system training is rescheduled again after this, a fee will be
            charged.
          </DialogDescription>
          <div className="flex justify-center gap-2 border-t px-4 py-3">
            <button type="button" onClick={save} disabled={saving} className="cursor-pointer rounded-md border-none bg-green-600 px-4 py-1.5 font-semibold text-white disabled:opacity-60">
              Yes
            </button>
            <button type="button" onClick={() => setWarnOpen(false)} disabled={saving} className="cursor-pointer rounded-md border-none bg-primary px-4 py-1.5 font-semibold text-white">
              No
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
