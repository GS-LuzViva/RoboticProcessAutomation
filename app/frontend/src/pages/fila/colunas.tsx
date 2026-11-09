import { createColumnHelper, createSortedRowModel, metaHelper, rowSortingFeature, tableFeatures } from "@tanstack/react-table"

import { LuxMeter } from "@/components/luzviva/LuxMeter"
import { PrioridadeBar } from "@/components/luzviva/PrioridadeBar"
import { SituacaoBadge } from "@/components/luzviva/SituacaoBadge"
import { StatusChamadoBadge } from "@/components/luzviva/StatusChamadoBadge"
import { formatarConfianca, formatarLux, formatarNumero } from "@/lib/formatar"
import type { ItemFila } from "@/lib/tipos"

import { confiancaVisao } from "./regras"

export interface MetaColuna {
  /** Números à direita (DESIGN.md). */
  direita?: boolean
  /** Classes extras do th e do td. */
  classe?: string
}

export const recursosFila = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnMeta: metaHelper<MetaColuna>(),
})

const coluna = createColumnHelper<typeof recursosFila, ItemFila>()

/** Valor numérico para ordenar; ausente vai para o fim nos dois sentidos. */
const numeroOuAusente = (valor: number | null | undefined) => (typeof valor === "number" ? valor : undefined)

/** Colunas da fila. Placa e endereço são renderizados à parte (cabeçalho de linha com o botão de detalhes). */
export const colunasFila = coluna.columns([
  coluna.accessor("prioridade", {
    header: "Prioridade",
    sortDescFirst: true,
    meta: { direita: true },
    cell: (contexto) => <PrioridadeBar valor={contexto.getValue()} />,
  }),
  coluna.accessor("placa", {
    header: "Placa e endereço",
    enableSorting: false,
  }),
  coluna.accessor("situacao", {
    header: "Situação",
    enableSorting: false,
    cell: (contexto) => <SituacaoBadge situacao={contexto.getValue()} size="sm" />,
  }),
  coluna.accessor((item) => numeroOuAusente(item.ultimo_lux), {
    id: "lux",
    header: "Lux",
    sortDescFirst: false,
    sortUndefined: "last",
    meta: { direita: true },
    cell: (contexto) => {
      const lux = contexto.row.original.ultimo_lux
      if (typeof lux !== "number") return <span className="text-muted-foreground">sem medição</span>
      // Barra e valor em colunas fixas, para as barras ficarem alinhadas entre as linhas.
      return (
        <span className="inline-flex items-center justify-end gap-2">
          <LuxMeter lux={lux} semValor />
          <span className="w-14 text-right whitespace-nowrap tabular-nums">{formatarLux(lux)}</span>
        </span>
      )
    },
  }),
  coluna.accessor("ocorrencias_app", {
    header: "Relatos",
    sortDescFirst: true,
    meta: { direita: true },
    cell: (contexto) => <span className="tabular-nums">{formatarNumero(contexto.getValue() ?? 0, 0)}</span>,
  }),
  coluna.accessor((item) => confiancaVisao(item), {
    id: "visao",
    header: "Visão",
    enableSorting: false,
    meta: { direita: true },
    cell: (contexto) => {
      const confianca = contexto.getValue()
      return typeof confianca === "number" ? (
        <span className="tabular-nums">{formatarConfianca(confianca)}</span>
      ) : (
        <span className="text-muted-foreground">sem foto</span>
      )
    },
  }),
  coluna.accessor("chamado_aberto", {
    header: "Chamado",
    enableSorting: false,
    cell: (contexto) => {
      const item = contexto.row.original
      if (!item.status_chamado && !item.chamado_aberto) {
        return <span className="text-muted-foreground">sem chamado</span>
      }
      return (
        <span className="flex flex-col items-start gap-0.5">
          {item.status_chamado && <StatusChamadoBadge status={item.status_chamado} size="sm" />}
          {item.chamado_aberto && (
            <span className="text-xs text-muted-foreground tabular-nums">{item.chamado_aberto}</span>
          )}
        </span>
      )
    },
  }),
])
