import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Variants per DESIGN.md's Buttons section (shiftko-design-v2-visual-pass-dup).
// `default`/`outline`/`ghost`/`link`/`destructive` are kept as aliases onto the
// three real v2 treatments (primary/secondary/text) so existing call sites keep
// working unmigrated — drop them as Phase 3 threads each page through.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-button text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-teal/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-teal-foreground text-white hover:bg-teal-foreground-hover",
        secondary: "bg-card-surface text-ink border border-hairline hover:bg-press-state",
        text: "bg-transparent text-ink-secondary text-sm font-semibold hover:text-ink",
        default: "bg-teal-foreground text-white hover:bg-teal-foreground-hover",
        outline: "bg-card-surface text-ink border border-hairline hover:bg-press-state",
        ghost: "bg-transparent text-ink-secondary hover:bg-press-state",
        link: "bg-transparent text-teal-foreground underline-offset-4 hover:underline",
        destructive: "bg-transparent text-ink-secondary text-sm font-semibold hover:text-ink",
      },
      size: {
        default: "h-12 px-4 has-[>svg]:px-3",
        sm: "h-[38px] rounded-control gap-1.5 px-3 has-[>svg]:px-2.5",
        xs: "h-6 gap-1 rounded-control-sm px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-12 px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-control",
        "icon-xs": "size-6 rounded-control-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-control",
        "icon-lg": "size-10 rounded-control",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
