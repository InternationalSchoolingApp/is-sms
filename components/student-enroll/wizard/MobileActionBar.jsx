"use client";

import Image from "next/image";

/**
 * A step's Back / Next row. Below md it is a white bar fixed just above the fixed footer — WhatsApp
 * support icon on the left, the buttons on the right. From md it is an ordinary centred row in the page
 * flow; `className` carries that desktop spacing (e.g. "md:mt-10"), and the WhatsApp icon is hidden
 * there because the shell shows its own floating one.
 */
export function MobileActionBar({ context, className = "", children }) {
  return (
    <div
      className={`fixed inset-x-0 bottom-8 z-20 flex items-center justify-between gap-3 bg-white px-4 py-2 md:static md:z-auto md:justify-center md:bg-transparent md:p-0 ${className}`}
    >
      {context?.whatsAppNumber ? (
        <a
          href={`https://api.whatsapp.com/send?phone=${context.whatsAppNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Enrollment support on WhatsApp"
          className="flex h-10 w-10 shrink-0 md:hidden"
        >
          <Image src="/images/whatsapp-new.webp" alt="" width={40} height={40} unoptimized className="h-10 w-10" />
        </a>
      ) : (
        <span className="md:hidden" />
      )}
      <div className="flex items-center gap-4">{children}</div>
    </div>
  );
}
