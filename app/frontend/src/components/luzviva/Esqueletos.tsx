import { cn } from "@/lib/utils"

import { Skeleton } from "@/components/ui/skeleton"

interface BaseEsqueleto {
  /** Texto para leitor de tela. Padrão "Carregando…". */
  rotulo?: string
  className?: string
}

/** Carregamento de tabela: cabeçalho + linhas cinza no lugar das células. */
export function EsqueletoTabela({
  linhas = 8,
  colunas = 6,
  rotulo = "Carregando…",
  className,
}: BaseEsqueleto & { linhas?: number; colunas?: number }) {
  return (
    <div role="status" aria-live="polite" className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      <span className="sr-only">{rotulo}</span>
      <div aria-hidden="true">
        <div className="flex gap-4 border-b px-4 py-3">
          {Array.from({ length: colunas }, (_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: linhas }, (_, l) => (
          <div key={l} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
            {Array.from({ length: colunas }, (_, c) => (
              <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-20")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Carregamento do Painel: uma linha por área (número grande + barra + indicadores). */
export function EsqueletoPainel({ linhas = 3, rotulo = "Carregando…", className }: BaseEsqueleto & { linhas?: number }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col rounded-xl border bg-card", className)}>
      <span className="sr-only">{rotulo}</span>
      {Array.from({ length: linhas }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="grid gap-4 border-b p-4 last:border-b-0 md:grid-cols-[10rem_6rem_1fr_repeat(3,7rem)] md:items-center md:p-6"
        >
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

/** Carregamento genérico de bloco (mapa, cartão de detalhe). */
export function EsqueletoBloco({ rotulo = "Carregando…", className }: BaseEsqueleto) {
  return (
    <div role="status" aria-live="polite" className={cn("relative", className)}>
      <span className="sr-only">{rotulo}</span>
      <Skeleton aria-hidden="true" className="size-full min-h-40 rounded-xl" />
    </div>
  )
}
