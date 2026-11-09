import { useEffect, useRef } from "react"
import { CircleCheck } from "lucide-react"
import { EstadoVazio } from "@/components/luzviva/Estados"
import { LuxMeter } from "@/components/luzviva/LuxMeter"
import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { SituacaoBadge } from "@/components/luzviva/SituacaoBadge"
import { formatarEndereco, plural } from "@/lib/formatar"
import { cn } from "@/lib/utils"

import type { Poste } from "./postes"

export interface ListaFalhasProps {
  postes: readonly Poste[]
  nomeDaArea: string
  selecionado: string | null
  aoEscolher: (poste: Poste) => void
  className?: string
}

/**
 * Postes com falha da área, por prioridade (apagada primeiro, depois menor lux). Cada linha é um
 * botão que centraliza o mapa no poste e abre o popup: é também o caminho pelo teclado, já que os
 * círculos do mapa (canvas) não recebem foco.
 */
export function ListaFalhas({ postes, nomeDaArea, selecionado, aoEscolher, className }: ListaFalhasProps) {
  const listaRef = useRef<HTMLUListElement>(null)
  // Poste aberto no mapa (pelo clique num círculo ou por link): a linha dele aparece na lista.
  useEffect(() => {
    if (!selecionado) return
    listaRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" })
  }, [selecionado])

  if (postes.length === 0) {
    return (
      <EstadoVazio
        icone={CircleCheck}
        titulo={`Nenhuma luminária com falha em ${nomeDaArea}`}
        descricao="Todas as luminárias inspecionadas estão ok. Escolha outra área no seletor para ver as falhas de lá."
        className={cn("border-0", className)}
      />
    )
  }
  return (
    <ul ref={listaRef} className={cn("flex flex-col", className)}>
      {postes.map((poste) => {
        const ativo = poste.id === selecionado
        return (
          <li key={poste.id} className="border-b last:border-b-0">
            <button
              type="button"
              onClick={() => aoEscolher(poste)}
              aria-current={ativo ? "true" : undefined}
              className={cn(
                "flex w-full min-w-0 flex-col gap-1.5 px-4 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset",
                ativo && "bg-primary/8 shadow-[inset_3px_0_0_var(--primary)] dark:bg-primary/12",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <PlacaChip placa={poste.placa} />
                <SituacaoBadge situacao={poste.situacao} size="sm" />
              </span>
              <span className="line-clamp-2 text-sm break-words">
                {formatarEndereco(poste.endereco) ?? "Endereço não informado"}
              </span>
              <span className="flex items-center justify-between gap-2">
                <LuxMeter lux={poste.ultimo_lux} />
                {poste.luminarias > 1 && (
                  <span className="text-xs text-muted-foreground">{plural(poste.luminarias, "luminária", "luminárias")}</span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
