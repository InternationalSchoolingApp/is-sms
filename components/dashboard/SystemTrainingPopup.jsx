"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Salsa } from "next/font/google";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { JoinClassModal } from "@/components/dashboard/calendar/JoinClassModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { getSystemTrainingPopup } from "@/services/systemTrainingApi";
import { studentNavHref } from "@/utils/dashboardNav";

const salsa = Salsa({ weight: "400", subsets: ["latin"], display: "swap" });

/**
 * School System Training popup on the dashboard — legacy studentTimePreference.js (getStudentTimePreference ->
 * studentSystemTrainingShowHide -> showStudentDashboardWelcomeThenSystemTraining) and studentTimePreferenceContent.js.
 *
 * Only for a student whose dashboard data says showStudentCourseSelectionModel = "Y" (never in dummy mode). The
 * legacy rules decide what is shown:
 *   - systemTrainingStatus "Skipped": nothing.
 *   - BATCH: nothing unless showSystemTrainingSelectionModelBatch = "Y" and there is no semester start date yet.
 *   - others: nothing when both the academic-year and system-training settings are "N", or (not a fresh / flex
 *     enrollment) when the system-training setting is "N".
 *   - a booked training (orientationAcceptanceStatus "A"): nothing once COMPLETED, else "Your School System Training
 *     is on …" with Join (the class join flow) and a reschedule link, or "has been rescheduled" with Reschedule.
 *   - no training booked yet: the legacy popup asked for the date / time here. In this app that is the Dashboard
 *     Setup page (/student/setup, the same backend rule sends the student there before the dashboard), so only the
 *     welcome below is shown.
 * Before the training popup comes the one-time "Hello {name}! Welcome to the International Schooling Family!" popup
 * (remembered per user in localStorage and a cookie, closes by itself after 10 seconds). Neither opens over another
 * popup (they wait for it to close).
 */

const OTHER_POPUPS = '[data-blocking-popup], [data-slot="dialog-content"], dialog[open]';
const welcomeKey = (userId) => `student_dashboard_welcome_popup_shown_${userId}`;

function welcomeShown(userId) {
  const key = welcomeKey(userId);
  try {
    if (window.localStorage.getItem(key)) return true;
  } catch {
    // storage blocked: the cookie below still remembers it
  }
  return document.cookie.split("; ").some((part) => part.startsWith(`${key}=`));
}

function rememberWelcome(userId) {
  const key = welcomeKey(userId);
  try {
    window.localStorage.setItem(key, "Y");
  } catch {
    // storage blocked
  }
  document.cookie = `${key}=Y; Max-Age=${365 * 24 * 60 * 60}; Path=/; SameSite=Lax`;
}

/** What the legacy studentSystemTrainingShowHide would show: "booked" (the training popup), "pick" (welcome only) or null. */
function planFor(data) {
  if (!data || data.systemTrainingStatus === "Skipped") return null;
  const booked = data.orientationAcceptanceStatus === "A";
  if (data.registrationType === "BATCH") {
    if (data.showSystemTrainingSelectionModelBatch !== "Y") return null;
    if (data.semesterStartDate) return null;
  } else {
    if (data.showAcademicYearSelectionModel === "N" && data.showSystemTrainingSelectionModel === "N") return null;
    const freshOrFlex = data.enrollmentType === "REGISTRATION_FRESH" || data.enrollmentType === "REGISTRATION_FLEX_COURSE";
    if (!freshOrFlex && data.showSystemTrainingSelectionModel === "N") return null;
  }
  if (booked) return data.orientStatus === "COMPLETED" ? null : "booked";
  return "pick";
}

// True while some other popup is open on the page (ours are marked data-system-training).
function otherPopupOpen() {
  return Array.from(document.querySelectorAll(OTHER_POPUPS)).some((el) => !el.closest("[data-system-training]"));
}

function WelcomeDialog({ open, firstName, onClose }) {
  // Legacy: closes by itself after 10 seconds.
  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(onClose, 10000);
    return () => clearTimeout(id);
  }, [open, onClose]);
  const words = ["Welcome", "to", "the", "International", "Schooling", "Family!"];
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} disablePointerDismissal>
      <DialogContent data-system-training="" showCloseButton={false} className="w-[calc(100%-32px)] max-w-[480px] gap-0 overflow-hidden rounded-[20px] border bg-white p-2 shadow-lg sm:max-w-[480px]">
        <div className="relative rounded-[20px] border border-primary bg-[url('/images/system-training/welcome-bg-tile.png')] bg-repeat px-3 py-4 text-center">
          <div className="flex justify-end">
            <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer border-none bg-transparent text-black">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <DialogTitle className={`${salsa.className} mb-3 animate-[st-zoom-in_0.6s_both] text-[30px] font-semibold tracking-[0.2px] text-black`}>
            Hello {firstName}!
          </DialogTitle>
          <div className="mb-3">
            {/* Animated GIF: next/image would serve it unoptimized anyway, so it is marked so here. */}
            <Image
              src="/images/system-training/MascotAlpha.gif"
              alt="Welcome"
              width={260}
              height={260}
              unoptimized
              priority
              className="mx-auto h-auto max-h-[260px] w-auto max-w-full animate-[st-zoom-in_0.6s_both]"
            />
          </div>
          <DialogDescription className={`${salsa.className} text-[26px] font-bold leading-none text-black`}>
            {words.map((word, i) => (
              <span key={word}>
                <span className={`inline-block animate-[st-zoom-in_0.6s_both] ${["", "[animation-delay:0.12s]", "[animation-delay:0.24s]", "[animation-delay:0.36s]", "[animation-delay:0.48s]", "[animation-delay:0.6s]"][i]}`}>
                  {word}
                </span>
                {i === 2 ? <br /> : i < words.length - 1 ? " " : null}
              </span>
            ))}
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TrainingDialog({ open, data, chatHref, rescheduleHref, onJoin, onClose }) {
  const rescheduled = data.orientStatus === "RESCHEDULE";
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} disablePointerDismissal>
      <DialogContent data-system-training="" showCloseButton={false} className="w-[calc(100%-32px)] max-w-[480px] gap-0 overflow-hidden p-0 text-center sm:max-w-[480px]">
        <div className="flex items-center justify-center bg-primary px-4 py-2 text-white">
          <DialogTitle className="m-0 mr-auto text-lg font-medium normal-case text-white">School System Training</DialogTitle>
        </div>
        <div className="flex w-full flex-wrap px-1 py-3">
          {chatHref && (
            <div className="mb-2 flex w-full">
              <a
                href={chatHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Live Chat with School Administration"
                aria-label="Live Chat with School Administration"
                className="ml-auto mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white"
              >
                <MessagesSquare className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          )}
          <div className="w-full px-4 pb-1">
            <div className="w-full text-center font-bold">
                {rescheduled ? (
                  <div className="rounded-[10px] border border-[#007fff] p-2">
                    <p className="mb-2 text-lg font-semibold text-primary">Your school System Training has been rescheduled. </p>
                    <p className="mb-0 text-lg font-semibold text-primary">Please click below and select another date for the training.</p>
                    <p className="mb-0 mt-3">
                      <Link href={rescheduleHref} onClick={onClose} className="inline-block rounded-md bg-green-600 px-12 py-1 text-lg font-semibold text-white no-underline">
                        Reschedule
                      </Link>
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-[10px] border border-[#007fff] p-2">
                      <p className="mb-3 text-lg font-semibold text-primary">Your School System Training is on {data.orientationdateTimeInStudentTimeZone}.</p>
                      <p className="mb-1 mt-3">
                        <button type="button" onClick={onJoin} className="cursor-pointer rounded-md border-none bg-green-600 px-4 py-1.5 font-semibold text-white">
                          Join
                        </button>
                      </p>
                    </div>
                    <p className="mb-0 mt-2 text-base font-semibold text-primary">
                      If you wish to reschedule, please{" "}
                      <Link href={rescheduleHref} onClick={onClose} className="text-primary underline">
                        click here
                      </Link>
                    </p>
                  </>
                )}
            </div>
          </div>
        </div>
        <div className="flex justify-center border-t px-4 py-3">
          <button type="button" onClick={onClose} className="ml-auto cursor-pointer rounded-md border border-primary bg-white px-3 py-1.5 font-semibold text-primary">
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SystemTrainingPopup() {
  const { context } = useDashboardContext();
  // The reschedule page is the new Next.js page (legacy rescheduleOrientationUrl -> /join-orientation, Orientation.jsp).
  const { school } = useParams();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const wanted =
    Boolean(context?.userId) &&
    (context?.role || "student") === "student" &&
    dummy.settled &&
    !dummy.enabled &&
    !dashboardData.isLoading &&
    !dashboardData.studentGraduate &&
    dashboardData.showStudentCourseSelectionModel;

  const query = useQuery({
    queryKey: ["system-training-popup", context?.schoolUUID, context?.userId],
    queryFn: () => getSystemTrainingPopup(),
    enabled: wanted,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const data = query.data;
  const plan = planFor(data);

  // "welcome" -> "training" -> "done"; each step waits until no other popup is open.
  const [step, setStep] = useState("waiting");
  const [ready, setReady] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!plan || ready) return undefined;
    const id = setInterval(() => {
      if (otherPopupOpen()) return;
      clearInterval(id);
      setReady(true);
      setStep(welcomeShown(context.userId) ? (plan === "booked" ? "training" : "done") : "welcome");
    }, 300);
    return () => clearInterval(id);
  }, [plan, ready, context?.userId]);

  // Remembered as soon as it is shown (legacy: no repeat after logout / refresh).
  useEffect(() => {
    if (step === "welcome") rememberWelcome(context.userId);
  }, [step, context?.userId]);

  if (!wanted || !plan) return null;

  const firstName = String(context?.userName || "").split(" ")[0] || "Student";
  const chatHref = context?.chatUrl && context?.uniqueId ? `${context.chatUrl}/onboarding-support?uuid=${context.uniqueId}` : "";
  const closeWelcome = () => setStep(plan === "booked" ? "training" : "done");

  return (
    <>
      <WelcomeDialog open={step === "welcome"} firstName={firstName} onClose={closeWelcome} />
      {plan === "booked" && (
        <TrainingDialog
          open={step === "training" && !joining}
          data={data}
          chatHref={chatHref}
          rescheduleHref={studentNavHref(school, "system-training-reschedule")}
          onJoin={() => setJoining(true)}
          onClose={() => setStep("done")}
        />
      )}
      {joining && (
        <JoinClassModal
          event={{ url: data.joinOrientationUrl, title: "School System Training" }}
          schoolUUID={context?.schoolUUID}
          onClose={() => setJoining(false)}
        />
      )}
    </>
  );
}
