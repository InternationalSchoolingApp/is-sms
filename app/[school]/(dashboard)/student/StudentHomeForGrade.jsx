"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useContactCheck } from "@/hooks/useContactCheck";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useReEnrollmentEntry } from "@/hooks/useReEnrollmentEntry";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { FullScreenLoader } from "@/components/common/Loader";
import { StudentHomeK5 } from "@/components/k5/home/StudentHomeK5";
import { ReserveSeatForNextGrade } from "@/components/dashboard/ReserveSeatForNextGrade";
import { SystemTrainingPopup } from "@/components/dashboard/SystemTrainingPopup";
import { ForcedPasswordChange } from "@/components/dashboard/ForcedPasswordChange";
import { StudentHome } from "./StudentHome";

// Only fetched when the student has a contact problem to fix.
const ContactCheckModal = dynamic(() => import("@/components/contact-check/ContactCheckModal"), { ssr: false });

// Same URL for every grade: a Grade K–5 student (isK5) gets the K–5 planner home.
// The "Contact check" popup is mounted here once for all three looks (K–5, Grade 6–8 skin, standard). It comes
// first: the "Complete Your Profile" popup of the K–5 home waits until it is over, has nothing to show, or stands
// back for a live class / another popup (hooks/useContactCheck.js).
//
// A graduated student who has to re-enroll is sent to the re-enrollment pages instead (useReEnrollmentEntry): the home
// (and with it the contact check popup) is not shown while that is being decided or the redirect is under way.
export function StudentHomeForGrade() {
  const { school } = useParams();
  const { isK5, isMiddle, context } = useDashboardContext();
  const contactCheck = useContactCheck();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const { checking } = useReEnrollmentEntry({
    school,
    schoolUUID: context?.schoolUUID,
    userId: context?.userId,
    studentGraduate: dashboardData.studentGraduate,
    dashboardLoading: dashboardData.isLoading,
    dummy: dummy.enabled,
  });

  if (checking) return <FullScreenLoader />;
  return (
    <>
      {isK5 ? <StudentHomeK5 holdProfilePopup={!contactCheck.finished} /> : <StudentHome />}
      {/* Next-grade re-enrollment / reserve a seat (legacy getReserveASeatForNextGrade), every grade band. */}
      <ReserveSeatForNextGrade />
      {/* School System Training popup + one-time welcome (legacy getStudentTimePreference), every grade band. */}
      <SystemTrainingPopup />
      {/* Password due / sibling still on the temporary password: the must-change Change Password popup. */}
      <ForcedPasswordChange />
      {contactCheck.state.phase === "open" && <ContactCheckModal check={contactCheck} band={isK5 ? (isMiddle ? "middle" : "elementary") : "high"} />}
    </>
  );
}