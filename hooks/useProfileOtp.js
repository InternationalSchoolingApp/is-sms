"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { sendProfileOtp, verifyProfileOtp } from "@/services/profileOtpApi";
import { callServer } from "@/utils/serverCall";

/**
 * My Profile P4 one-time codes for saved phone numbers (SMS / WhatsApp) and e-mails (services/profileOtpApi.js).
 * Keeps, per field + channel, whether a code was sent and the typed code. After a good code the profile reloads,
 * so the "Verified" mark comes from the backend (profileContactVerification).
 * Returns { state(fieldId, channel) -> { sent, code }, setCode, send(fieldId, channel, resend?), verify(fieldId, channel), busy }.
 */
export function useProfileOtp({ refetch }) {
  const [entries, setEntries] = useState({});
  const [busy, setBusy] = useState(null);
  const key = (fieldId, channel) => `${fieldId}:${channel}`;
  const patch = (k, values) => setEntries((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), ...values } }));
  const clean = (error) => String(error?.message || "Something went wrong.").replace(/^[A-Z_0-9]+:\s*/, "");

  const send = useCallback(
    async (fieldId, channel, resend = false) => {
      const k = key(fieldId, channel);
      if (busy) return;
      setBusy(`${k}:send`);
      try {
        await callServer(() => sendProfileOtp({ fieldId, channel, resend }));
        patch(k, { sent: true, code: "" });
        // Our own words: the backend message is cut short for e-mails ("Verification OTP sent to").
        toast.success(channel === "EMAIL" ? "We sent a code to this email." : channel === "WHATSAPP" ? "We sent a code on WhatsApp." : "We sent a code to this number.");
      } catch (error) {
        toast.error(clean(error));
      } finally {
        setBusy(null);
      }
    },
    [busy],
  );

  const verify = useCallback(
    async (fieldId, channel) => {
      const k = key(fieldId, channel);
      if (busy) return;
      setBusy(`${k}:verify`);
      try {
        await callServer(() => verifyProfileOtp({ fieldId, channel, code: entries[k]?.code }));
        await refetch?.();
        patch(k, { sent: false, code: "" });
        toast.success("Verified! Great job.");
      } catch (error) {
        toast.error(clean(error));
      } finally {
        setBusy(null);
      }
    },
    [busy, entries, refetch],
  );

  return {
    state: (fieldId, channel) => entries[key(fieldId, channel)] || { sent: false, code: "" },
    setCode: (fieldId, channel, code) => patch(key(fieldId, channel), { code: String(code).replace(/[^0-9]/g, "").slice(0, 6) }),
    send,
    verify,
    busy,
  };
}
