import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { MessageSquareText, UserCheck } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { useFila, usePerguntar } from "@/hooks/use-api"
import { normalizarPlaca, placaValida } from "@/lib/dominio"

import { ehIndisponivel, montarSugestoes, type Sugestao, type Turno } from "./assistente/conversa"
import { FormularioPergunta } from "./assistente/FormularioPergunta"
import { Sugestoes } from "./assistente/Sugestoes"
import { TurnoConversa } from "./assistente/TurnoConversa"

/**
 * Assistente da fila (`#/assistente`): conversa só em memória, resposta sempre com as fontes e
 * "Não consta na base" quando a base não cobre. `?placa=IP0723371` (vindo da Fila) já preenche a placa.
 */
export default function Assistente() {
  const [busca] = useSearchParams()
  const placaUrl = normalizarPlaca(busca.get("placa") ?? "")

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [pergunta, setPergunta] = useState("")
  const [placa, setPlaca] = useState(placaValida(placaUrl) ? placaUrl : "")
  const [anuncio, setAnuncio] = useState("")

  const perguntar = usePerguntar()
  const fila = useFila()
  const sugestoes = useMemo(() => montarSugestoes(fila.data?.dados), [fila.data])

  const proximoId = useRef(1)
  const refPergunta = useRef<HTMLTextAreaElement>(null)
  const refFim = useRef<HTMLDivElement>(null)
  const ocupado = perguntar.isPending

  // A pergunta nova aparece embaixo: rola até ela (sem animação para quem pediu menos movimento).
  const totalTurnos = turnos.length
  useEffect(() => {
    if (totalTurnos === 0) return
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    refFim.current?.scrollIntoView({ block: "nearest", behavior: reduzir ? "auto" : "smooth" })
  }, [totalTurnos])

  const responder = async (turno: Turno) => {
    setAnuncio("Consultando o assistente…")
    // usePerguntar nunca rejeita: qualquer falha vira a resposta "Assistente indisponível no momento".
    const resposta = await perguntar.mutateAsync({ pergunta: turno.pergunta, placa: turno.placa })
    setTurnos((atuais) => atuais.map((t) => (t.id === turno.id ? { ...t, resposta } : t)))
    setAnuncio(
      ehIndisponivel(resposta)
        ? "Assistente indisponível no momento. O mapa, a fila e os chamados continuam funcionando."
        : `Resposta do assistente: ${resposta.resposta}${resposta.recusou ? " Não consta na base." : ""}`,
    )
  }

  const enviar = (texto: string, placaPergunta?: string) => {
    const turno: Turno = { id: proximoId.current++, pergunta: texto, placa: placaPergunta }
    setTurnos((atuais) => [...atuais, turno])
    setPergunta("")
    void responder(turno)
  }

  const tentarDeNovo = (turno: Turno) => {
    setTurnos((atuais) => atuais.map((t) => (t.id === turno.id ? { ...t, resposta: undefined } : t)))
    void responder(turno)
  }

  const escolherSugestao = (sugestao: Sugestao) => {
    if (ocupado) return
    setPergunta(sugestao.texto)
    // A sugestão leva a própria placa (ou nenhuma: "Quem é responsável pela área…" não é de um poste).
    enviar(sugestao.texto, sugestao.placa)
  }

  return (
    <>
      <PageHeader
        titulo="Assistente da fila"
        descricao="Responde sobre a manutenção: por que uma luminária está na fila, o prazo de reparo e quem é o responsável. Cita sempre a fonte e diz quando a informação não consta na base."
      />

      <div className="flex max-w-3xl flex-col gap-4">
        <section aria-label="Conversa com o assistente" className="flex flex-col gap-4">
          {turnos.length === 0 ? (
            <div className="flex flex-col gap-4 rounded-xl border border-dashed bg-card p-4 md:p-6">
              <div className="flex items-start gap-3">
                <MessageSquareText aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">Pergunte sobre uma luminária da fila</p>
                  <p className="max-w-prose text-sm text-muted-foreground">
                    Escreva a pergunta abaixo ou comece por uma destas, montadas com as placas do topo da fila de hoje.
                  </p>
                </div>
              </div>
              <Sugestoes
                titulo="Sugestões de pergunta"
                sugestoes={sugestoes}
                aoEscolher={escolherSugestao}
                desabilitado={ocupado}
              />
            </div>
          ) : (
            <ol className="flex flex-col gap-6">
              {turnos.map((turno) => (
                <TurnoConversa key={turno.id} turno={turno} aoTentarDeNovo={tentarDeNovo} ocupado={ocupado} />
              ))}
            </ol>
          )}
          <div ref={refFim} />
        </section>

        {/* Anúncio único por resposta, para o leitor de tela não reler a conversa inteira. */}
        <div aria-live="polite" className="sr-only">
          {anuncio}
        </div>

        {turnos.length > 0 && (
          <Sugestoes titulo="Outras perguntas" sugestoes={sugestoes} aoEscolher={escolherSugestao} desabilitado={ocupado} />
        )}

        <FormularioPergunta
          pergunta={pergunta}
          aoMudarPergunta={setPergunta}
          placa={placa}
          aoMudarPlaca={setPlaca}
          aoEnviar={enviar}
          ocupado={ocupado}
          refPergunta={refPergunta}
        />

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserCheck aria-hidden="true" className="size-4 shrink-0" />A decisão final é do gestor.
        </p>
      </div>
    </>
  )
}
