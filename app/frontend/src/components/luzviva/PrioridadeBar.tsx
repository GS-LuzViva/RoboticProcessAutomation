import { cn } from "@/lib/utils"

export interface PrioridadeBarProps {
  /** Prioridade 0..100 da fila. */
  valor: number
  className?: string
}

/** Prioridade em número tabular (alinhado à direita) e barra curta proporcional (0..100). */
export function PrioridadeBar({ valor, className }: PrioridadeBarProps) {
  const limitado = Math.min(100, Math.max(0, Math.round(valor)))
  return (
    <span className={cn("inline-flex items-center justify-end gap-2", className)}>
      <span className="w-7 text-right font-semibold tabular-nums">{limitado}</span>
      <span aria-hidden="true" className="relative block h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${limitado}%` }} />
      </span>
    </span>
  )
}
