import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

export type EstadoVuelo =
  | "pendiente"
  | "en-curso"
  | "completado"
  | "alerta"
  | "error"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap",
  {
    variants: {
      estado: {
        pendiente: "border border-neutral-300 bg-transparent text-neutral-500",
        "en-curso": "bg-primary-500 text-white",
        completado: "bg-success-100 text-success-700",
        alerta: "bg-warning-100 text-warning-700",
        error: "bg-danger-600 text-white",
      },
    },
    defaultVariants: {
      estado: "pendiente",
    },
  }
)

const ESTADO_LABEL: Record<EstadoVuelo, string> = {
  pendiente: "Pendiente",
  "en-curso": "En curso",
  completado: "Completado",
  alerta: "Alerta",
  error: "Error",
}

const ESTADO_ICON: Partial<Record<EstadoVuelo, string>> = {
  completado: "✓",
  alerta: "⚠",
  error: "✕",
}

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  estado: EstadoVuelo
}

export function StatusBadge({ estado, className, ...props }: StatusBadgeProps) {
  const icon = ESTADO_ICON[estado]

  return (
    <span
      className={cn(statusBadgeVariants({ estado }), className)}
      {...props}
    >
      {estado === "en-curso" && (
        <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-white" />
      )}
      {icon && <span className="text-[11px] leading-none">{icon}</span>}
      {ESTADO_LABEL[estado]}
    </span>
  )
}
