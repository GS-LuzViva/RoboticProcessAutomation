import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  /** Título da página (vira o único h1). */
  titulo: string
  /** Uma ou duas linhas sobre o que a tela mostra. */
  descricao?: ReactNode
  /** AreaToggle, botões. Abaixo do título até 1279 px; à direita a partir de 1280 px (xl). */
  acoes?: ReactNode
  className?: string
}

/**
 * Cabeçalho de toda página: h1, descrição opcional e ações.
 * Empilhado até 1279 px (com a barra lateral, a área útil entre 768 e 1279 px não comporta descrição e
 * seletor lado a lado); em linha a partir de 1280 px, com as ações sem encolher e o texto quebrando.
 */
export function PageHeader({ titulo, descricao, acoes, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between xl:gap-6", className)}>
      <div className="flex min-w-0 flex-col gap-1 xl:flex-1">
        <h1 className="text-lg font-bold md:text-xl">{titulo}</h1>
        {descricao && <div className="max-w-[75ch] text-sm text-muted-foreground">{descricao}</div>}
      </div>
      {acoes && <div className="flex min-w-0 flex-wrap items-center gap-2 xl:shrink-0 xl:flex-nowrap xl:justify-end">{acoes}</div>}
    </header>
  )
}
