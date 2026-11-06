import Image from "next/image";
import { XCircle } from "lucide-react";

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

// The failure counterpart of FullScreenLoader. It cannot reuse that one: the words
// "Almost there, please wait" are drawn into loader-new.gif itself, so a failure
// message underneath it told the user to wait for something that had already failed.
export function FullScreenError({ message }) {
  return (
    <div role="alert" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 text-white">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <XCircle className="size-12 text-rose-400" aria-hidden="true" />
        <h4 className="text-lg leading-relaxed font-semibold">{message}</h4>
      </div>
    </div>
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
