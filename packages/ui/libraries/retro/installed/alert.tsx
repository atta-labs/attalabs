import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../../lib/utils"

// CSS-grid layout (shadcn-style): drop an icon as a direct child and the alert
// auto-arranges into an icon column + a content column — no manual flex wrapper.
// `has-[>svg]` adds the icon column only when an icon is present. NeoBrutalist
// chrome: hard 2px border, square corners, hard offset shadow.
const alertVariants = cva(
  cn(
    "group/alert relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded border-2 px-4 py-3 text-left text-sm shadow-md",
    "has-[>svg]:grid-cols-[1.25rem_1fr] has-[>svg]:gap-x-3",
    "has-data-[slot=alert-action]:pr-14",
    "[&>svg]:size-5 [&>svg]:translate-y-0.5 [&>svg]:shrink-0 [&>svg]:text-current"
  ),
  {
    variants: {
      // shadcn's variant axis (kept for API compatibility). `solid` is a RetroUI
      // addition.
      variant: {
        default:
          "border-border bg-background text-foreground *:data-[slot=alert-description]:text-muted-foreground",
        destructive:
          "border-red-900 bg-red-300 text-red-900 *:data-[slot=alert-description]:text-red-900/80",
        solid:
          "border-border bg-foreground text-background *:data-[slot=alert-description]:text-background/80",
      },
      // RetroUI status axis — additive; overrides the variant's colors when set.
      status: {
        error:
          "border-red-900 bg-red-300 text-red-900 *:data-[slot=alert-description]:text-red-900/80",
        success:
          "border-green-900 bg-green-300 text-green-900 *:data-[slot=alert-description]:text-green-900/80",
        warning:
          "border-yellow-900 bg-yellow-300 text-yellow-900 *:data-[slot=alert-description]:text-yellow-900/80",
        info: "border-blue-900 bg-blue-300 text-blue-900 *:data-[slot=alert-description]:text-blue-900/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  status,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, status }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 min-h-5 font-head text-base leading-tight tracking-tight [&_a]:underline [&_a]:underline-offset-3",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p]:leading-relaxed [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants }
