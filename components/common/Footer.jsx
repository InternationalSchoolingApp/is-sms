// `fixed`: the wizard footer. Below md it is an ordinary row at the end of the page (just under the form, with
// room for the fixed Back / Next bar); from md it is pinned to the bottom of the viewport.
export function Footer({ schoolName, fixed = false }) {
  return (
    <footer
      className={`border-t border-slate-200/70 text-center text-xs text-slate-500 ${
        fixed
          ? "relative w-full whitespace-nowrap border-t-0 bg-[#f2f5fa] pb-[72px] pt-2 text-[clamp(9px,3vw,13px)] leading-4 text-slate-900 md:fixed md:bottom-0 md:left-0 md:z-20 md:border-t md:bg-white md:py-4 md:text-sm md:leading-normal md:text-slate-500"
          : "relative z-10 hidden bg-white py-4 md:block"
      }`}
    >
      Copyright © {new Date().getFullYear()} - {schoolName || "International Schooling"} - All Rights Reserved.
    </footer>
  );
}
