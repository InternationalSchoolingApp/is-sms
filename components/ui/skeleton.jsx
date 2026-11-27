import { cn } from "@/lib/utils";

/** shadcn/ui Skeleton: a pulsing placeholder block shown while content loads. */
function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-accent", className)} {...props} />;
}

export { Skeleton };
