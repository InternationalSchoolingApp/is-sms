"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { User } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { ActionButton, PageTitle, SupportCard } from "@/components/re-enrollment/ReEnrollmentParts";
import { STATUS_SUCCESS, useReEnrollmentContext, useSelectReEnrollmentOption } from "@/hooks/useReEnrollment";
import { expireSession } from "@/utils/logout";
import { reEnrollmentStepPath } from "@/utils/reEnrollmentSteps";

// Legacy "RE-ENROLL NOW & SAVE USD x" box with "Offer Ends on" and the DAYS : HRS : MIN : SEC countdown.
function DiscountBanner({ discount }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, discount.dueDateMillis - now);
  if (remaining <= 0 && !discount.amount) return null;
  const parts = [
    { label: "DAYS", value: Math.floor(remaining / 86400000) },
    { label: "HRS", value: Math.floor((remaining % 86400000) / 3600000) },
    { label: "MIN", value: Math.floor((remaining % 3600000) / 60000) },
    { label: "SEC", value: Math.floor((remaining % 60000) / 1000) },
  ];
  const endsOn = new Date(discount.dueDateMillis).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="mt-6 text-center">
      <div className="inline-block rounded-[10px] bg-gradient-to-r from-[#33AB57] via-[#46B64C] to-[#59C141] p-2 text-white shadow-lg">
        <div className="rounded border border-dashed border-white/80 px-6 py-3">
          <h6 className="mb-0 text-base font-semibold">RE-ENROLL NOW &amp; SAVE</h6>
          <h4 className="mb-0 text-2xl font-bold">
            {discount.currencyLabel ? `${discount.currencyLabel} ` : ""}
            {discount.amount}
          </h4>
        </div>
      </div>
      {remaining > 0 && (
        <>
          <div className="mb-1 mt-4 text-base font-bold text-black">
            ⏱️ Offer Ends on: <span className="text-red-600">{endsOn}</span>
          </div>
          <div className="flex items-center justify-center gap-2" aria-label="Offer countdown">
            {parts.map((part, index) => (
              <div key={part.label} className="flex items-center gap-2">
                <div className="min-w-[66px] rounded-md border border-slate-300 bg-white px-2 py-1">
                  <div className="text-3xl font-bold text-red-600">{part.value}</div>
                  <div className="text-xs font-semibold text-slate-700">{part.label}</div>
                </div>
                {index < parts.length - 1 && <span className="text-xl font-bold text-primary">:</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";

// Button text of each option, as the legacy re-enrollment page words them.
const OPTION_BUTTON = {
  REGISTRATION_NEXT_GRADE: "Re-Enroll Today",
  REGISTRATION_REPEAT_GRADE: "Repeat the entire grade",
  REGISTRATION_IMPORVE_GRADES: "Take an individual course",
};

/**
 * Entry screen of the re-enrollment, laid out like the legacy student re-enrollment page: the student's name in a
 * page title bar, a big result card (promoted / "Don't give up") with the option buttons, and the
 * "Need Support?" card on the right. A student who already selected an option goes straight to the screen to
 * resume at (currentStep).
 */
export function ReEnrollmentOptions() {
  const router = useRouter();
  const { school, mode } = useParams();
  const { session, context, eligibility, inProgress } = useReEnrollmentContext();
  const select = useSelectReEnrollmentOption({ context, userId: session.userId });
  // resume=1 (login / coming back from the payment): continue at the step the student is on instead of showing the options.
  const [resume] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("resume") === "1");

  useEffect(() => {
    if (resume && inProgress && eligibility.currentStep) router.replace(reEnrollmentStepPath(school, eligibility.currentStep, mode));
  }, [resume, inProgress, eligibility.currentStep, router, school, mode]);

  if (resume && inProgress) return <FullScreenLoader />;

  const passed = eligibility.result === "PASS";
  const options = eligibility.options || [];

  async function choose(option) {
    if (select.isPending) return;
    try {
      const response = await select.mutateAsync(option.enrollmentType);
      if (!response) {
        toast.error(GENERIC_ERROR);
      } else if (response.status === "3") {
        expireSession(school);
      } else if (response.status !== STATUS_SUCCESS) {
        toast.error(response.message || "Could not select this option. Please try again.");
      } else {
        router.push(reEnrollmentStepPath(school, response.nextStep, mode));
      }
    } catch (err) {
      console.error("ReEnrollmentOptions select-option failed:", err);
      toast.error(GENERIC_ERROR);
    }
  }

  return (
    <>
      <PageTitle icon={User}>{eligibility.studentName || session.email}</PageTitle>
      <div className="grid gap-4 lg:grid-cols-[3fr_1fr]">
        <div className="rounded-[15px] bg-white px-4 py-8 shadow-lg sm:px-8">
          {passed ? (
            <div className="text-center">
              <h2 className="mb-3 text-[26px] font-bold text-black">Congratulations, Dear {eligibility.studentName}!</h2>
              <h6 className="mt-4 text-xl font-semibold text-slate-800">
                You have been <b className="text-black">promoted</b>
                {options[0]?.grade?.name && (
                  <>
                    {" "}to <span className="font-semibold">{options[0].grade.name}</span>
                  </>
                )}
              </h6>
            </div>
          ) : (
            <div className="mb-3 text-center">
              <h2 className="mb-2 text-[28px] font-bold text-black">Don&apos;t give up</h2>
              <h6 className="text-lg font-bold text-slate-500">Retake your courses and earn your way to the next grade</h6>
            </div>
          )}

          {passed && eligibility.progressionDiscount?.amount > 0 && <DiscountBanner discount={eligibility.progressionDiscount} />}

          <div className="mt-8 flex flex-col items-center gap-4">
            {options.map((option) => (
              <div key={option.enrollmentType} className="text-center">
                <ActionButton
                  onClick={() => choose(option)}
                  disabled={select.isPending}
                  className="min-w-[240px] rounded-[15px] px-6 py-2.5 text-base font-semibold"
                >
                  {select.isPending && select.variables === option.enrollmentType ? "Please wait…" : OPTION_BUTTON[option.enrollmentType] || "Continue"}
                </ActionButton>
                {option.learningProgramLabel && <p className="mt-1 text-xs font-semibold text-slate-500">{option.learningProgramLabel}</p>}
              </div>
            ))}
          </div>
        </div>
        <SupportCard uniqueId={session.uniqueId} />
      </div>
    </>
  );
}
