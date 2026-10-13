"use client";

import { useEffect } from "react";
import Script from "next/script";
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import { CONSENT_EVENT, useMarketingConsent } from "@/utils/marketingConsent";

// Meta Conversions API client library 1.3.2, self-hosted from public/vendor/meta (see README.txt there). Creates /
// upgrades the _fbp, _fbc and _fbi cookies (with Meta's appendix) so the signup can send them to the backend.
const META_PARAM_BUILDER_SRC = "/vendor/meta/clientParamBuilder.bundle.js?v=1.3.2";

// The caller's own address as our backend sees it (IPv6 if it connected over IPv6); no third party.
async function getClientIp() {
  try {
    const res = await fetch(`${resolveBackendOrigin()}/api/v1/ip-location/ip`, { credentials: "include" });
    const ip = res.ok ? (await res.text()).trim() : "";
    return /^[0-9a-fA-F:.]+$/.test(ip) ? ip : "";
  } catch {
    return "";
  }
}

// The library logs "Invalid IP address" when its IP function returns nothing usable (endpoint down or not yet
// deployed), so the IP is fetched first and an IP function is passed only when it is valid.
async function collectMetaParams() {
  try {
    const ip = await getClientIp();
    await window.clientParamBuilder?.processAndCollectAllParams(window.location.href, ip ? () => ip : undefined);
  } catch {
    // tracking must never break the page
  }
}

// Loads only after the visitor accepted marketing cookies (opt-in), and tells the Pixel about every change.
export function MetaParamBuilder() {
  const consent = useMarketingConsent();

  useEffect(() => {
    const onConsent = (event) => {
      window.fbq?.("consent", event.detail === "granted" ? "grant" : "revoke");
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  if (consent !== "granted") return null;

  return (
    <Script
      id="meta-capi-param-builder"
      src={META_PARAM_BUILDER_SRC}
      strategy="afterInteractive"
      onReady={collectMetaParams}
    />
  );
}
