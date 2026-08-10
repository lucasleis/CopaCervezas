import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

const emptyStateVariants = cva("px-4 text-center text-sm", {
  variants: {
    variant: {
      default: "text-neutral-500",
      error: "text-destructive",
    },
    bare: {
      true: "py-8",
      false: "py-12",
    },
  },
  defaultVariants: {
    variant: "default",
    bare: false,
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
  ({ className, variant, bare, message, icon, action, ...props }, ref) => {
    const content = (
      <>
        {icon && (
          <div className="mb-2 flex justify-center" aria-hidden="true">
            {icon}
          </div>
        )}
        <p>{message}</p>
        {action && <div className="mt-4 flex justify-center">{action}</div>}
      </>
    )

    // bare: solo el contenido centrado, sin la caja de Card — para el vacío
    // que va dentro de una sección que ya es una Card (p. ej. una tabla sin filas).
    if (bare) {
      return (
        <div
          ref={ref}
          data-slot="empty-state"
          className={cn(emptyStateVariants({ variant, bare, className }))}
          {...props}
        >
          {content}
        </div>
      )
    }

    return (
      <Card
        ref={ref}
        padding="none"
        data-slot="empty-state"
        className={cn(emptyStateVariants({ variant, bare, className }))}
        {...props}
      >
        {content}
      </Card>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState, emptyStateVariants }
