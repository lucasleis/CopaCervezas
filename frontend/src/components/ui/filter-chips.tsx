import { cn } from "@/lib/utils"

interface FilterChipsProps<T extends string> {
  label?: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: FilterChipsProps<T>) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {label && (
        <span className="text-xs font-medium text-neutral-500">{label}</span>
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
