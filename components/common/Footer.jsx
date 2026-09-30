export function Footer({ schoolName, fixed = false }) {
  return (
    <footer
      className={`border-t border-slate-200/70 text-center text-xs text-slate-500 bg-white ${
        fixed
          ? "fixed bottom-0 left-0 z-20 w-full whitespace-nowrap border-t-0 py-2 text-[clamp(9px,3vw,13px)] leading-4 text-slate-900 md:border-t md:py-4 md:text-xs md:leading-normal md:text-slate-500"
          : "relative z-10 hidden py-4 md:block"
      }`}
    >
      Copyright © {new Date().getFullYear()} - {schoolName || "International Schooling"} - All Rights Reserved.
    </footer>
  );
}
