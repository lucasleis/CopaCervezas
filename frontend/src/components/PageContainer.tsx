import * as React from "react"

import { cn } from "@/lib/utils"

interface PageContainerProps extends React.ComponentProps<"div"> {
  /**
   * "admin": wrapper denso de ancho completo (p-8) que usan las páginas
   * de admin, uso diario.
   * "public": contenedor centrado con ancho máximo y más aire, cara al
   * participante (brewery).
   */
  variant?: "admin" | "public"
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, variant = "admin", children, ...props }, ref) => {
    if (variant === "public") {
      return (
        <div
          ref={ref}
          data-slot="page-container"
          className={cn("min-h-full bg-white", className)}
          {...props}
        >
          <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">{children}</div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        data-slot="page-container"
        className={cn("p-8", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
PageContainer.displayName = "PageContainer"

export { PageContainer }
