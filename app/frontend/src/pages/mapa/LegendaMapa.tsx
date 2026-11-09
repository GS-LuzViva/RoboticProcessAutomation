import { NOMES_SITUACAO } from "@/lib/dominio"
import { formatarNumero } from "@/lib/formatar"
import type { Situacao } from "@/lib/tipos"
import { cn } from "@/lib/utils"

import { ORDEM_LEGENDA, VISUAL_SITUACAO } from "./estilo"
import type { Contagem } from "./postes"

export interface LegendaMapaProps {
  contagem: Contagem
  visiveis: ReadonlySet<Situacao>
  aoAlternar: (situacao: Situacao) => void
  className?: string
}

/**
 * Legenda sobre o mapa: ícone, nome e contagem de cada situação (cor + ícone + texto). Cada item
 * é um botão (aria-pressed) que mostra ou esconde aquela situação no mapa. Duas colunas no
 * celular, uma abaixo de 360 px (os nomes e as contagens não cabem lado a lado em 320 px).
 */
export function LegendaMapa({ contagem, visiveis, aoAlternar, className }: LegendaMapaProps) {
  return (
    <div
      role="group"
      aria-labelledby="legenda-mapa-titulo"
      className={cn("rounded-xl border bg-card/95 p-2 text-card-foreground shadow-md backdrop-blur-sm", className)}
    >
      <p id="legenda-mapa-titulo" className="px-1.5 pb-1 text-xs text-muted-foreground">
        Mostrar no mapa
      </p>
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-[359px]:grid-cols-1 sm:grid-cols-1">
        {ORDEM_LEGENDA.map((situacao) => {
          const { icone: Icone, texto } = VISUAL_SITUACAO[situacao]
          const ativa = visiveis.has(situacao)
          const n = contagem[situacao]
          return (
            <li key={situacao} className="min-w-0">
              <button
                type="button"
                aria-pressed={ativa}
                onClick={() => aoAlternar(situacao)}
                className={cn(
                  "flex h-9 w-full min-w-0 items-center gap-2 rounded-md px-1.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring max-md:h-11",
                  !ativa && "text-muted-foreground",
                )}
              >
                {/* O ícone tem a cor da situação: faz o papel do ponto colorido e diz qual é sem depender da cor. */}
                <Icone aria-hidden="true" className={cn("size-4 shrink-0", ativa ? texto : "text-muted-foreground")} />
                <span className={cn("min-w-0 flex-1 truncate", !ativa && "line-through decoration-1")}>
                  {NOMES_SITUACAO[situacao]}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatarNumero(n, 0)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
