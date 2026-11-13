"use client";

import { InfoModal, getWelcomeBackMessage } from "@/components/student-enroll/InfoModal";

/**
 * The e-mail prompt of the teacher sign-up page: the e-mail already belongs to an account (is-user-available
 * statusCodes 0044 enabled / 0043 not verified / 02 declined, or stage-1's 0001) -> "Welcome back, log in to
 * continue" with the school's login link; for any other refusal that carries a message (0042 deleted account) the
 * backend's own message is shown.
 *
 * There is deliberately no "this e-mail appears to be invalid, continue?" prompt (the legacy teacher page had one):
 * is-user-available reports emailVerified=false whenever the deliverability check did not CONFIRM the address, and
 * with CONFIGURATION/EMAIL_VERIFY_FLAG off (the check is not run) that is every address, so the prompt would show
 * for everybody. The student sign-up has the same prompt switched off.
 */
export function TeacherEmailStatusModal({ status, loginHref, onClose }) {
  return (
    <InfoModal open={Boolean(status)} onOpenChange={(open) => !open && onClose()}>
      {status &&
        (status.useMessage && status.message ? (
          <p>{status.message}</p>
        ) : (
          getWelcomeBackMessage({ msgFlag: status.msgFlag, extra1: status.extra1 ?? "U", loginHref })
        ))}
    </InfoModal>
  );
}
