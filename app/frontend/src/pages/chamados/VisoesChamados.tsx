import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { SituacaoBadge } from "@/components/luzviva/SituacaoBadge"
import { AtrasoBadge, StatusChamadoBadge } from "@/components/luzviva/StatusChamadoBadge"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatarData, formatarDataHora, nomeArea, VAZIO } from "@/lib/formatar"
import type { Chamado, StatusChamado } from "@/lib/tipos"

import { AcaoStatus } from "./AcaoStatus"
import { textoDiasRestantes, type ChamadoComPrazo } from "./regras"

export interface VisaoChamadosProps {
  itens: readonly ChamadoComPrazo[]
  legenda: string
  aoPedir: (chamado: Chamado, status: StatusChamado) => void
  /** Id do chamado com PATCH em andamento. */
  atualizandoId: string | null
}

function Prazo({ item, compacto = false }: { item: ChamadoComPrazo; compacto?: boolean }): ReactNode {
  const { prazo, atrasado, diasAtraso, diasRestantes } = item.prazo
  if (!item.emAberto || !prazo) {
    return (
      <span className="text-muted-foreground">
        {VAZIO}
        <span className="sr-only">sem prazo, chamado encerrado</span>
      </span>
    )
  }
  return (
    <span className={cn("flex gap-1", compacto ? "flex-row flex-wrap items-center gap-x-2" : "flex-col items-start")}>
      <span className="tabular-nums">{formatarData(prazo)}</span>
      {atrasado ? (
        <AtrasoBadge diasAtraso={diasAtraso} size="sm" />
      ) : (
        <span className="text-xs text-muted-foreground">{textoDiasRestantes(diasRestantes)}</span>
      )}
    </span>
  )
}

const CABECALHO = "h-11 px-2.5 py-1.5 text-xs leading-tight font-semibold whitespace-normal text-muted-foreground"
/**
 * Coluna fixa à esquerda (chamado e placa). A da ação só fica fixa à direita a partir de 1536 px (2xl):
 * entre 1280 e 1535 px ela cobria o fim de "Situação detectada" enquanto a tabela rolava.
 */
const FIXA_ESQUERDA = "sticky left-0 z-10 bg-card group-hover:bg-muted"
const FIXA_DIREITA = "bg-card group-hover:bg-muted 2xl:sticky 2xl:right-0 2xl:z-10 2xl:shadow-[inset_1px_0_0_var(--border)]"

/** "2026-11-09T13:18:24" → "13:18". */
function hora(iso: string): string {
  return formatarDataHora(iso).split(" ")[1] ?? ""
}

/**
 * Tabela de chamados (>= 1024 px). Rola dentro do próprio contêiner (região com nome, alcançável pelo
 * Tab), com o chamado fixo à esquerda e, a partir de 1536 px, o controle de status fixo à direita.
 */
export function TabelaChamados({ itens, legenda, aoPedir, atualizandoId }: VisaoChamadosProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table className="min-w-[64rem]" rotulo={legenda}>
        <TableCaption className="sr-only">{legenda}, atrasados primeiro e depois por prioridade</TableCaption>
        <TableHeader>
          <TableRow className="group hover:bg-transparent">
            <TableHead scope="col" className={cn(CABECALHO, FIXA_ESQUERDA, "group-hover:bg-card")}>
              Chamado e placa
            </TableHead>
            <TableHead scope="col" className={CABECALHO}>Status</TableHead>
            <TableHead scope="col" className={CABECALHO}>Prazo</TableHead>
            <TableHead scope="col" className={cn(CABECALHO, "text-right")}>Prioridade</TableHead>
            <TableHead scope="col" className={CABECALHO}>Situação detectada</TableHead>
            <TableHead scope="col" className={CABECALHO}>Área e equipe</TableHead>
            <TableHead scope="col" className={CABECALHO}>Aberto em</TableHead>
            <TableHead scope="col" className={cn(CABECALHO, FIXA_DIREITA, "group-hover:bg-card")}>
              Mudar status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((item) => {
            const { chamado } = item
            return (
              <TableRow key={chamado.id_chamado} className="group hover:bg-muted">
                <th scope="row" className={cn(FIXA_ESQUERDA, "px-2.5 py-2 text-left font-normal")}>
                  <span className="flex flex-col items-start gap-1">
                    <span className="font-semibold whitespace-nowrap tabular-nums">{chamado.id_chamado}</span>
                    <PlacaChip placa={chamado.placa} />
                  </span>
                </th>
                <TableCell className="px-2.5">
                  <StatusChamadoBadge status={chamado.status} size="sm" />
                </TableCell>
                <TableCell className="px-2.5">
                  <Prazo item={item} />
                </TableCell>
                <TableCell className="px-2.5 text-right font-semibold tabular-nums">{chamado.prioridade}</TableCell>
                <TableCell className="px-2.5">
                  <SituacaoBadge situacao={chamado.situacao_detectada} size="sm" />
                </TableCell>
                <TableCell className="px-2.5">
                  <span className="flex flex-col">
                    <span>{nomeArea(chamado.area_piloto)}</span>
                    <span className="text-xs text-muted-foreground">{chamado.equipe ?? "sem equipe"}</span>
                  </span>
                </TableCell>
                <TableCell className="px-2.5 tabular-nums">
                  <span className="flex flex-col">
                    <span>{formatarData(chamado.aberto_em)}</span>
                    <span className="text-xs text-muted-foreground">{hora(chamado.aberto_em)}</span>
                  </span>
                </TableCell>
                <TableCell className={cn(FIXA_DIREITA, "px-2.5 py-2")}>
                  <AcaoStatus chamado={chamado} aoPedir={aoPedir} atualizando={atualizandoId === chamado.id_chamado} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

/** Chamados abaixo de 1024 px (celular e tablet): um bloco empilhado por chamado, com o controle de status embaixo. */
export function ListaChamados({ itens, legenda, aoPedir, atualizandoId }: VisaoChamadosProps) {
  return (
    <ul aria-label={legenda} className="divide-y overflow-hidden rounded-xl border bg-card">
      {itens.map((item) => {
        const { chamado } = item
        return (
          <li key={chamado.id_chamado} className="flex flex-col gap-3 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold break-all tabular-nums">{chamado.id_chamado}</h2>
              <StatusChamadoBadge status={chamado.status} size="sm" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PlacaChip placa={chamado.placa} />
              <SituacaoBadge situacao={chamado.situacao_detectada} size="sm" />
              <span className="text-sm text-muted-foreground">{nomeArea(chamado.area_piloto)}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Dado rotulo="Prioridade">
                <span className="font-semibold tabular-nums">{chamado.prioridade}</span>
              </Dado>
              <Dado rotulo="Equipe">{chamado.equipe ?? VAZIO}</Dado>
              <Dado rotulo="Aberto em">
                <span className="tabular-nums">{formatarDataHora(chamado.aberto_em)}</span>
              </Dado>
              <Dado rotulo="Prazo">
                <Prazo item={item} compacto />
              </Dado>
            </dl>
            <AcaoStatus
              chamado={chamado}
              aoPedir={aoPedir}
              atualizando={atualizandoId === chamado.id_chamado}
              empilhado
            />
          </li>
        )
      })}
    </ul>
  )
}
