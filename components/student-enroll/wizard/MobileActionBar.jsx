"use client";

import Image from "next/image";

/**
 * A step's Back / Next row. Below md it is a white bar fixed to the bottom of the screen (the footer scrolls with the page, under the form) — WhatsApp
 * support icon on the left, the buttons on the right. From md it is an ordinary centred row in the page
 * flow; `className` carries that desktop spacing (e.g. "md:mt-10"), and the WhatsApp icon is hidden
 * there because the shell shows its own floating one.
 */
export function MobileActionBar({ context, className = "", children }) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 bg-white px-4 py-2 max-[367px]:gap-2 max-[367px]:px-2 md:static md:z-auto md:justify-center md:bg-transparent md:p-0 ${className}`}
    >
      {context?.whatsAppNumber ? (
        <a
          href={`https://api.whatsapp.com/send?phone=${context.whatsAppNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Enrollment support on WhatsApp"
          className="flex h-10 w-10 shrink-0 max-[367px]:h-8 max-[367px]:w-8 md:hidden"
        >
          <Image src="/images/whatsapp-new.webp" alt="" width={40} height={40} unoptimized className="h-10 w-10 max-[367px]:h-8 max-[367px]:w-8" />
        </a>
      ) : (
        <span className="md:hidden" />
      )}
      <div className="flex min-w-0 items-center gap-4 max-[367px]:gap-2">{children}</div>
    </div>
  );
}
