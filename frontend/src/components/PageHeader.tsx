import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PageHeaderProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode
  subtitle?: React.ReactNode
  backTo?: string
  backLabel?: string
  actions?: React.ReactNode
  /**
   * "admin": título text-2xl (default, densidad de herramienta de uso diario).
   * "public": título text-3xl tracking-tight (cara al participante).
   */
  variant?: "admin" | "public"
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    {
      className,
      title,
      subtitle,
      backTo,
      backLabel = "Volver",
      actions,
      variant = "admin",
      ...props
    },
    ref
  ) => {
    const navigate = useNavigate()

    return (
      <div
        ref={ref}
        data-slot="page-header"
        className={cn("mb-6", className)}
        {...props}
      >
        {backTo && (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="-ml-2 mb-2"
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel}
          </Button>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1
              className={cn(
                "font-semibold text-neutral-900",
                variant === "public" ? "text-3xl tracking-tight" : "text-2xl"
              )}
            >
              {title}
            </h1>
            {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    )
  }
)
PageHeader.displayName = "PageHeader"

export { PageHeader }
