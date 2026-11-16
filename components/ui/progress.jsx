"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "cn"

/** A thin horizontal progress bar; `value` is 0-100 (null = indeterminate). */
function Progress({ className, indicatorClassName, value, ...props }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} {...props}>
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-200", className)}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn("h-full rounded-full bg-primary transition-all duration-150", indicatorClassName)}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
