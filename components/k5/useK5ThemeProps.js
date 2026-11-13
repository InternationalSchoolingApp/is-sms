"use client";

import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { k5FontVariables } from "@/components/k5/k5Fonts";

/**
 * Class + data-* attributes that give an element the K–5 tokens, fonts and the student's
 * look. K5Shell puts them on its root; dialogs portal out of it, so they spread them too.
 */
export function useK5ThemeProps(extraClassName = "") {
  const { themeProps } = useAppearance();
  // Grade 6–8 students get the same K–5 components in the "Balanced" skin (app/k5-middle.css).
  const { isMiddle, isHigh } = useDashboardContext();
  const { className, ...data } = themeProps;
  // Grade 9–12: the Grade 6–8 band plus data-k5-high, which app/k5-mature.css restyles (Mature look).
  return { ...data, "data-k5-band": isMiddle ? "middle" : undefined, "data-k5-high": isHigh ? "true" : undefined, className: `theme-k5 ${k5FontVariables} ${className} ${extraClassName}`.trim() };
}
