"use client";

import { useEffect } from "react";
import { initializeCampaignCookies } from "@/utils/campaignCookies";

export default function CampaignCookieInitializer() {
  useEffect(() => {
    initializeCampaignCookies();
  }, []);

  return null;
}