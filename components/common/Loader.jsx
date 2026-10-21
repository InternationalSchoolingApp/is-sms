"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { DEFAULT_SCHOOL_UUID } from "@/constant/SchoolConstants";

// loader-new.gif — the same loader legacy shows (paymentUnderProcessOverlay):
// 373x300 source, rendered ~150px wide. It has International Schooling's own
// pin+clock mark baked into the animation (same shape as Fav_Icon.png), so
// it's only correct on International Schooling's own pages — every other
// school (derived from the {school} URL segment) gets a brand-neutral
// spinner instead, matching the LoaderCircle already used elsewhere
// (PaymentResponseView.jsx, PaymentGatewayInitView.jsx).
export function Loader({ size = 150, className = "" }) {
  const pathname = usePathname();
  const schoolSlug = pathname?.split("/")[1];
  const isDefaultSchool = !schoolSlug || schoolSlug === DEFAULT_SCHOOL_UUID;

  if (!isDefaultSchool) {
    return (
      <LoaderCircle
        aria-label="Loading"
        className={`animate-spin ${className}`}
        style={{ width: Math.round(size * 0.4), height: Math.round(size * 0.4) }}
      />
    );
  }

  return (
    <Image
      src="/loader-new.gif"
      alt="Loading"
      width={size}
      height={Math.round((size * 300) / 373)}
      unoptimized
      priority
      className={className}
    />
  );
}

// Dark full-page overlay with the loader and an optional message.
export function FullScreenLoader({ message }) {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader />
        {message && <h4 className="text-lg font-semibold">{message}</h4>}
      </div>
    </div>
  );
}
