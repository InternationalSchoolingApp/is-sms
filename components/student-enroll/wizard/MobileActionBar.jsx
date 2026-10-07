"use client";

import Image from "next/image";
import { Footer } from "@/components/common/Footer";

/**
 * A step's Back / Next row. Below md it is a white bar fixed to the bottom of the screen — WhatsApp
 * support icon on the left, the buttons on the right, and the copyright line underneath (the wizard's own
 * footer is hidden on mobile). From md it is an ordinary centred row in the page flow; `className` carries
 * that desktop spacing (e.g. "md:mt-10"), and the WhatsApp icon and copyright line are hidden there because
 * the shell shows its own floating icon and fixed footer.
 */
export function MobileActionBar({ context, className = "", children }) {
  return (
    <div className={`fixed inset-x-0 bottom-0 z-20 bg-white md:static md:z-auto md:bg-transparent ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-2 max-[367px]:gap-2 max-[367px]:px-2 justify-center md:p-0">
        {/* {context?.whatsAppNumber ? (
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
        )} */}
        <div className="flex min-w-0 items-center gap-4 max-[367px]:gap-2">{children}</div>
      </div>
      <Footer schoolName={context?.schoolName} inBar />
    </div>
  );
}
