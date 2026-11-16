"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { createContactCheckFlow, problemsOf } from "@/utils/contactCheckFlow";
import { isSessionExpired, markSessionExpired } from "@/utils/sessionState";
import {
  loadContactSummary,
  loadPendingContactChecks,
  sendContactCheckCode,
  skipContactCheck,
  stopContactCheckWhatsapp,
  verifyContactCheckCode,
} from "@/services/contactCheckApi";

/**
 * "My contact details" on My Profile (legacy contactCheck.js mountContactCheckSummary / loadContactCheckSummary):
 * one row per channel (email, mobile, WhatsApp, app), a button only where something is wrong. The card stays hidden
 * when the server has nothing to show (feature off, failed, no contacts) and when no contact has a problem or an action:
 * it is never empty and never a list of details that need nothing from the user.
 *
 * "Fix now" (legacy openContactCheckReview): the same fix popup as on the dashboard, opened by hand for that one
 * problem (flow.openManual): closable, no "Later". It is read again when the popup ends.
 *
 * Returns { rows, show, flow, state, fix(reviewId) }; flow / state are for <ContactCheckModal check={{ flow, state }} />.
 */

const NEEDS_ATTENTION = ["INVALID", "NOT_REACHABLE", "APP_NOT_INSTALLED"];
export const needsAttention = (contact) => Boolean(contact) && NEEDS_ATTENTION.includes(contact.status);

// The server actions never throw; a signed-out answer opens the global dialog and the popup steps aside.
function buildApi(getFlow) {
  const guard = (action) => async (request) => {
    if (isSessionExpired()) {
      getFlow()?.abandon();
      return { ok: false, refused: false, message: "Your session has been logged out" };
    }
    const result = await action(request);
    if (result?.sessionExpired) {
      markSessionExpired();
      getFlow()?.abandon();
    }
    return result;
  };
  return {
    pending: guard(loadPendingContactChecks),
    sendCode: guard(sendContactCheckCode),
    verify: guard(verifyContactCheckCode),
    noWhatsapp: guard(stopContactCheckWhatsapp),
    later: guard(skipContactCheck),
  };
}

const noSubscribe = () => () => {};
const idle = Object.freeze({ phase: "idle", items: [], index: 0, step: "", busy: false, alert: "", manual: false });

export function useContactSummary() {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const userId = context?.userId;
  const enabled = Boolean(userId) && (context?.role || "student") === "student" && dummy.settled && !dummy.enabled;

  const query = useQuery({
    queryKey: ["contact-summary", userId],
    queryFn: async () => {
      const result = await loadContactSummary();
      if (result?.sessionExpired) markSessionExpired();
      return result?.ok && Array.isArray(result.data?.contacts) ? result.data.contacts.filter((c) => c && c.channel) : [];
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const rows = query.data ?? [];

  const [flow, setFlow] = useState(null);
  const state = useSyncExternalStore(flow ? flow.subscribe : noSubscribe, flow ? flow.getState : () => idle, () => idle);
  const [opening, setOpening] = useState(false);

  const fix = useCallback(
    async (reviewId) => {
      if (opening || flow) return;
      setOpening(true);
      try {
        let created = null;
        const api = buildApi(() => created);
        const pending = await api.pending();
        const item = pending?.ok ? problemsOf({ ...pending.data, enabled: true }).find((i) => String(i.id) === String(reviewId)) : null;
        if (!pending?.ok) {
          toast.error(pending?.message || "This could not be done just now. Please try again in a minute.");
          query.refetch();
          return;
        }
        if (!item) {
          toast.success("This contact detail no longer needs fixing.");
          query.refetch();
          return;
        }
        created = createContactCheckFlow({ api });
        // The popup ended (finished or abandoned): drop it and read the card again so it shows how things stand now.
        const stop = created.subscribe(() => {
          if (created.getState().phase !== "finished") return;
          stop();
          setFlow(null);
          query.refetch();
        });
        created.openManual(item);
        setFlow(created);
      } finally {
        setOpening(false);
      }
    },
    [opening, flow, query],
  );

  return {
    rows,
    show: rows.some(needsAttention),
    loading: enabled && query.isLoading,
    flow,
    state,
    opening,
    fix,
  };
}
