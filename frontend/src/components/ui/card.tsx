import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva("rounded-lg border border-neutral-200 bg-white", {
  variants: {
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
    },
  },
  defaultVariants: {
    padding: "none",
  },
})

const Card = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & VariantProps<typeof cardVariants>
>(({ className, padding, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="card"
      className={cn(cardVariants({ padding, className }))}
      {...props}
    />
  )
})
Card.displayName = "Card"

export { Card, cardVariants }
