import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Ledger buttons: squared off, mono, uppercase with wide tracking — stamped rather than
 * clickable-glossy. Every visual decision lives here so call sites pass no className.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[2px] font-mono text-[11px] font-medium uppercase tracking-[0.09em] transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper hover:bg-stamp",
        destructive: "bg-transparent text-stamp border border-rule hover:bg-stamp-wash hover:border-stamp",
        outline: "border border-rule-2 bg-paper-2 text-ink hover:bg-sheet hover:border-ink",
        secondary: "bg-paper-2 text-ink-2 border border-rule hover:text-ink hover:border-rule-2",
        ghost: "text-ink-2 hover:bg-paper-2 hover:text-ink",
        link: "text-stamp underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3",
        lg: "h-11 px-6",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
