import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

const emptyStateVariants = cva("px-4 py-12 text-center text-sm", {
  variants: {
    variant: {
      default: "text-neutral-500",
      error: "text-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface EmptyStateProps
  extends Omit<React.ComponentProps<"div">, "children">,
    VariantProps<typeof emptyStateVariants> {
  message: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, variant, message, icon, action, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        padding="none"
        data-slot="empty-state"
        className={cn(emptyStateVariants({ variant, className }))}
        {...props}
      >
        {icon && (
          <div className="mb-2 flex justify-center" aria-hidden="true">
            {icon}
          </div>
        )}
        <p>{message}</p>
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </Card>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState, emptyStateVariants }
