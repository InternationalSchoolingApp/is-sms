import { Andika, Atkinson_Hyperlegible, DM_Sans, Fredoka, Lexend, Nunito, Outfit, Roboto } from "next/font/google";

// Grade K–5 dashboard fonts (plan section 11): Fredoka for display text, Nunito for body text.
// Loaded only where K5Shell renders; exposed as CSS variables read by app/k5-theme.css.
export const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"] });
export const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["600", "700", "800", "900"] });

// Grade 6–8 (Middle) look: Outfit for display text, DM Sans for body text (app/k5-middle.css).
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], weight: ["500", "600", "700", "800"], preload: false });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["500", "600", "700", "800"], preload: false });

// Grade 9–12 (High) look: Roboto for everything (app/k5-mature.css).
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"], preload: false });

// "Letters" choices (Appearance, Phase 3): not preloaded, so a font file is only fetched once
// a student actually picks it.
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"], preload: false });
const andika = Andika({ variable: "--font-andika", subsets: ["latin"], weight: ["400", "700"], preload: false });
const atkinson = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"], preload: false });

/** Every K–5 font variable — for the shell root and for anything portalled out of it. */
export const k5FontVariables = [fredoka, nunito, outfit, dmSans, roboto, lexend, andika, atkinson].map((f) => f.variable).join(" ");
