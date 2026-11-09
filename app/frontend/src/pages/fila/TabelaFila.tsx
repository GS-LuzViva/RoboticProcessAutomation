import type { MouseEvent } from "react"
import { useTable, type SortingState, type Updater } from "@tanstack/react-table"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"

import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatarEndereco } from "@/lib/formatar"
import type { ItemFila } from "@/lib/tipos"
import { cn } from "@/lib/utils"

import { colunasFila, recursosFila } from "./colunas"
import { descreverOrdem, textoPosicaoNoPoste, type PosicaoNoPoste } from "./regras"

export interface TabelaFilaProps {
  itens: readonly ItemFila[]
  /** Posição de cada luminária no poste (`posicoesNoPoste`), por id da luminária. */
  posicoes: ReadonlyMap<number, PosicaoNoPoste>
  ordem: SortingState
  aoOrdenar: (ordem: Updater<SortingState>) => void
  aoAbrir: (item: ItemFila) => void
  legenda: string
}

/**
 * Prioridade e placa ficam presas à esquerda quando a tabela rola na horizontal (tablet): a pessoa
 * continua vendo qual poste é e quanto ele é urgente. A largura fixa da prioridade (7rem) é o
 * deslocamento da placa; a sombra marca a borda do que fica preso.
 */
const FIXA: Record<string, string> = {
  prioridade: "sticky left-0 z-10 w-28 min-w-28 max-w-28 bg-card",
  placa: "sticky left-28 z-10 w-56 min-w-56 max-w-56 bg-card shadow-[inset_-1px_0_0_var(--border)]",
}

/** Clique em qualquer ponto da linha abre os detalhes (atalho do mouse; o teclado usa o botão da placa). */
function cliqueNaLinha(evento: MouseEvent<HTMLTableRowElement>, abrir: () => void) {
  if ((evento.target as HTMLElement).closest("button, a")) return
  if (window.getSelection()?.toString()) return // a pessoa está selecionando texto
  abrir()
}

export function TabelaFila({ itens, posicoes, ordem, aoOrdenar, aoAbrir, legenda }: TabelaFilaProps) {
  const tabela = useTable({
    features: recursosFila,
    columns: colunasFila,
    data: itens as ItemFila[],
    state: { sorting: ordem },
    onSortingChange: aoOrdenar,
    enableSortingRemoval: false,
    enableMultiSort: false,
    getRowId: (item) => String(item.id_luminaria),
  })

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table className="min-w-[56rem]" rotulo={legenda}>
        <TableCaption className="sr-only">
          {legenda}, {descreverOrdem(ordem)}
        </TableCaption>
        <TableHeader>
          {tabela.getHeaderGroups().map((grupo) => (
            <TableRow key={grupo.id} className="hover:bg-transparent">
              {grupo.headers.map((cabecalho) => {
                const coluna = cabecalho.column
                const meta = coluna.columnDef.meta
                const ordenavel = coluna.getCanSort()
                const sentido = coluna.getIsSorted()
                return (
                  <TableHead
                    key={cabecalho.id}
                    scope="col"
                    aria-sort={ordenavel ? (sentido === "asc" ? "ascending" : sentido === "desc" ? "descending" : "none") : undefined}
                    className={cn(
                      "h-11 px-2.5 text-xs font-semibold text-muted-foreground",
                      meta?.direita && "text-right",
                      meta?.classe,
                      FIXA[coluna.id],
                    )}
                  >
                    {ordenavel ? (
                      <button
                        type="button"
                        onClick={coluna.getToggleSortingHandler()}
                        className={cn(
                          "-mx-1.5 inline-flex h-8 items-center gap-1 rounded-md px-1.5 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                          sentido && "text-foreground",
                        )}
                      >
                        <tabela.FlexRender header={cabecalho} />
                        {sentido === "desc" ? (
                          <ChevronDown aria-hidden="true" className="size-3.5" />
                        ) : sentido === "asc" ? (
                          <ChevronUp aria-hidden="true" className="size-3.5" />
                        ) : (
                          <ChevronsUpDown aria-hidden="true" className="size-3.5 opacity-60" />
                        )}
                      </button>
                    ) : (
                      <tabela.FlexRender header={cabecalho} />
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {tabela.getRowModel().rows.map((linha) => {
            const item = linha.original
            const abrir = () => aoAbrir(item)
            return (
              <TableRow
                key={linha.id}
                onClick={(evento) => cliqueNaLinha(evento, abrir)}
                className="group cursor-pointer hover:bg-muted"
              >
                {linha.getAllCells().map((celula) => {
                  const meta = celula.column.columnDef.meta
                  if (celula.column.id === "placa") {
                    const endereco = formatarEndereco(item.endereco)
                    const noPoste = textoPosicaoNoPoste(item.id_luminaria, posicoes.get(item.id_luminaria))
                    return (
                      <th
                        key={celula.id}
                        scope="row"
                        className={cn("px-2.5 py-2 text-left font-normal group-hover:bg-muted", FIXA.placa)}
                      >
                        <button
                          type="button"
                          onClick={abrir}
                          aria-haspopup="dialog"
                          data-luminaria={item.id_luminaria}
                          title={endereco ?? undefined}
                          className="-m-1 flex w-[calc(100%+0.5rem)] min-w-0 flex-col items-start gap-1 rounded-md p-1 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                        >
                          <PlacaChip placa={item.placa} />
                          <span className={cn("block w-full truncate", !endereco && "text-muted-foreground")}>
                            {endereco ?? "sem endereço"}
                          </span>
                          {/* O mesmo poste pode ter várias luminárias na fila: diz qual é esta. */}
                          {noPoste && (
                            <span className="block w-full truncate text-xs text-muted-foreground tabular-nums">{noPoste}</span>
                          )}
                        </button>
                      </th>
                    )
                  }
                  return (
                    <TableCell
                      key={celula.id}
                      className={cn(
                        "px-2.5 py-2.5",
                        meta?.direita && "text-right",
                        meta?.classe,
                        FIXA[celula.column.id] && `${FIXA[celula.column.id]} group-hover:bg-muted`,
                      )}
                    >
                      <tabela.FlexRender cell={celula} />
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
