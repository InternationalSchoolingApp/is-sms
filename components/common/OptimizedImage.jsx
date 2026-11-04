"use client";

import Image from "next/image";

function isRemoteSource(src) {
  return typeof src === "string" && /^(https?:)?\/\//i.test(src);
}

function isAnimatedSource(src) {
  return typeof src === "string" && /\.gif(?:[?#]|$)/i.test(src);
}

/**
 * Image wrapper for UI data whose source may be local, same-origin, or hosted
 * by a backend/external service. Remote sources stay unoptimized when their
 * host or authentication requirements are not known at build time.
 */
export function OptimizedImage({ src, fallbackSrc, alt = "", ...props }) {
  const resolvedSrc = src || fallbackSrc;
  if (!resolvedSrc) return null;

  return <Image src={resolvedSrc} alt={alt} unoptimized={isRemoteSource(resolvedSrc) || isAnimatedSource(resolvedSrc)} {...props} />;
}
