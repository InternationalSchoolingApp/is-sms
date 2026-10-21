"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";

/**
 * Building blocks of the re-enrollment screens. They follow the legacy re-enrollment (student dashboard) look:
 * a white "app-page-title" bar with a round icon, 15px rounded cards with a shadow, primary card headers.
 */

/** Legacy `.app-page-title`: white bar, icon on the left, centred title. */
export function PageTitle({ icon: Icon, children }) {
  return (
    <div className="mb-3 mt-2 rounded-[15px] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1 text-center text-base font-semibold text-black sm:text-lg">{children}</div>
        {Icon && <span className="h-10 w-10 shrink-0 opacity-0" aria-hidden="true" />}
      </div>
    </div>
  );
}

/** Legacy `.card.rounded-15`: optional primary header, white body. */
export function Card({ header, headerRight, className = "", bodyClassName = "px-4 py-3", children }) {
  return (
    <section className={`mb-3 overflow-hidden rounded-[15px] bg-white shadow-lg ${className}`}>
      {header && (
        <header className="flex flex-wrap items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-white">
          <span>{header}</span>
          {headerRight && <span className="ml-auto rounded bg-white px-2 py-1 text-primary">{headerRight}</span>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

// Same support details the legacy re-enrollment page shows in its "Need Support?" card.
export const CHAT_BASE_URL = "https://support.internationalschooling.org";
export const SUPPORT_PHONE = "+15854990662";
export const SUPPORT_EMAIL = "admin.support@internationalschooling.org";

/** Legacy "Need Support?" side card of the re-enrollment page. */
export function SupportCard({ uniqueId }) {
  const chatUrl = `${CHAT_BASE_URL}/onboarding-support?uuid=${encodeURIComponent(uniqueId || "")}`;
  return (
    <aside className="rounded-[15px] bg-white p-4 shadow-lg">
      <h4 className="mb-3 text-base font-bold text-black">Need Support?</h4>
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 flex items-center gap-3 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
      >
        <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        Live Chat with School Administration
      </a>
      <div className="mb-3 flex items-center gap-3 text-sm">
        <Phone className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-semibold text-black">Phone Support</p>
          <p className="text-slate-600">{SUPPORT_PHONE}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Mail className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold text-black">Email Support</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="break-words text-slate-600">
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </aside>
  );
}

/** Legacy `.design-btn` / `.btn.theme-bg`: the filled primary action button. */
export function ActionButton({ className = "", ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`cursor-pointer rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}
