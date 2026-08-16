import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import type { ReactNode } from "react"

const VARIANT_CONFIG = {
  info: {
    wrapper: "border-primary-200 bg-primary-50 text-primary-700",
    title: "text-primary-700",
    description: "text-primary-600",
  },
  warning: {
    wrapper: "border-warning-200 bg-warning-50 text-warning-700",
    title: "text-warning-700",
    description: "text-warning-600",
  },
  danger: {
    wrapper: "border-danger-100 bg-danger-50 text-danger-700",
    title: "text-danger-700",
    description: "text-neutral-600",
  },
}

interface AlertProps {
  variant?: "info" | "warning" | "danger"
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  onClose?: () => void
  className?: string
  children?: ReactNode
}

export function Alert({
  variant = "info",
  title,
  description,
  icon,
  onClose,
  className,
  children,
}: AlertProps) {
  const config = VARIANT_CONFIG[variant]

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        config.wrapper,
        className
      )}
    >
      {icon && (
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("font-medium", config.title)}>{title}</p>
        )}
        {description && (
          <p className={cn(title ? "mt-1" : "", config.description)}>
            {description}
          </p>
        )}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={onClose}
          className="mt-0.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
