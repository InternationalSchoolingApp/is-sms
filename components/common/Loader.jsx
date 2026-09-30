import Image from "next/image";

// loader-new.gif — the same loader legacy shows (paymentUnderProcessOverlay): 373x300 source, rendered ~150px wide.
export function Loader({ size = 150, className = "" }) {
  return (
    <Image
      src="/loader-new.gif"
      alt="Loading"
      width={size}
      height={Math.round((size * 300) / 373)}
      unoptimized
      priority
      className={className}
    />
  );
}

// Dark full-page overlay with the loader and an optional message.
export function FullScreenLoader({ message }) {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader />
        {message && <h4 className="text-lg font-semibold">{message}</h4>}
      </div>
    </div>
  );
}
