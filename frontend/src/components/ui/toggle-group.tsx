import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"

import { cn } from "@/lib/utils"

function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props<string>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn("flex flex-wrap items-center gap-1", className)}
      {...props}
    />
  )
}

function ToggleGroupItem({ className, ...props }: Toggle.Props<string>) {
  return (
    <Toggle
      data-slot="toggle-group-item"
      className={cn(
        "inline-flex h-7 shrink-0 cursor-pointer items-center justify-center rounded border border-neutral-300 px-2 text-[11px] font-medium whitespace-nowrap text-neutral-600 transition-colors outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 data-[pressed]:border-primary-500 data-[pressed]:bg-primary-500 data-[pressed]:text-white",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
