import { AlarmClock, CircleCheck, CircleDot, CircleSlash, Wrench, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

import { textoAtraso } from "@/lib/formatar"
import { NOMES_STATUS } from "@/lib/dominio"
import type { StatusChamado } from "@/lib/tipos"

const ESTILO_STATUS: Record<StatusChamado, { icone: LucideIcon; classes: string }> = {
  aberto: { icone: CircleDot, classes: "border border-primary/50 text-primary" },
  em_atendimento: { icone: Wrench, classes: "border border-transparent bg-primary/10 text-primary dark:bg-primary/15" },
  concluido: { icone: CircleCheck, classes: "border border-transparent bg-ok-fundo text-ok" },
  cancelado: { icone: CircleSlash, classes: "border border-transparent bg-sem-medicao-fundo text-sem-medicao" },
}

const BASE = "inline-flex w-fit shrink-0 items-center gap-1 rounded-md font-semibold whitespace-nowrap"
const TAMANHO = { sm: "h-5 px-1.5 text-xs [&>svg]:size-3.5", md: "h-6 px-2 text-sm [&>svg]:size-4" }

export interface StatusChamadoBadgeProps {
  status: StatusChamado
  size?: "sm" | "md"
  className?: string
}

/** Status do chamado (aberto, em atendimento, concluído, cancelado) com ícone + texto. */
export function StatusChamadoBadge({ status, size = "md", className }: StatusChamadoBadgeProps) {
  const estilo = ESTILO_STATUS[status] ?? ESTILO_STATUS.aberto
  const Icone = estilo.icone
  return (
    <span className={cn(BASE, TAMANHO[size], estilo.classes, className)}>
      <Icone aria-hidden="true" />
      {NOMES_STATUS[status] ?? status}
    </span>
  )
}

export interface AtrasoBadgeProps {
  /** Dias inteiros de atraso (de `calcularPrazo(...).diasAtraso`). */
  diasAtraso: number
  size?: "sm" | "md"
  className?: string
}

/** "Atrasado há N dias" em vermelho, com ícone. Mostre só quando `calcularPrazo(...).atrasado`. */
export function AtrasoBadge({ diasAtraso, size = "md", className }: AtrasoBadgeProps) {
  return (
    <span className={cn(BASE, TAMANHO[size], "bg-apagada-fundo text-apagada", className)}>
      <AlarmClock aria-hidden="true" />
      {textoAtraso(diasAtraso)}
    </span>
  )
}
