import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // .field-well (globals.css) carries the recessed ground and the red-ink focus underline.
        "field-well h-10 w-full min-w-0 px-3 font-mono text-[13px] outline-none",
        "placeholder:text-ink-3/70 disabled:pointer-events-none disabled:cursor-not-allowed",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
