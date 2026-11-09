import { useMemo } from "react"
import type { SortingState } from "@tanstack/react-table"

import { LuxMeter } from "@/components/luzviva/LuxMeter"
import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { PrioridadeBar } from "@/components/luzviva/PrioridadeBar"
import { SituacaoBadge } from "@/components/luzviva/SituacaoBadge"
import { StatusChamadoBadge } from "@/components/luzviva/StatusChamadoBadge"
import { formatarEndereco, plural } from "@/lib/formatar"
import type { ItemFila } from "@/lib/tipos"

import { ehColunaOrdenavel, ordenarFila, textoPosicaoNoPoste, type PosicaoNoPoste } from "./regras"

export interface ListaFilaProps {
  itens: readonly ItemFila[]
  /** Posição de cada luminária no poste (`posicoesNoPoste`), por id da luminária. */
  posicoes: ReadonlyMap<number, PosicaoNoPoste>
  ordem: SortingState
  aoAbrir: (item: ItemFila) => void
  legenda: string
}

/** Fila no celular (< 768 px): uma linha empilhada por luminária, cada uma é um botão. */
export function ListaFila({ itens, posicoes, ordem, aoAbrir, legenda }: ListaFilaProps) {
  const atual = ordem[0]
  const ordenados = useMemo(
    () => (atual && ehColunaOrdenavel(atual.id) ? ordenarFila(itens, atual.id, atual.desc) : [...itens]),
    [itens, atual],
  )

  return (
    <ul aria-label={legenda} className="divide-y overflow-hidden rounded-xl border bg-card">
      {ordenados.map((item) => {
        const endereco = formatarEndereco(item.endereco)
        const noPoste = textoPosicaoNoPoste(item.id_luminaria, posicoes.get(item.id_luminaria))
        return (
          <li key={item.id_luminaria}>
            <button
              type="button"
              onClick={() => aoAbrir(item)}
              aria-haspopup="dialog"
              data-luminaria={item.id_luminaria}
              className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <PlacaChip placa={item.placa} />
                  <SituacaoBadge situacao={item.situacao} size="sm" />
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <span className="sr-only">Prioridade</span>
                  <PrioridadeBar valor={item.prioridade} />
                </span>
              </span>
              <span className="flex flex-col gap-0.5">
                <span className={endereco ? "line-clamp-2 text-sm" : "text-sm text-muted-foreground"}>
                  {endereco ?? "sem endereço"}
                </span>
                {/* O mesmo poste pode ter várias luminárias na fila: diz qual é esta. */}
                {noPoste && <span className="text-xs text-muted-foreground tabular-nums">{noPoste}</span>}
              </span>
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <LuxMeter lux={item.ultimo_lux} />
                <span className="tabular-nums">{plural(item.ocorrencias_app ?? 0, "relato", "relatos", "sem relatos")}</span>
                {item.status_chamado ? (
                  <StatusChamadoBadge status={item.status_chamado} size="sm" />
                ) : (
                  <span>sem chamado</span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
