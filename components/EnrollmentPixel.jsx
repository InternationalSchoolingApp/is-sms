"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Enrollment flow only: /<school>/enroll, /<school>/enrollment/... and /<school>/add-enrollment/... Payment-response,
// payment-init and every other route load no Pixel and send no PageView.
const ENROLLMENT_PATH = /^\/[^/]+\/(enroll|enrollment|add-enrollment)(\/|$)/;

export function isEnrollmentPath(pathname) {
  return ENROLLMENT_PATH.test(pathname || "");
}

function loadPixel(pixelId) {
  if (window.fbq) return;
  const n = (window.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  // Starts revoked; granted only when the visitor accepted marketing cookies. The consent card then grants or
  // revokes it live through the is:marketing-consent event.
  window.fbq("consent", "revoke");
  window.fbq("init", pixelId);
  if (document.cookie.indexOf("is_marketing_consent=granted") !== -1) {
    window.fbq("consent", "grant");
  }
}

export default function EnrollmentPixel({ pixelId }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!pixelId || !isEnrollmentPath(pathname)) return;
    try {
      loadPixel(pixelId);
      window.fbq("track", "PageView");
    } catch {
      // tracking must never break the page
    }
  }, [pixelId, pathname]);
  return null;
}
