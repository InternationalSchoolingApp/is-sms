import { Roboto } from "next/font/google";

// The parent dashboard theme's font (design: Parents-Dashboard-Web, "Mature" theme). Self-hosted by next/font, so
// the browser makes no request to Google. Applied only where the parent theme is in use.
export const parentFont = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});
