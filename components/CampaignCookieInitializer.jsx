"use client";

import { useEffect } from "react";
import { captureMetaCookies, initializeCampaignCookies } from "@/utils/campaignCookies";
import { CONSENT_EVENT } from "@/utils/marketingConsent";

export default function CampaignCookieInitializer() {
  useEffect(() => {
    initializeCampaignCookies();
    // the visitor may accept after the page loaded: create the Meta cookies then
    window.addEventListener(CONSENT_EVENT, captureMetaCookies);
    return () => window.removeEventListener(CONSENT_EVENT, captureMetaCookies);
  }, []);

  return null;
}
