"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CalendarDays, CheckCircle2, Info } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionButton, Card, SupportCard } from "@/components/re-enrollment/ReEnrollmentParts";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { ONBOARDING_STATUS_KEY } from "@/hooks/useOnboardingGate";
import { bookSystemTraining, getSetupDetails, getTrainingSlots, saveAcademicYearStart } from "@/services/onboardingGateApi";
import { callServer } from "@/utils/serverCall";
import { logoutEverywhere } from "@/utils/logout";

/**
 * Dashboard Setup (/{school}/student/setup) - legacy DashboardSetup.jsp + showContentByStep (dashboardStudent.js).
 * One of these, picked from the backend's setup data (DashboardSetupUtil):
 *   training  "Book Your school system training": date (+ the free times of that date), then Submit
 *   academic  "Academic Year Start Date": date, confirm (it can't be changed later)
 *   done      "You're All Set!": the booked training date & time, Go to Dashboard
 *   reminder  BATCH: the group learning batch start dates, Go to Dashboard
 * Anything else (nothing to set up, already skipped) goes straight back to the dashboard.
 */

const GREEN = "!bg-green-600 hover:!bg-green-700";
const isFreshOrFlex = (type) => type === "REGISTRATION_FRESH" || type === "REGISTRATION_FLEX_COURSE";
const setupKey = (context) => ["onboarding-setup", context?.schoolUUID, context?.userId];
const errorText = (error, fallback) => String(error?.message || "").replace(/^[A-Z0-9_]+: /, "") || fallback;

// "11-13-2026" (MM-dd-yyyy) -> local Date, or null.
function fromMdy(value) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(value || ""));
  return m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
}
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + Number(days || 0));
const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

/** Same decisions as the page's onload script + showContentByStep. */
function planFor(setup) {
  if (!setup) return { step: "leave" };
  const fresh = isFreshOrFlex(setup.enrollmentType);
  const ST = setup.systemTrainingSelected || "";
  const base = fromMdy(setup.paymentCompletedDate) || today();
  const pickerFromPayment = {
    from: addDays(base, setup.daysCount),
    to: addDays(base, setup.daysCountMax),
    blackout: String(setup.academicYearBlockDate || "")
      .split(",")
      .map((d) => /^(\d{4})-(\d{2})-(\d{2})$/.exec(d.trim()))
      .filter(Boolean)
      .map((m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))),
  };
  // Training after an academic year start date: within the first N days of the academic year.
  const trainingFromStart = (start) => ({ from: start, to: addDays(start, Number(setup.activeNumberOfDaysForSystemTraining || 7) - 1), blackout: [] });

  let AY = setup.academicYearSelected || "";
  let start = fromMdy(setup.semesterStartDate);
  if (setup.registrationType === "BATCH") {
    if (setup.showSystemTrainingSelectionBatch === "Y" && ST) {
      AY = "Y";
      start = start || (setup.batchAcademicYearStartDate ? new Date(setup.batchAcademicYearStartDate) : null) || today();
    } else {
      return setup.batchAcademicYearStartDate ? { step: "reminder" } : { step: "leave" };
    }
  } else if (AY === "Y" && !fresh) {
    return { step: "leave" };
  }

  if (AY === "N") {
    if (ST === "N") return { step: "training", picker: pickerFromPayment, fresh };
    return { step: "academic", picker: pickerFromPayment, fresh };
  }
  if (ST === "Skipped") return { step: "leave" };
  if (ST === "Y") return { step: "done", dateTime: setup.orientationDateTimeInStudentTimeZone || "" };
  return { step: "training", picker: trainingFromStart(start || today()), fresh };
}

export function OnboardingSetup() {
  const { context, session } = useDashboardContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dummy = useDummyStudent();
  const live = Boolean(context && dummy.settled && !dummy.enabled);
  const [booked, setBooked] = useState(null); // dateTime after a successful booking -> "You're All Set!"

  const query = useQuery({
    queryKey: setupKey(context),
    queryFn: () => callServer(() => getSetupDetails()),
    enabled: live,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const setup = query.data?.setup ?? null;
  const plan = useMemo(() => (booked ? { step: "done", dateTime: booked } : planFor(setup)), [setup, booked]);

  const schoolUUID = context?.schoolUUID;
  const goToDashboard = useCallback(() => {
    // The gate cached "pending" for this tab: drop it so the dashboard checks again.
    queryClient.removeQueries({ queryKey: [ONBOARDING_STATUS_KEY] });
    router.replace(`/${schoolUUID}/student`);
  }, [queryClient, router, schoolUUID]);
  const leaving = (dummy.settled && dummy.enabled) || (query.isSuccess && plan.step === "leave");
  useEffect(() => {
    // Nothing to set up here: back to the dashboard (the gate re-checks).
    if (leaving && schoolUUID) goToDashboard();
  }, [leaving, schoolUUID, goToDashboard]);

  if (query.isError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm font-semibold text-red-600">Could not load your details. Please try again.</p>
        <ActionButton onClick={() => query.refetch()}>Try again</ActionButton>
      </div>
    );
  }
  if (!live || query.isPending || leaving) return <FullScreenLoader />;

  const firstName = String(context.userName || "").split(" ")[0] || "there";
  const heading = plan.step === "done" ? "very well done. Let's get started!" : plan.step === "reminder" ? "an important reminder" : "let's get started!";

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4">
      <h2 className="mb-5 text-center text-xl font-bold text-black">
        Hi {firstName}, {heading}
      </h2>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {plan.step === "training" && (
            <TrainingStep picker={plan.picker} onBooked={(dateTime) => setBooked(dateTime)} />
          )}
          {plan.step === "academic" && (
            <AcademicStep picker={plan.picker} fresh={plan.fresh} chatUrl={context.chatUrl} uniqueId={context.uniqueId} session={session} onSaved={goToDashboard} />
          )}
          {plan.step === "done" && <DoneStep dateTime={plan.dateTime} migrated={setup?.isMigrated === "Y"} startDate={setup?.semesterStartDateDisplay} onContinue={goToDashboard} />}
          {plan.step === "reminder" && <BatchReminder onContinue={goToDashboard} />}
        </div>
        <div className="lg:col-span-4">
          <SupportCard uniqueId={context.uniqueId} />
        </div>
      </div>
    </div>
  );
}

// ---- Book Your school system training ----

function TrainingTopics() {
  return (
    <div className="mb-5 rounded-lg bg-primary/10 p-3 text-left text-sm font-semibold text-primary">
      In the school system training, you will learn
      <ol className="mt-2 space-y-1 text-black">
        <li>
          <span className="text-primary">1.</span> How to Book and Join Classes
        </li>
        <li>
          <span className="text-primary">2.</span> Courses, Progress Reports &amp; Assessments
        </li>
      </ol>
    </div>
  );
}

function TrainingStep({ picker, onBooked }) {
  const [date, setDate] = useState(null);
  const [stTime, setStTime] = useState("");
  const iso = date ? toIso(date) : "";

  const slots = useQuery({
    queryKey: ["onboarding-training-slots", iso],
    queryFn: () => callServer(() => getTrainingSlots(iso)),
    enabled: Boolean(iso),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const book = useMutation({
    mutationFn: () => callServer(() => bookSystemTraining({ date: iso, stTime })),
    onSuccess: (data) => {
      toast.success(data?.message || "Your school system training has been booked.");
      onBooked(data?.dateTime || "");
    },
    onError: (error) => {
      toast.error(errorText(error, "Your school system training could not be booked."));
      slots.refetch();
      setStTime("");
    },
  });

  const list = slots.data?.slots ?? [];
  const label = !date ? "Choose date to continue" : stTime ? "Submit" : "Continue";

  return (
    <Card header="Book Your school system training" bodyClassName="px-4 py-5 sm:px-6">
      <TrainingTopics />
      <h3 className="mb-3 text-center text-base font-semibold text-black">I want to book my school system training on</h3>
      <div className="mx-auto max-w-sm">
        <DatePicker
          icon={CalendarDays}
          label="Choose system training date"
          value={date}
          onChange={(d) => {
            setDate(d);
            setStTime("");
          }}
          fromDate={picker.from}
          toDate={picker.to}
          defaultMonth={picker.from}
          disabledDates={picker.blackout}
        />
      </div>

      {date && (
        <div className="mt-5">
          <h3 className="mb-3 text-center text-base font-semibold text-black">
            Select time: {slots.data?.timeZone && <span className="text-sm font-normal text-slate-600">({slots.data.timeZone})</span>}
          </h3>
          {slots.isFetching && <p className="text-center text-sm text-slate-500">Loading the available times…</p>}
          {slots.isError && <p className="text-center text-sm text-red-600">{errorText(slots.error, "The training times could not be loaded.")}</p>}
          {!slots.isFetching && !slots.isError && list.length === 0 && (
            <p className="text-center text-sm text-slate-600">No slot available. Please pick another date</p>
          )}
          {!slots.isFetching && list.length > 0 && (
            <div role="radiogroup" aria-label="Training time" className="grid grid-cols-2 gap-2 sm:grid-cols-3 max-h-[150px] overflow-y-auto">
              {list.map((slot) => {
                const active = slot.stTime === stTime;
                return (
                  <button
                    key={slot.stTime}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStTime(slot.stTime)}
                    className={`cursor-pointer rounded-md border border-primary px-3 py-2 text-sm font-semibold transition ${active ? "bg-primary text-white" : "bg-white text-primary hover:bg-primary/5"}`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
        <ActionButton className={stTime ? GREEN : ""} disabled={!stTime || book.isPending} onClick={() => book.mutate()}>
          {book.isPending ? "Saving..." : label}
        </ActionButton>
      </div>
    </Card>
  );
}

// ---- Academic Year Start Date ----

function AcademicStep({ picker, fresh, chatUrl, uniqueId, session, onSaved }) {
  const [date, setDate] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [decideLater, setDecideLater] = useState(false);
  const save = useMutation({
    mutationFn: () => callServer(() => saveAcademicYearStart({ date: toIso(date) })),
    onSuccess: (data) => {
      setConfirming(false);
      toast.success(data?.message || "Your academic year start date is saved.");
      onSaved();
    },
    onError: (error) => toast.error(errorText(error, "Your academic year start date could not be saved.")),
  });
  const chatLink = chatUrl ? `${chatUrl}/onboarding-support?uuid=${encodeURIComponent(uniqueId || "")}` : "";

  return (
    <Card header={`${fresh ? "Step 1 of 1 - " : ""}Academic Year Start Date`} bodyClassName="px-4 py-5 sm:px-6">
      <p className="mb-2 text-center text-sm text-slate-600">Your academic year start date is when you will start your classes.</p>
      <h3 className="mb-3 text-center text-base font-semibold text-primary">I want to start my academic year on</h3>
      <div className="mx-auto max-w-sm">
        <DatePicker
          icon={CalendarDays}
          label="Choose start date"
          value={date}
          onChange={setDate}
          fromDate={picker.from}
          toDate={picker.to}
          defaultMonth={picker.from}
          disabledDates={picker.blackout}
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={() => setDecideLater(true)} className="cursor-pointer text-sm font-semibold text-red-600 underline-offset-2 hover:underline">
          Decide Later
        </button>
        <ActionButton className={date ? GREEN : ""} disabled={!date} onClick={() => setConfirming(true)}>
          {date ? "Continue" : "Choose date to continue"}
        </ActionButton>
      </div>

      <Dialog open={confirming} onOpenChange={(open) => !save.isPending && setConfirming(open)}>
        <DialogContent className="text-center sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold text-red-600">Academic Year Start Date</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-black">Please choose your academic year start date carefully. You will not be able to edit this later.</p>
          {chatLink && (
            <p className="text-sm">
              For any queries, please{" "}
              <a href={chatLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
                Live Chat with School Administration
              </a>
            </p>
          )}
          <div className="mt-2 flex justify-center gap-2">
            <button type="button" disabled={save.isPending} onClick={() => setConfirming(false)} className="cursor-pointer rounded-md border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-60">
              Edit Date
            </button>
            <ActionButton className={GREEN} disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving..." : "Confirm"}
            </ActionButton>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={decideLater} onOpenChange={setDecideLater}>
        <DialogContent className="text-center sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-semibold text-red-600">Decide Later</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-black">
            Choosing your {fresh ? "system training" : "academic year"} start date is mandatory to start your classes. You can always login again to complete the process.
          </p>
          {chatLink && (
            <p className="text-sm">
              For any queries, please{" "}
              <a href={chatLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
                Talk to School Administration
              </a>
            </p>
          )}
          <div className="mt-2 flex justify-center gap-2">
            <button type="button" onClick={() => setDecideLater(false)} className="cursor-pointer rounded-md border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
              Cancel
            </button>
            <ActionButton onClick={() => logoutEverywhere(session)}>Log out</ActionButton>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---- You're All Set! / BATCH reminder ----

function DoneStep({ dateTime, migrated, startDate, onContinue }) {
  return (
    <Card header={<span className="inline-flex items-center gap-2">You&apos;re All Set! <CheckCircle2 className="h-4 w-4" aria-hidden="true" /></span>} bodyClassName="px-4 py-6 text-center sm:px-6">
      <p className="text-base font-semibold text-black">
        {migrated && startDate ? `Your academic year start date is ${startDate}` : "Your school system training has been successfully confirmed."}
      </p>
      {dateTime && (
        <p className="mt-2 text-sm text-slate-700">
          Date &amp; Time: <span className="font-semibold text-black">{dateTime}</span>
        </p>
      )}
      <p className="mt-2 text-sm text-slate-600">A Confirmation has been sent to your registered email address as well.</p>
      <div className="mt-6 flex justify-center">
        <ActionButton className={GREEN} onClick={onContinue}>
          Go to Dashboard
        </ActionButton>
      </div>
    </Card>
  );
}

function BatchReminder({ onContinue }) {
  return (
    <Card header="Academic Year Start Date" bodyClassName="px-4 py-6 text-center sm:px-6">
      <p className="flex items-start justify-center gap-2 text-sm text-black">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          The Group Learning Batch for the UTC+ timezone will begin on 18th September 2024.
          <br />
          and the Group Learning Batch for the UTC- timezone will start on 25th September 2024.
        </span>
      </p>
      <div className="mt-6 flex justify-center">
        <ActionButton className={GREEN} onClick={onContinue}>
          Go to Dashboard
        </ActionButton>
      </div>
    </Card>
  );
}
