"use client";

import { useCallback } from "react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { buildChatSignInUrl } from "@/utils/chatLink";

/**
 * Opens the "Talk to us" chat (signed sign-in link into the chat app) in a new tab — the same link the right-hand
 * rail's Talk to us button uses, for buttons elsewhere on a page (e.g. Contact School Administrator).
 */
export function useTalkToUs() {
  const { context } = useDashboardContext();
  const chatUrl = context?.chatUrl;
  const uniqueId = context?.uniqueId;
  return useCallback(() => {
    const signInUrl = buildChatSignInUrl({ chatUrl, uniqueId, deploymentMode: process.env.NEXT_PUBLIC_DEPLOYMENT_MODE });
    if (signInUrl) window.open(signInUrl, "_blank", "noopener,noreferrer");
  }, [chatUrl, uniqueId]);
}
