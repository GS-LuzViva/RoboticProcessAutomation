import type { ReactNode } from "react"
import { Link } from "react-router"
import { MapPin, MessageSquareText } from "lucide-react"

import { LuxMeter } from "@/components/luzviva/LuxMeter"
import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { SituacaoBadge } from "@/components/luzviva/SituacaoBadge"
import { StatusChamadoBadge } from "@/components/luzviva/StatusChamadoBadge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatarConfianca, formatarDataHora, formatarEndereco, formatarNumero, nomeArea, plural } from "@/lib/formatar"
import type { ItemFila } from "@/lib/tipos"

import { confiancaVisao, decomporPrioridade } from "./regras"

export interface DetalheLuminariaProps {
  item: ItemFila | null
  aberto: boolean
  aoMudarAberto: (aberto: boolean) => void
  /** Quando a fila foi gerada pelo processamento diário (para explicar diferença de soma). */
  geradoEm?: string
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] items-center gap-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

function Prioridade({ item, geradoEm }: { item: ItemFila; geradoEm?: string }) {
  const { parcelas, total, confere } = decomporPrioridade(item)
  return (
    <section aria-labelledby="detalhe-prioridade" className="flex flex-col gap-3 rounded-xl border p-4">
      <h3 id="detalhe-prioridade" className="font-semibold">
        Prioridade {formatarNumero(item.prioridade, 0)} de 100
      </h3>
      <p className="text-sm text-muted-foreground">
        Quanto maior, mais cedo a equipe deve ir ao poste. A conta soma três parcelas, até 100:
      </p>
      <ul className="flex flex-col divide-y text-sm">
        {parcelas.map((parcela) => (
          <li key={parcela.detalhe} className="flex items-start justify-between gap-4 py-2">
            <span className="flex min-w-0 flex-col">
              <span>{parcela.rotulo}</span>
              <span className="text-xs text-muted-foreground">{parcela.detalhe}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">+{parcela.pontos}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-4 py-2 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{total}</span>
        </li>
      </ul>
      {!confere && (
        <p className="text-xs text-muted-foreground">
          A fila usa a prioridade calculada no processamento diário dos dados
          {geradoEm ? ` em ${formatarDataHora(geradoEm)}` : ""}; os dados mudaram depois disso.
        </p>
      )}
    </section>
  )
}

/** Painel lateral com os detalhes de uma luminária da fila e as ações "Ver no mapa" e "Perguntar ao assistente". */
export function DetalheLuminaria({ item, aberto, aoMudarAberto, geradoEm }: DetalheLuminariaProps) {
  const endereco = item ? formatarEndereco(item.endereco) : null
  const confianca = item ? confiancaVisao(item) : null
  const parametrosMapa = item
    ? new URLSearchParams({ area: item.subprefeitura, ...(item.placa ? { placa: item.placa } : {}) }).toString()
    : ""

  return (
    <Sheet open={aberto} onOpenChange={aoMudarAberto}>
      <SheetContent
        side="right"
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        onCloseAutoFocus={(evento) => {
          // Aberto sem SheetTrigger: devolve o foco ao botão da luminária na tabela ou na lista.
          const origem = item && document.querySelector<HTMLElement>(`[data-luminaria="${item.id_luminaria}"]`)
          if (origem) {
            evento.preventDefault()
            origem.focus()
          }
        }}
      >
        {item && (
          <>
            <SheetHeader className="gap-3 border-b p-4 pr-14 md:p-6 md:pr-14">
              <PlacaChip placa={item.placa} size="lg" className="self-start" />
              <div className="flex flex-col gap-1">
                <SheetTitle className="text-lg leading-tight font-bold">
                  {endereco ?? "Luminária sem endereço no cadastro"}
                </SheetTitle>
                <SheetDescription>
                  {nomeArea(item.subprefeitura)}, luminária {item.id_luminaria}
                </SheetDescription>
              </div>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
              <dl className="flex flex-col divide-y">
                <Linha rotulo="Situação">
                  <SituacaoBadge situacao={item.situacao} />
                </Linha>
                <Linha rotulo="Iluminação">
                  <LuxMeter lux={item.ultimo_lux} />
                </Linha>
                <Linha rotulo="Última medição">
                  <span className="tabular-nums">
                    {item.ultima_medicao ? formatarDataHora(item.ultima_medicao) : "sem medição do robô"}
                  </span>
                </Linha>
                <Linha rotulo="Relatos">
                  <span className="tabular-nums">
                    {plural(item.ocorrencias_app ?? 0, "relato de cidadão", "relatos de cidadãos", "nenhum relato de cidadão")}
                  </span>
                </Linha>
                <Linha rotulo="Visão">
                  {confianca !== null ? (
                    <span className="tabular-nums">{formatarConfianca(confianca)} de confiança</span>
                  ) : (
                    <span className="text-muted-foreground">sem foto analisada</span>
                  )}
                </Linha>
                <Linha rotulo="Chamado">
                  {item.status_chamado || item.chamado_aberto ? (
                    <span className="flex flex-col items-start gap-1">
                      {item.status_chamado && <StatusChamadoBadge status={item.status_chamado} size="sm" />}
                      {item.chamado_aberto && (
                        <span className="text-xs break-all text-muted-foreground tabular-nums">{item.chamado_aberto}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">sem chamado</span>
                  )}
                </Linha>
              </dl>

              <Prioridade item={item} geradoEm={geradoEm} />
            </div>

            <SheetFooter className="border-t p-4 sm:flex-row md:px-6">
              <Button asChild className="sm:flex-1">
                <Link to={`/?${parametrosMapa}`}>
                  <MapPin aria-hidden="true" />
                  Ver no mapa
                </Link>
              </Button>
              {item.placa && (
                <Button asChild variant="outline" className="sm:flex-1">
                  <Link to={`/assistente?${new URLSearchParams({ placa: item.placa }).toString()}`}>
                    <MessageSquareText aria-hidden="true" />
                    Perguntar ao assistente
                  </Link>
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
