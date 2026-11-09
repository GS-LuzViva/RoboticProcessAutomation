import { CircleHelp, Lightbulb, LightbulbOff, SunDim, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

import { NOMES_SITUACAO } from "@/lib/dominio"
import type { Situacao } from "@/lib/tipos"

/** Ícone e classes de cor de cada situação (texto/ícone sobre o preenchimento claro). */
const ESTILO_SITUACAO: Record<Situacao, { icone: LucideIcon; classes: string }> = {
  ok: { icone: Lightbulb, classes: "bg-ok-fundo text-ok" },
  insuficiente: { icone: SunDim, classes: "bg-insuficiente-fundo text-insuficiente" },
  apagada: { icone: LightbulbOff, classes: "bg-apagada-fundo text-apagada" },
  sem_medicao: { icone: CircleHelp, classes: "bg-sem-medicao-fundo text-sem-medicao" },
}

export interface SituacaoBadgeProps {
  situacao: Situacao
  /** sm: tabelas densas; md: padrão. */
  size?: "sm" | "md"
  className?: string
}

/** Situação da luminária com ícone + texto + cor (nunca só a cor). */
export function SituacaoBadge({ situacao, size = "md", className }: SituacaoBadgeProps) {
  const estilo = ESTILO_SITUACAO[situacao] ?? ESTILO_SITUACAO.sem_medicao
  const Icone = estilo.icone
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 rounded-md font-semibold whitespace-nowrap",
        size === "sm" ? "h-5 px-1.5 text-xs" : "h-6 px-2 text-sm",
        estilo.classes,
        className,
      )}
    >
      <Icone aria-hidden="true" className={size === "sm" ? "size-3.5" : "size-4"} />
      {NOMES_SITUACAO[situacao] ?? situacao}
    </span>
  )
}
