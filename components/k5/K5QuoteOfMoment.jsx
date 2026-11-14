"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useQuoteOfMoment } from "@/hooks/useQuoteOfMoment";

// Dismissed for the rest of the page load (legacy __quoteOfMomentDismissed), across module changes.
let dismissed = false;

/** "**phrase**" in the quote text is highlighted (legacy mqHighlightHtml); everything else stays plain text. */
function highlighted(text) {
  return String(text)
    .split("**")
    .map((part, index) =>
      index % 2 === 1 ? (
        <span key={index} className="font-semibold italic text-k5-acx">
          {part}
        </span>
      ) : (
        part
      ),
    );
}

/** Legacy "Quote of the Moment" card, shown above the module in the grade-look shell. */
export function K5QuoteOfMoment() {
  const quote = useQuoteOfMoment();
  const [closed, setClosed] = useState(dismissed);
  if (!quote || closed) return null;
  return (
    <section aria-label="Quote of the moment" className="relative flex items-center gap-4 rounded-[18px] border-[3px] border-k5-line bg-k5-act py-4 pe-14 ps-4">
      <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-k5-card text-k5-acx">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-[1rem] font-[600] leading-normal text-k5-ink">{highlighted(quote.quoteText)}</p>
        {quote.author && <p className="m-0 mt-1 text-[0.8125rem] font-[800] text-k5-mut">— {quote.author}</p>}
      </div>
      <button
        type="button"
        aria-label="Dismiss quote"
        onClick={() => {
          dismissed = true;
          setClosed(true);
        }}
        className="absolute end-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-k5-mut"
      >
        <X className="h-5 w-5" />
      </button>
    </section>
  );
}
