"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * A child's photo, or their initial when there is none (or it fails to load). The photo URL comes from the
 * backend per child and may be empty, relative or invalid, so only an absolute http(s) URL is tried; the image
 * is not run through the Next optimizer (any school CDN host), like the school logo in the header.
 */
export function ChildAvatar({ child, size = 40, className = "" }) {
  const [failed, setFailed] = useState(false);
  const name = String(child?.studentName ?? "").trim();
  const pic = typeof child?.profilePic === "string" ? child.profilePic.trim() : "";
  const showPhoto = !failed && /^https?:\/\//i.test(pic);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 font-bold text-black ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {showPhoto ? (
        <Image src={pic} alt="" width={size} height={size} className="h-full w-full object-cover" unoptimized onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{name ? name[0].toUpperCase() : "?"}</span>
      )}
    </span>
  );
}
