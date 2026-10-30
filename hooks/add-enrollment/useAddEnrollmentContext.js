"use client";

import { useAddStudentDetailsPrefill } from "@/hooks/add-enrollment/useAddStage1";
import { STATUS_REDIRECT_TO_DASHBOARD } from "@/hooks/useStudentReview";
import { enrollAnotherChild, getAddEnrollmentProcess, getAddEnrollmentThankYou } from "@/services/addEnrollmentBackendApi";
import { getPublicSchoolInfo } from "@/services/studentSignupApi";
import {
  clearAddEnrollmentChildState,
  loadAddEnrollmentChildUniqueId,
  loadAddEnrollmentRollNo,
  saveAddEnrollmentChildUniqueId,
  saveAddEnrollmentRollNo,
} from "@/utils/addEnrollmentStorage";
import { isFirstPayment, normalizeAddSignupPage } from "@/utils/addEnrollmentSteps";
import { getLearningProgramShortCode } from "@/utils/learningProgramTheme";
import { callLocationForPaymentPromise, loadLocationGlobals } from "@/utils/locationFinder";
import { getSchoolSettingsLinks, getSchoolSettingsTechnical } from "@/utils/schoolSettings";
import { extractRootCss } from "@/utils/schoolColorTheme";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

/**
 * Context for the "Add Another Student" wizard
 * (/{school}/add-enrollment/{parentId}/{sessionUserId}/step/...).
 *
 * Mirrors hooks/useEnrollmentContext.js (logo, WhatsApp number, enrollment
 * process -> customPaymentEnabled/signupType, payer-location capture, learning
 * program from the saved student) with ONE difference: the student being
 * enrolled is NOT the logged-in session user.
 *   - session.userId/uniqueId -> the CALLER (the parent themselves, or a
 *                         sibling student adding a brother/sister) — only used
 *                         to call enrollAnotherChild.
 *   - childUserId/childUniqueId -> the child actually being enrolled, read
 *                         from enrollAnotherChild()'s response (and replaced by
 *                         the save response after Stage 1), never from the
 *                         session. Everything the main context keys off
 *                         session.userId/uniqueId is keyed off these instead.
 *
 * `parentId` is the URL param (always the real parent, in both caller
 * scenarios). enrollAnotherChild() resumes the parent's existing
 * partially-enrolled child or creates a new one — safe to call on every
 * mount/refresh.
 */
const AddEnrollmentContext = createContext(null);

// Whether this page load is a fresh start of the wizard (/api/sso appends fresh=1 for the dashboard button / the
// enrollment link). Read once per page load, then the marker is dropped from the URL so a reload is NOT fresh.
let freshEntry;
function isFreshEntry() {
  if (freshEntry === undefined) {
    const url = new URL(window.location.href);
    freshEntry = url.searchParams.get("fresh") === "1";
    if (freshEntry) {
      url.searchParams.delete("fresh");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }
  return freshEntry;
}

function useResolveAddEnrollmentContext() {
  const { school, parentId, sessionUserId } = useParams();
  const { data: session, status } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);
  const [rootcss, setRootcss] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState(undefined);
  const authenticated =
    status === "authenticated" && Boolean(session?.userId && session?.schoolUUID && session?.uniqueId);

  // Refresh guard: before enrollAnotherChild (which could reserve a brand-new child), ask the thank-you details API
  // about the child this tab was enrolling (uniqueId + roll number kept in sessionStorage). It answers status "1"
  // only when that child has a successful payment (e.g. paid via the payment link), so a paid child goes straight
  // to the thank-you page and no new child is created. This looks at the payment itself, so unlike
  // enrollment/process it does not lag behind the payment.
  const paidCheck = useQuery({
    queryKey: ["add-enrollment-paid-check", session?.schoolUUID, parentId],
    queryFn: async () => {
      // A fresh start must not pick up a child remembered from an earlier run in this tab.
      if (isFreshEntry()) {
        clearAddEnrollmentChildState(session.schoolUUID, parentId);
        return { storedUniqueId: "", paid: false };
      }
      const storedUniqueId = loadAddEnrollmentChildUniqueId(session.schoolUUID, parentId);
      const storedRollNo = loadAddEnrollmentRollNo(session.schoolUUID, parentId);
      if (!storedUniqueId && !storedRollNo) return { storedUniqueId: "", paid: false };
      // NOTE: enrollment/process's statusCode REDIRECT_TO_DASHBOOARD ("registration complete") used to be
      // trusted here directly, without the thank-you check below. Confirmed bug: a custom-plan child can be
      // marked REDIRECT_TO_DASHBOOARD before actually paying, which sent an unpaid child straight to the
      // thank-you replay, which then failed with "Payment not completed". So, like the enrollmentCompleted
      // signal in useResolveAddEnrollmentContext below, this always falls through to the thank-you details
      // API, which looks at the payment itself. Only a FIRST payment (isFirstPayment = "Y": the
      // registration fee of a fresh enrollment) takes the user to the thank-you page; for anything else the
      // wizard stays on the page the user landed on.
      const res = await getAddEnrollmentThankYou(session.schoolUUID, {
        parentId,
        sessionUserId: session.userId,
        sessionUniqueId: session.uniqueId,
        studentRollNumber: storedRollNo,
        childUniqueId: storedUniqueId,
      });
      // TEMP-DEBUG: which stored child the refresh checked and what the thank-you API said
      console.log("[add-enrollment] paidCheck", { storedUniqueId, storedRollNo, message: res?.message, status: res?.status, isFirstPayment: res?.data?.isFirstPayment });
      return { storedUniqueId, paid: res?.status === "1" && isFirstPayment(res.data) };
    },
    enabled: Boolean(authenticated && parentId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const paidBeforeEnroll = paidCheck.data?.paid === true;

  const enrollChild = useQuery({
    queryKey: ["add-enrollment-child", session?.schoolUUID, parentId, session?.uniqueId],
    queryFn: async () => {
      const response = await enrollAnotherChild(
        session.schoolUUID,
        parentId,
        session.uniqueId,
        // On a refresh childData is still empty, so fall back to the roll number kept in sessionStorage: the
        // backend answers S003 (already paid) for it instead of reserving a brand-new child.
        childData?.rollNo || loadAddEnrollmentRollNo(session.schoolUUID, parentId),
        // Only a fresh start may reserve a new child; on a reload the backend resumes the in-progress child or
        // returns the paid one (S003), and never creates a new user.
        isFreshEntry()
      );
      // TEMP-DEBUG: what refresh sent and what the backend answered (S003 = already paid, S002 = resumed, S001/other = new)
      console.log("[add-enrollment] enroll/another/child", {
        sentRollNo: childData?.rollNo || loadAddEnrollmentRollNo(session.schoolUUID, parentId),
        sessionUniqueId: session.uniqueId,
        statusCode: response?.statusCode,
        message: response?.message,
        response,
      });
      saveAddEnrollmentRollNo(session.schoolUUID, parentId, response?.data?.rollNo);
      return response;
    },
    enabled: Boolean(authenticated && parentId && paidCheck.isFetched && !paidBeforeEnroll),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const childData = enrollChild.data?.data;
  const childUserId = childData?.userId;
  const childUniqueId = childData?.uniqueId;
  const childRollNo = childData?.rollNo;

  useEffect(() => {
    saveAddEnrollmentChildUniqueId(session?.schoolUUID, parentId, childUniqueId);
  }, [session?.schoolUUID, parentId, childUniqueId]);

  // The roll number shown as "Student Id" can arrive after the first enrollAnotherChild call (the Stage 1 save
  // swaps the child into this cache), so persist it whenever it changes, not only in that query's queryFn.
  // The payment-response page reads it back to ask for the thank-you details.
  useEffect(() => {
    saveAddEnrollmentRollNo(session?.schoolUUID, parentId, childRollNo);
  }, [session?.schoolUUID, parentId, childRollNo]);

  // learningProgram comes from the CHILD's saved details (get-student-details), mapped back to
  // our short code — same shared cache entry Stage 1/2 use, so no extra network call.
  const prefill = useAddStudentDetailsPrefill({
    context: { schoolUUID: session?.schoolUUID },
    userId: childUserId,
  });

  // customPaymentEnabled / signupType / REDIRECT for the child, like the main context does for
  // the logged-in student (student/enrollment/process keyed by the student's own uniqueId).
  const enrollmentProcess = useQuery({
    queryKey: ["add-enrollment-process", session?.schoolUUID, childUniqueId],
    queryFn: async () => {
      const response = await getAddEnrollmentProcess(session.schoolUUID, childUniqueId);
      // TEMP-DEBUG: enrollment/process response (remove after checking statusCode / redirectTo)
      console.log("[add-enrollment] enrollment/process response", { childUniqueId, response });
      return response;
    },
    enabled: Boolean(authenticated && childUniqueId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // enrollment/process (asked with ?from=add-enrollment) answers statusCode REDIRECT_TO_DASHBOOARD once the child's
  // enrollment is complete. That statusCode is the only completion signal here: a bare {status:"REDIRECT",
  // redirectTo:"dashboard"} (no statusCode) also comes back for a freshly reserved child whose standard has not
  // started, so honoring it sent brand-new, unpaid children to the thank-you page. A withdrawn child carries the
  // same statusCode with redirectTo "login": surfaced as an error (the session here is the parent's/sibling's).
  const enrollmentCompleted =
    enrollmentProcess.data?.statusCode === STATUS_REDIRECT_TO_DASHBOARD && enrollmentProcess.data?.redirectTo !== "login";
  const processRedirect =
    enrollmentProcess.data?.statusCode === STATUS_REDIRECT_TO_DASHBOARD ? enrollmentProcess.data : null;
  // enrollment/process says REDIRECT -> dashboard once the child's enrollment is complete (e.g. paid from the
  // payment link in another browser). The wizard stays where it is and shows its thank-you view in place of
  // the steps (see AddEnrollmentChrome) instead of navigating to the :8080 dashboard. markCompleted lets the
  // review step flip the same switch when the backend answers REDIRECT_TO_DASHBOOARD mid-payment.
  const [completedLocal, setCompletedLocal] = useState(false);
  // S003 = enroll/another/child found the child this tab was enrolling already paid (e.g. via the payment link).
  const alreadyPaid = enrollChild.data?.statusCode === "S003";
  // Every one of these only CLAIMS the child has paid / finished: S003 from enroll/another/child,
  // REDIRECT_TO_DASHBOOARD from enrollment/process, and markCompleted (the review step's stage-status poll
  // answering "already registered with school", or a payment call answering REDIRECT_TO_DASHBOOARD).
  // None of them means a payment landed: a custom-plan child is "registered" / "complete" as soon as the
  // plan is confirmed, while the fee is still unpaid. Since the thank-you page can only render when the
  // thank-you details API reports a FIRST payment, that API is the single gate for all of them — otherwise
  // such a child is bounced to the thank-you replay, which then fails with "Payment not completed".
  const completionSignal = alreadyPaid || enrollmentCompleted || completedLocal;
  const firstPaymentCheck = useQuery({
    // completedLocal is part of the key so a payment that completes in this tab re-asks the API instead of
    // reusing the "not paid yet" answer an earlier signal already cached under Infinity staleTime.
    queryKey: ["add-enrollment-first-payment", session?.schoolUUID, parentId, childUniqueId, completedLocal],
    queryFn: async () => {
      const res = await getAddEnrollmentThankYou(session.schoolUUID, {
        parentId,
        sessionUserId: session.userId,
        sessionUniqueId: session.uniqueId,
        studentRollNumber: childRollNo || loadAddEnrollmentRollNo(session.schoolUUID, parentId),
        childUniqueId,
      });
      console.log("[add-enrollment] first-payment check", { childUniqueId, status: res?.status, isFirstPayment: res?.data?.isFirstPayment });
      return res?.status === "1" && isFirstPayment(res.data);
    },
    enabled: Boolean(authenticated && completionSignal && childUniqueId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const firstPaymentDone = paidBeforeEnroll || (completionSignal && firstPaymentCheck.data === true);
  // while the check runs the wizard is held back (loader); a "not a first payment" answer lets it render normally
  const completionPending = completionSignal && !firstPaymentCheck.isFetched && !firstPaymentCheck.isError;
  const completed = firstPaymentDone;


  useEffect(() => {
    if (!session?.schoolNumericId) return;
    let cancelled = false;
    getSchoolSettingsLinks(session.schoolNumericId)
      .then((links) => {
        if (!cancelled && links?.logoUrl) setLogoUrl(links.logoUrl);
      })
      .catch((err) => console.error("School links fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.schoolNumericId]);

  // Per-school color theme (rootcss custom-properties block) — see useEnrollmentContext.js.
  useEffect(() => {
    if (!session?.schoolNumericId) return;
    let cancelled = false;
    getSchoolSettingsTechnical(session.schoolNumericId)
      .then((technical) => {
        if (!cancelled) setRootcss(extractRootCss(technical?.parentColor));
      })
      .catch((err) => console.error("School color theme fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.schoolNumericId]);

  // Support number for the mobile action bar's WhatsApp button.
  useEffect(() => {
    if (!session?.schoolUUID) return;
    let cancelled = false;
    getPublicSchoolInfo(session.schoolUUID)
      .then((info) => {
        if (!cancelled && info?.whatsAppNumber) setWhatsAppNumber(info.whatsAppNumber);
      })
      .catch((err) => console.error("School public info fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.schoolUUID]);

  const processReady = !childUniqueId || enrollmentProcess.isFetched;
  const ready =
    authenticated &&
    enrollChild.isFetched &&
    Boolean(childData) &&
    processReady &&
    !firstPaymentDone &&
    !completionPending &&
    processRedirect?.redirectTo !== "login";

  // Same payer-location capture as the main context, so the payment step finds it already there.
  useEffect(() => {
    if (!ready) return;
    loadLocationGlobals({ schoolUUID: session.schoolUUID, userId: childUserId })
      .then(() => callLocationForPaymentPromise())
      .catch((err) => console.error("Payer location capture failed:", err));
  }, [ready, session?.schoolUUID, childUserId]);

  const context = ready
    ? {
        schoolUUID: session.schoolUUID,
        schoolNumericId: session.schoolNumericId,
        schoolName: session.schoolName,
        whatsAppNumber,
        parentId,
        sessionUserId,
        enrollmentFor: "enrollment",
        customPaymentEnabled: enrollmentProcess.data?.customPaymentEnabled === true,
        // Resume step comes from enrollAnotherChild, mapped from the backend's 4-step numbering
        // onto this wizard's 3 steps (4 = review -> 3); see normalizeAddSignupPage.
        signupPage: normalizeAddSignupPage(childData.signupPage),
        signupType: enrollmentProcess.data?.signupType,
        learningProgram: prefill.data?.learningProgram
          ? getLearningProgramShortCode(prefill.data.learningProgram)
          : "O",
        // false until the child's learning program is saved (Step 1); the wizard header shows a generic title till then.
        learningProgramSaved: Boolean(prefill.data?.learningProgram),
      }
    : null;

  return {
    status,
    session,
    context,
    logoUrl,
    rootcss,
    ready,
    // Child identity — stage pages use these instead of session.userId/uniqueId.
    childUserId,
    childUniqueId: childUniqueId || (paidBeforeEnroll ? paidCheck.data.storedUniqueId : undefined),
    childRollNo,
    completed,
    // read straight off enrollment/process: `context` is null once the wizard has been replaced by the completed view
    customPaymentEnabled: enrollmentProcess.data?.customPaymentEnabled === true,
    markCompleted: () => setCompletedLocal(true),
    // customPaymentEnabled is read once, at the start of the wizard — but a custom plan is attached later
    // (at/after course selection, or by an admin), and this provider lives in the step layout, so it never
    // remounts between steps. The review step re-asks before it decides which fee layout to render.
    refetchEnrollmentProcess: enrollmentProcess.refetch,
    // E005: a reload with nothing to resume and no paid child (only a fresh "Add child" entry may create one)
    isError: enrollChild.isError || enrollChild.data?.statusCode === "E005" || processRedirect?.redirectTo === "login",
  };
}

export function AddEnrollmentProvider({ children }) {
  const value = useResolveAddEnrollmentContext();
  return <AddEnrollmentContext.Provider value={value}>{children}</AddEnrollmentContext.Provider>;
}

export function useAddEnrollmentContext() {
  const value = useContext(AddEnrollmentContext);
  if (value === null) {
    throw new Error("useAddEnrollmentContext must be used within an AddEnrollmentProvider");
  }
  return value;
}
