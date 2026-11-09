import { CircleAlert, LoaderCircle, MessageSquareText, RotateCcw, SearchX } from "lucide-react"

import { PlacaChip } from "@/components/luzviva/PlacaChip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatarConfianca } from "@/lib/formatar"
import type { RespostaAssistente } from "@/lib/tipos"

import { ehIndisponivel, rotuloConfianca, type Turno } from "./conversa"

function Resposta({ resposta }: { resposta: RespostaAssistente }) {
  const fontes = resposta.fontes.filter((fonte) => fonte.titulo || fonte.trecho)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">Assistente</span>
        {resposta.recusou && (
          <Badge variant="outline" className="h-6 gap-1 border-insuficiente/40 bg-insuficiente-fundo text-insuficiente">
            <SearchX aria-hidden="true" />
            Não consta na base
          </Badge>
        )}
        <span className="text-muted-foreground">
          Confiança {rotuloConfianca(resposta.confianca)}{" "}
          <span className="tabular-nums">({formatarConfianca(resposta.confianca)})</span>
        </span>
      </div>

      {/* Texto puro: o React escapa tudo; quebras de linha da resposta são mantidas. */}
      <p className="max-w-[75ch] whitespace-pre-line">{resposta.resposta}</p>

      {fontes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Fontes</h2>
          <ol className="flex flex-col gap-2">
            {fontes.map((fonte, indice) => (
              <li key={indice} className="flex flex-col gap-1 rounded-lg border bg-background px-3 py-2 text-sm">
                <span className="font-semibold">{fonte.titulo || "Fonte sem título"}</span>
                {fonte.trecho && (
                  <blockquote className="border-l-2 border-primary/50 pl-3 text-muted-foreground">
                    “{fonte.trecho}”
                  </blockquote>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        !resposta.recusou && <p className="text-sm text-muted-foreground">Nenhuma fonte citada nesta resposta.</p>
      )}
    </div>
  )
}

interface TurnoConversaProps {
  turno: Turno
  aoTentarDeNovo: (turno: Turno) => void
  ocupado: boolean
}

/** Um par pergunta e resposta da conversa. */
export function TurnoConversa({ turno, aoTentarDeNovo, ocupado }: TurnoConversaProps) {
  const { resposta } = turno
  return (
    <li className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 self-start rounded-lg bg-muted px-3 py-2.5 sm:max-w-[85%]">
        <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Você perguntou
          {turno.placa && <PlacaChip placa={turno.placa} />}
        </span>
        <p className="whitespace-pre-line">{turno.pergunta}</p>
      </div>

      {!resposta ? (
        <div aria-busy="true" className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Consultando a base de manutenção…
          </span>
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : ehIndisponivel(resposta) ? (
        // Sem role="alert": quem anuncia a resposta é a região ao vivo da página (uma vez só).
        <Alert role={undefined} className="border-insuficiente/40 p-4">
          <CircleAlert aria-hidden="true" className="text-insuficiente" />
          <AlertTitle>Assistente indisponível no momento</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <p>
              O serviço de respostas não respondeu agora. O mapa, a fila e os chamados continuam funcionando. Tente de
              novo em instantes.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={ocupado}
              onClick={() => aoTentarDeNovo(turno)}
              // O AlertDescription pinta o texto de muted; o botão volta à cor normal para não parecer desabilitado.
              className="text-foreground max-sm:w-full"
            >
              <RotateCcw aria-hidden="true" />
              Perguntar de novo
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="flex gap-3 rounded-xl border bg-card p-4">
          <MessageSquareText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary max-sm:hidden" />
          <div className="min-w-0 flex-1">
            <Resposta resposta={resposta} />
          </div>
        </div>
      )}
    </li>
  )
}
