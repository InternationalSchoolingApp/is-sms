"use client";

import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { k5FontVariables } from "@/components/k5/k5Fonts";

/**
 * Class + data-* attributes that give an element the K–5 tokens, fonts and the student's
 * look. K5Shell puts them on its root; dialogs portal out of it, so they spread them too.
 */
export function useK5ThemeProps(extraClassName = "") {
  const { themeProps } = useAppearance();
  const { className, ...data } = themeProps;
  return { ...data, className: `theme-k5 ${k5FontVariables} ${className} ${extraClassName}`.trim() };
}
