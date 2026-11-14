import { SystemTrainingReschedule } from "@/components/dashboard/SystemTrainingReschedule";

// Reschedule Your School System Training - the legacy /join-orientation?clickFrom=RESCHEDULE page (Orientation.jsp).
// Overrides the student/[...module] catch-all; it is opened from the dashboard's School System Training popup.
export default function SystemTrainingReschedulePage() {
  return <SystemTrainingReschedule />;
}
