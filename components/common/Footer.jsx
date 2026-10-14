// `fixed`: the wizard footer, shown from md only, pinned to the bottom of the viewport. Below md the copyright line
// is the in-flow one at the end of the page (`inFlow`).
// `inFlow`: the mobile-only copyright line at the end of the page content (pinned to the bottom of the
// content area, directly above the fixed Back / Next bar); hidden from md.
// `inBar`: the mobile-only copyright line inside the fixed Back / Next bar (MobileActionBar); hidden from md.
export function Footer({ schoolName, fixed = false, inBar = false, inFlow = false }) {
  return (
    <footer
      className={`border-t border-slate-200/70 text-center text-xs text-slate-500 ${
        inFlow
          ? "whitespace-nowrap border-t-0 px-4 pb-16 pt-6 text-[clamp(8px,2.8vw,14px)] leading-4 text-slate-600 md:hidden"
          : inBar
          ? "whitespace-nowrap border-t-0 px-2 pb-2 text-[clamp(9px,3vw,13px)] leading-4 text-black md:hidden"
          : fixed
          ? "hidden whitespace-nowrap md:fixed md:bottom-0 md:left-0 md:z-20 md:block md:w-full md:border-t md:bg-white md:py-2 md:text-xs md:leading-normal md:text-slate-500"
          : "relative z-10 hidden bg-white py-4 md:block"
      }`}
    >
      Copyright © {new Date().getFullYear()} - {schoolName || "International Schooling"} - All Rights Reserved.
    </footer>
  );
}
