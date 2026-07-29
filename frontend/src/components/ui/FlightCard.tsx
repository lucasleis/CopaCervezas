import { cn } from "@/lib/utils"

import { StatusBadge, type EstadoVuelo } from "./StatusBadge"

const ACCENT: Record<EstadoVuelo, { bg: string; border: string; stripe: string }> = {
  pendiente: {
    bg: "bg-neutral-100",
    border: "border-neutral-200",
    stripe: "bg-neutral-400",
  },
  "en-curso": {
    bg: "bg-primary-50",
    border: "border-primary-200",
    stripe: "bg-primary-500",
  },
  completado: {
    bg: "bg-success-50",
    border: "border-success-200",
    stripe: "bg-success-300",
  },
  alerta: {
    bg: "bg-warning-50",
    border: "border-warning-200",
    stripe: "bg-warning-500",
  },
  error: {
    bg: "bg-danger-50",
    border: "border-danger-200",
    stripe: "bg-danger-600",
  },
}

interface FlightCardProps {
  numero: number
  categoria: string
  meta: string
  estado: EstadoVuelo
  className?: string
}

export function FlightCard({ numero, categoria, meta, estado, className }: FlightCardProps) {
  const accent = ACCENT[estado]

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2.5 overflow-hidden rounded-lg border p-4 pl-[22px] shadow-sm transition hover:-translate-y-px hover:shadow-md",
        accent.bg,
        accent.border,
        className
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-[5px]", accent.stripe)} />

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-neutral-400">
          VUELO {String(numero).padStart(2, "0")}
        </span>
        <StatusBadge estado={estado} />
      </div>

      <p className="m-0 text-[15px] font-bold text-neutral-900">{categoria}</p>
      <p className="m-0 text-[12.5px] text-neutral-500 tabular-nums">{meta}</p>
    </div>
  )
}
