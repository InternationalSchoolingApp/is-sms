"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useCartCheckout } from "@/hooks/useCartCheckout";
import { useStudentAcademicYearExtension } from "@/hooks/useStudentAcademicYearExtension";
import { availAcademicYearExtension, getAcademicYearExtensionProceed } from "@/services/dashboardApi";
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import { expireSession } from "@/utils/logout";
import { OptimizedImage } from "@/components/common/OptimizedImage";

const STATUS_SESSION_OUT = "3";
const GENERIC_ERROR = "Something went wrong. Please try again.";

function courseImage(course, fallback) {
  if (course.imgURl) return course.imgURl;
  if (course.subjectIcon) return `${resolveBackendOrigin()}/static/theme2/images/subjects/${course.subjectIcon}`;
  return fallback;
}

// The legacy bgColor is a Bootstrap class; every course card uses the theme colour.
function CourseCard({ course, image, onClick, as: Tag = "button" }) {
  return (
    <Tag type={Tag === "button" ? "button" : undefined} onClick={onClick} className="block w-full overflow-hidden rounded-lg bg-primary text-left shadow-sm transition hover:shadow-md">
      <OptimizedImage src={image} alt="" width={400} height={300} sizes="(max-width: 640px) 100vw, 50vw" className="aspect-[4/3] h-auto w-full bg-white object-contain p-2" />
      <div className="p-2 text-white">
        <h5 className="text-sm font-semibold sm:text-base">{course.subjectName || "N/A"}</h5>
      </div>
    </Tag>
  );
}

function PageTitle({ children }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-4">
      <CalendarClock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <h1 className="text-lg font-extrabold text-black sm:text-xl">{children}</h1>
    </div>
  );
}

// getStudentAcademicYearExtentionDefaultTermsHtml(), minus the school-admin mailbox (a legacy global).
function extensionTerms(schoolName) {
  return [
    "We recommend that you consult with the School Admin before opting for Paid Academic Year Extension.",
    "Paid academic year extension can be availed for a period of a maximum of 4 weeks.",
    "The school provides no other form of an academic year extension.",
    'In case you are not able to complete this course even after availing paid extension for 4 weeks, no credit would be provided for this course, and it would be graded as Incomplete "(I)" in your annual transcript.',
    "Under any circumstances/conditions, fee paid for Academic Year Extension is non-refundable, non-transferable and non-adjustable.",
    `Students (or their parents/guardians) are responsible for regularly checking the website for any upcoming notifications. ${schoolName} will not send notifications or updates separately to students (or their parents/guardians).`,
    `${schoolName} reserves the right to amend, limit or revoke any offers or terms at any time prior to purchase and accepts no responsibility for any technical issues resulting in the failure to pay.`,
  ];
}

// studentAcademicYearExtentionBuildProceedData(): which of the four descriptions applies.
function buildProceed(response, subjectId) {
  const details = response?.details ?? {};
  const subject = details.academicYearExtension ?? {};
  const data = {
    subjectId: subject.subjectId ?? subjectId,
    subjectName: subject.subjectName || "N/A",
    imgURl: subject.imgURl,
    subjectIcon: subject.subjectIcon,
    extentionAvailStatus: subject.extentionAvailStatus || "N",
    currentExtentionType: subject.currentExtentionType || "",
    extension2CanTakeStatus: subject.extension2CanTakeStatus || "YES",
    extension1Status: details.extension1Status || "Yes",
    extensionCount: subject.extensionCount || 0,
    extentionCost: subject.extentionCost || "50",
    studentStandardId: subject.studentStandardId ?? "",
  };
  data.showNotEligible = data.extension2CanTakeStatus === "NO" || data.extension1Status === "No";
  data.notEligibleMessage =
    data.extension1Status === "No"
      ? `You can opt for an extension for ${data.subjectName} after the duration of your academic year is complete.`
      : `You are not eligible to opt for an extension for ${data.subjectName}.`;
  data.showExtension1 = !data.showNotEligible && data.extentionAvailStatus === "N" && data.currentExtentionType === "EXTENSION-1";
  data.showPaidExtension = !data.showNotEligible && !data.showExtension1 && data.extentionAvailStatus === "N";
  return data;
}

function ExtensionDetail({ data, image, busy, afterExtension1, onAvail, onBack }) {
  const cost = `USD ${data.extentionCost}`;
  const description = (() => {
    if (data.showNotEligible) return <p className="font-semibold text-primary">{data.notEligibleMessage}</p>;
    if (data.showExtension1 && !afterExtension1) {
      return (
        <>
          <p className="font-semibold text-primary">
            You have availed {data.extensionCount} out of 1 extension from Extension-1.
            <br />
            By availing Extension-1 you will get an extended period of 2 weeks to complete the credit of the course, without any additional fee.
          </p>
          <button type="button" disabled={busy} onClick={() => onAvail("EXTENSION-1")} className="mt-3 rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-50">
            Avail EXTENSION-1
          </button>
        </>
      );
    }
    if (data.showExtension1 || data.showPaidExtension) {
      const label = data.showExtension1 ? "Extension-2" : "Paid Extension";
      return (
        <>
          <p className="font-semibold text-primary">
            You have availed {data.extensionCount} out of 4 extension from {label}.
            <br />
            Pay {cost} to avail {label}.
            <br />
            By availing {label} you will get an extended period of 1 week to complete the credit of the course.
          </p>
          <button type="button" disabled={busy} onClick={() => onAvail("EXTENSION-2")} className="mt-3 rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-50">
            Avail {data.showExtension1 ? "EXTENSION-2" : "Paid Extension"}
          </button>
        </>
      );
    }
    return <p className="font-semibold text-primary">You have already availed all Extensions for {data.subjectName}</p>;
  })();

  return (
    <div className="mx-auto w-full">
      <div className="flex items-start justify-between gap-2">
        <PageTitle>Extend Academic Year for {data.subjectName}</PageTitle>
        <button type="button" onClick={onBack} className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <div className="w-full max-w-[14rem]">
            <CourseCard as="div" course={data} image={image} />
          </div>
          <div className="text-black">
            <h2 className="mb-2 text-lg font-bold">{data.subjectName}</h2>
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Course Extension (sidebar pageLink academic-year-extention) — legacy studentAcademicYearExtention.js
 * + studentAcademicYearExtentionContent.js: the course list, then per course the extension screen.
 * Extension-1 (free, 2 weeks) is confirmed and availed in place; the paid extension raises an
 * EXTENSION_FEE payment, shows the Terms and Conditions and runs the shared payment-gateway flow
 * (useCartCheckout), as the cart does.
 */
export function AcademicYearExtension() {
  const { context, logoUrl } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const { isLoading, message, courses, refetch } = useStudentAcademicYearExtension({ schoolUUID, userId });
  const [proceeding, setProceeding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [afterExtension1, setAfterExtension1] = useState(false);
  const [confirmExtension1, setConfirmExtension1] = useState(false);
  const [availing, setAvailing] = useState(false);
  const [terms, setTerms] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const checkout = useCartCheckout({
    context,
    onPaid: () => {
      setTerms(null);
      setSelected(null);
      refetch();
      toast.success("Payment received.");
    },
  });

  async function openCourse(course) {
    if (proceeding) return;
    setProceeding(true);
    try {
      const response = await getAcademicYearExtensionProceed({ schoolUUID, userId, subjectId: course.subjectId });
      if (!response) {
        toast.error(GENERIC_ERROR);
        return;
      }
      if (String(response.status) === STATUS_SESSION_OUT) {
        expireSession(schoolUUID);
        return;
      }
      setAfterExtension1(false);
      setSelected({ data: buildProceed(response, course.subjectId), image: courseImage(response.details?.academicYearExtension ?? course, logoUrl) });
    } finally {
      setProceeding(false);
    }
  }

  async function avail(type) {
    if (availing) return;
    setConfirmExtension1(false);
    setAvailing(true);
    try {
      const response = await availAcademicYearExtension({
        schoolUUID,
        userId,
        studentStandardId: selected.data.studentStandardId,
        subjectId: selected.data.subjectId,
        currentExtentionType: type,
      });
      if (String(response?.status) === STATUS_SESSION_OUT) {
        expireSession(schoolUUID);
        return;
      }
      // Success is statusCode "1" (status stays "0" in this backend method).
      if (String(response?.statusCode) !== "1") {
        toast.error(response?.message || "Unable to avail extension.");
        return;
      }
      if (type === "EXTENSION-1") {
        toast.success(response.details?.message || response.message || "Extension-1 availed successfully.");
        setAfterExtension1(true);
        return;
      }
      const upid = response.details?.userPaymentDetailsId;
      if (!upid) {
        toast.error("Unable to avail extension.");
        return;
      }
      setAgreed(false);
      setTerms({ userPaymentDetailsId: upid });
    } catch (err) {
      console.error("academic-year-extention-avail failed:", err);
      toast.error(GENERIC_ERROR);
    } finally {
      setAvailing(false);
    }
  }

  const busy = availing || checkout.preparing;
  const schoolName = context?.schoolName || "School";

  return (
    <>
      {selected ? (
        <ExtensionDetail
          data={selected.data}
          image={selected.image}
          busy={busy}
          afterExtension1={afterExtension1}
          onAvail={(type) => (type === "EXTENSION-1" ? setConfirmExtension1(true) : avail(type))}
          onBack={() => setSelected(null)}
        />
      ) : (
        <div className="mx-auto w-full">
          <PageTitle>Academic Year Extension</PageTitle>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            {!context || isLoading ? (
              <p className="py-8 text-center text-lg font-bold text-primary">Loading…</p>
            ) : (
              <>
                <h2 className="mb-4 text-center text-lg font-bold text-primary sm:text-xl">{message || "N/A"}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {courses.map((course) => (
                    <CourseCard key={course.subjectId} course={course} image={courseImage(course, logoUrl)} onClick={() => openCourse(course)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={confirmExtension1} onOpenChange={setConfirmExtension1}>
        <DialogContent className="text-center sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Are you sure you want to avail Extension-1?</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center gap-3">
            <button type="button" onClick={() => setConfirmExtension1(false)} className="rounded-lg bg-red-600 px-5 py-2 font-bold text-white">
              No
            </button>
            <button type="button" onClick={() => avail("EXTENSION-1")} className="rounded-lg bg-green-600 px-5 py-2 font-bold text-white">
              Yes
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(terms) && !checkout.picker} onOpenChange={(open) => !open && setTerms(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Terms and Conditions</DialogTitle>
          </DialogHeader>
          <p className="font-bold text-black">Please note the important fee refund policy and terms &amp; conditions before extending academic year:</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-black">
            {extensionTerms(schoolName).map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <label className="flex flex-1 cursor-pointer items-start gap-2 text-sm text-black">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4" />
              I confirm that I have read and agree to the above-mentioned fee refund policy and terms &amp; conditions.
            </label>
            <button
              type="button"
              disabled={!agreed || checkout.preparing}
              onClick={() => checkout.start(terms.userPaymentDetailsId)}
              className="rounded-lg bg-green-600 px-5 py-2 font-bold text-white disabled:opacity-50"
            >
              {checkout.preparing ? "Please wait…" : "Pay Now"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {context && (
        <PaymentGatewayPickerModal
          open={Boolean(checkout.picker)}
          onOpenChange={(open) => !open && checkout.closePicker()}
          details={checkout.picker?.details}
          airwallexMethods={checkout.picker?.methods}
          payerCountryCode={checkout.picker?.countryCode}
          schoolNumericId={context.schoolNumericId}
          schoolName={context.schoolName}
          busy={checkout.launching}
          onPay={checkout.launchGateway}
          onUploadProof={checkout.uploadProof}
          onSubmitOffline={checkout.submitOffline}
        />
      )}
      {(proceeding || availing || checkout.preparing || checkout.processing) && (
        <FullScreenLoader message={checkout.processing ? "Payment is under process..." : undefined} />
      )}
      <Dialog open={checkout.incomplete} onOpenChange={(open) => !open && checkout.dismissIncomplete()}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Oops!</DialogTitle>
          </DialogHeader>
          <h3 className="text-lg font-semibold text-red-600">Payment Incomplete</h3>
        </DialogContent>
      </Dialog>
      <Dialog
        open={checkout.underReview}
        onOpenChange={(open) => {
          if (open) return;
          checkout.dismissUnderReview();
          setTerms(null);
          setSelected(null);
          refetch();
        }}
      >
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle>Your payment is under review.</DialogTitle>
          </DialogHeader>
          <p className="text-black/70">Your extension will be applied once the payment is received.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
