"use client";

import dynamic from "next/dynamic";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useContactCheck } from "@/hooks/useContactCheck";
import { StudentHomeK5 } from "@/components/k5/home/StudentHomeK5";
import { ReserveSeatForNextGrade } from "@/components/dashboard/ReserveSeatForNextGrade";
import { SystemTrainingPopup } from "@/components/dashboard/SystemTrainingPopup";
import { ForcedPasswordChange } from "@/components/dashboard/ForcedPasswordChange";
import { AppInstallPrompt } from "@/components/dashboard/AppInstallPrompt";
import { OutlookReminder } from "@/components/dashboard/OutlookReminder";
import { StudentHome } from "./StudentHome";

// Only fetched when the student has a contact problem to fix.
const ContactCheckModal = dynamic(() => import("@/components/contact-check/ContactCheckModal"), { ssr: false });

// Same URL for every grade: a Grade K–5 student (isK5) gets the K–5 planner home.
// The "Contact check" popup is mounted here once for all three looks (K–5, Grade 6–8 skin, standard). It comes
// first: the "Complete Your Profile" popup of the K–5 home waits until it is over, has nothing to show, or stands
// back for a live class / another popup (hooks/useContactCheck.js).
export function StudentHomeForGrade() {
  const { isK5, isMiddle } = useDashboardContext();
  const contactCheck = useContactCheck();
  return (
    <>
      {isK5 ? <StudentHomeK5 holdProfilePopup={!contactCheck.finished} /> : <StudentHome holdProfilePopup={!contactCheck.finished} />}
      {/* Next-grade re-enrollment / reserve a seat (legacy getReserveASeatForNextGrade), every grade band. */}
      <ReserveSeatForNextGrade />
      {/* School System Training popup + one-time welcome (legacy getStudentTimePreference), every grade band. */}
      <SystemTrainingPopup />
      {/* Password due / sibling still on the temporary password: the must-change Change Password popup. */}
      <ForcedPasswordChange />
      {/* "Install the app" popup (legacy initAppInstallNotification): after the contact check, never over a live class. */}
      <AppInstallPrompt hold={!contactCheck.finished} />
      {/* School email (Outlook) activation reminder with a 5-minute snooze (legacy renderOutlookModalOnDashboard). */}
      <OutlookReminder hold={!contactCheck.finished} />
      {contactCheck.state.phase === "open" && <ContactCheckModal check={contactCheck} band={isK5 ? (isMiddle ? "middle" : "elementary") : "high"} />}
    </>
  );
}